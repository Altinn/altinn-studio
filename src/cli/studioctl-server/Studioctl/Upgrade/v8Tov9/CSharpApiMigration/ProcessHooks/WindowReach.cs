using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Operations;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;

/// <summary>What kind of v8 code an entry of the process transition is.</summary>
internal enum WindowEntryKind
{
    /// <summary>A task or process-end hook the port moves to a v9 handler.</summary>
    Hook,

    /// <summary>A custom <c>IProcessTask</c>'s <c>Start</c>, <c>End</c> or <c>Abandon</c>.</summary>
    ProcessTask,

    /// <summary><c>IInstantiationProcessor.DataCreation</c>, moved to the overload that gets the mutator.</summary>
    DataCreation,

    /// <summary>A v8 <c>IServiceTask.Execute</c>, whose context already has the mutator.</summary>
    ServiceTask,
}

/// <summary>
/// A method v9 runs with an instance data mutator, from which the rewrite follows the app's calls to Storage.
/// </summary>
/// <param name="Instance">The v8 parameter that holds the instance, for the kinds that have one.</param>
/// <param name="Context">The service task's context parameter.</param>
/// <param name="InCallback">
/// Whether v9 runs it in the workflow engine's callback, where the caller's identity is not the user's: hooks and
/// service tasks always, <c>DataCreation</c> only when a data type is created when its task starts.
/// </param>
/// <param name="Hook">The hook, for the kinds the hook port moves.</param>
internal sealed record WindowEntry(
    WindowEntryKind Kind,
    IMethodSymbol Method,
    MethodDeclarationSyntax Declaration,
    ScannedCSharpFile File,
    IParameterSymbol? Instance,
    IParameterSymbol? Context,
    bool InCallback,
    HookImplementation? Hook
)
{
    /// <summary>The entry as reports name it, such as <c>ProcessTaskEnd.End</c>.</summary>
    public string Name => $"{Method.ContainingType.Name}.{Method.Name}";
}

/// <summary>A place where app code calls, creates or refers to a method of the app.</summary>
/// <param name="Operation">The invocation, object creation, method reference or property reference.</param>
/// <param name="Callee">The method in the app that can run: the target itself, or an implementation or override.</param>
internal sealed record CallSite(IMethodSymbol Caller, IOperation Operation, IMethodSymbol Callee)
{
    /// <summary>Whether the method is referred to as a delegate rather than called.</summary>
    public bool IsDelegate => Operation is IMethodReferenceOperation;
}

/// <summary>The code of one member of the app, with the file it is in.</summary>
internal sealed record MemberBody(
    IMethodSymbol Method,
    ScannedCSharpFile File,
    SyntaxNode Declaration,
    IOperation Operation
);

/// <summary>How a method is reached from the entries.</summary>
/// <param name="Via">The call that first reached it; <c>null</c> for an entry.</param>
/// <param name="ThroughDelegate">Whether every way to it found goes through a delegate.</param>
internal sealed record ReachedMethod(
    IMethodSymbol Method,
    WindowEntry Entry,
    int Depth,
    CallSite? Via,
    bool ThroughDelegate
);

/// <summary>
/// The app's call graph: which of its methods call, create or refer to which others, with interface and virtual
/// calls resolved to the app's implementations, and which methods the process transition's entries reach through it,
/// at most <see cref="MaxDepth"/> calls away. Code in packages is not followed.
/// </summary>
internal sealed class WindowReach
{
    /// <summary>The deepest call followed; the fleet's deepest chain to a Storage call is 13 (a flow framework).</summary>
    public const int MaxDepth = 12;

    private readonly Compilation _compilation;
    private readonly Dictionary<IMethodSymbol, MemberBody> _bodies = new(SymbolEqualityComparer.Default);
    private readonly Dictionary<IMethodSymbol, List<CallSite>> _callers = new(SymbolEqualityComparer.Default);
    private readonly Dictionary<IMethodSymbol, List<CallSite>> _calls = new(SymbolEqualityComparer.Default);
    private readonly List<INamedTypeSymbol> _sourceTypes;

    public WindowReach(Compilation compilation, IReadOnlyList<ScannedCSharpFile> files)
    {
        _compilation = compilation;
        _sourceTypes = [.. SourceTypes(compilation.Assembly.GlobalNamespace)];
        foreach (var file in files)
        {
            if (file.SemanticModel is not { } model)
            {
                continue;
            }

            foreach (var (declaration, body) in Members(file.Root))
            {
                if (Symbol(model, declaration) is not { } method || model.GetOperation(body) is not { } operation)
                {
                    continue;
                }

                method = method.OriginalDefinition;
                if (_bodies.ContainsKey(method))
                {
                    continue;
                }

                _bodies[method] = new MemberBody(method, file, declaration, operation);
                foreach (var descendant in operation.DescendantsAndSelf())
                {
                    if (Target(descendant) is not { } target)
                    {
                        continue;
                    }

                    foreach (var callee in SourceImplementations(target))
                    {
                        var site = new CallSite(method, descendant, callee);
                        Add(_calls, method, site);
                        Add(_callers, callee, site);
                    }
                }
            }
        }
    }

    public Compilation Compilation => _compilation;

    public MemberBody? Body(IMethodSymbol method) => _bodies.GetValueOrDefault(method.OriginalDefinition);

    /// <summary>The code of every member of the app.</summary>
    public IEnumerable<MemberBody> Bodies => _bodies.Values;

    /// <summary>Every place in the app that can run <paramref name="method"/>.</summary>
    public IReadOnlyList<CallSite> CallersOf(IMethodSymbol method) =>
        _callers.GetValueOrDefault(method.OriginalDefinition) ?? [];

    /// <summary>The app methods <paramref name="method"/> calls, creates or refers to.</summary>
    public IReadOnlyList<CallSite> CallsFrom(IMethodSymbol method) =>
        _calls.GetValueOrDefault(method.OriginalDefinition) ?? [];

    /// <summary>
    /// The methods each entry reaches, the entry included, each with the shortest way to it; a method more than
    /// <see cref="MaxDepth"/> calls away is not reached, and <paramref name="tooDeep"/> gets the calls not followed.
    /// </summary>
    public IReadOnlyList<ReachedMethod> Reach(WindowEntry entry, List<CallSite> tooDeep)
    {
        var reached = new Dictionary<IMethodSymbol, ReachedMethod>(SymbolEqualityComparer.Default);
        var start = new ReachedMethod(entry.Method.OriginalDefinition, entry, 0, null, false);
        reached[start.Method] = start;
        var pending = new Queue<ReachedMethod>([start]);
        while (pending.TryDequeue(out var current))
        {
            foreach (var call in CallsFrom(current.Method))
            {
                var throughDelegate = current.ThroughDelegate || call.IsDelegate;
                if (reached.TryGetValue(call.Callee, out var known))
                {
                    if (known.ThroughDelegate && !throughDelegate)
                    {
                        reached[call.Callee] = known with { ThroughDelegate = false };
                    }

                    continue;
                }

                if (current.Depth >= MaxDepth)
                {
                    tooDeep.Add(call);
                    continue;
                }

                var next = new ReachedMethod(call.Callee, entry, current.Depth + 1, call, throughDelegate);
                reached[call.Callee] = next;
                pending.Enqueue(next);
            }
        }

        return [.. reached.Values];
    }

    /// <summary>The Storage client calls in <paramref name="method"/>'s own code, lambdas and local functions included.</summary>
    public IEnumerable<StorageClientCall> StorageCalls(IMethodSymbol method) =>
        Body(method) is { } body
            ? body
                .Operation.DescendantsAndSelf()
                .OfType<IInvocationOperation>()
                .Select(StorageClientCall.From)
                .OfType<StorageClientCall>()
            : [];

    /// <summary>The app's types that implement <paramref name="contract"/> or derive from it.</summary>
    public IEnumerable<INamedTypeSymbol> SourceTypesOf(ITypeSymbol contract) =>
        _sourceTypes.Where(type =>
            SymbolEqualityComparer.Default.Equals(type, contract.OriginalDefinition)
            || type.AllInterfaces.Any(i =>
                SymbolEqualityComparer.Default.Equals(i.OriginalDefinition, contract.OriginalDefinition)
            )
            || BaseTypes(type)
                .Any(b => SymbolEqualityComparer.Default.Equals(b.OriginalDefinition, contract.OriginalDefinition))
        );

    private static IEnumerable<INamedTypeSymbol> BaseTypes(INamedTypeSymbol type)
    {
        for (var current = type.BaseType; current is not null; current = current.BaseType)
        {
            yield return current;
        }
    }

    private static void Add(Dictionary<IMethodSymbol, List<CallSite>> index, IMethodSymbol key, CallSite site)
    {
        if (!index.TryGetValue(key, out var sites))
        {
            index[key] = sites = [];
        }

        sites.Add(site);
    }

    /// <summary>The members of a file that have code, with the node whose operation is that code.</summary>
    private static IEnumerable<(SyntaxNode Declaration, SyntaxNode Body)> Members(CompilationUnitSyntax root)
    {
        foreach (var node in root.DescendantNodes())
        {
            switch (node)
            {
                case BaseMethodDeclarationSyntax method
                    when method.Body is not null || method.ExpressionBody is not null:
                    yield return (method, method);
                    break;
                case AccessorDeclarationSyntax accessor
                    when accessor.Body is not null || accessor.ExpressionBody is not null:
                    yield return (accessor, accessor);
                    break;
                case PropertyDeclarationSyntax { ExpressionBody: { } arrow } property:
                    yield return (property, arrow);
                    break;
            }
        }
    }

    private static IMethodSymbol? Symbol(SemanticModel model, SyntaxNode declaration) =>
        model.GetDeclaredSymbol(declaration) switch
        {
            IMethodSymbol method => method,
            IPropertySymbol property => property.GetMethod,
            _ => null,
        };

    private static IMethodSymbol? Target(IOperation operation) =>
        operation switch
        {
            IInvocationOperation invocation => invocation.TargetMethod,
            IObjectCreationOperation creation => creation.Constructor,
            IMethodReferenceOperation reference => reference.Method,
            IPropertyReferenceOperation property => property.Property.GetMethod ?? property.Property.SetMethod,
            _ => null,
        };

    /// <summary>
    /// The methods in the app that a call to <paramref name="target"/> can run: the method itself, and for an
    /// abstract, virtual or interface member every implementation or override the app declares.
    /// </summary>
    private IEnumerable<IMethodSymbol> SourceImplementations(IMethodSymbol target)
    {
        var method = (target.ReducedFrom ?? target).OriginalDefinition;
        if (IsInSource(method))
        {
            yield return method;
        }

        if (method.ContainingType.TypeKind == TypeKind.Interface)
        {
            foreach (var type in _sourceTypes)
            {
                if (
                    type.AllInterfaces.Any(contract =>
                        SymbolEqualityComparer.Default.Equals(contract.OriginalDefinition, method.ContainingType)
                    )
                    && type.FindImplementationForInterfaceMember(ConstructedMember(method, type))
                        is IMethodSymbol implementation
                    && IsInSource(implementation)
                    && !SymbolEqualityComparer.Default.Equals(implementation.OriginalDefinition, method)
                )
                {
                    yield return implementation.OriginalDefinition;
                }
            }
        }
        else if (method.IsAbstract || method.IsVirtual || method.IsOverride)
        {
            foreach (var type in _sourceTypes)
            {
                foreach (var candidate in type.GetMembers(method.Name).OfType<IMethodSymbol>())
                {
                    if (Overrides(candidate, method) && IsInSource(candidate))
                    {
                        yield return candidate.OriginalDefinition;
                    }
                }
            }
        }
    }

    private static IMethodSymbol ConstructedMember(IMethodSymbol member, INamedTypeSymbol type) =>
        type.AllInterfaces.Where(contract =>
                SymbolEqualityComparer.Default.Equals(contract.OriginalDefinition, member.ContainingType)
            )
            .SelectMany(contract => contract.GetMembers(member.Name).OfType<IMethodSymbol>())
            .FirstOrDefault(candidate => SymbolEqualityComparer.Default.Equals(candidate.OriginalDefinition, member))
        ?? member;

    private static bool Overrides(IMethodSymbol candidate, IMethodSymbol method)
    {
        for (
            var overridden = candidate.OverriddenMethod;
            overridden is not null;
            overridden = overridden.OverriddenMethod
        )
        {
            if (SymbolEqualityComparer.Default.Equals(overridden.OriginalDefinition, method))
            {
                return true;
            }
        }

        return false;
    }

    private bool IsInSource(IMethodSymbol method) =>
        method.DeclaringSyntaxReferences.Any(reference => _compilation.SyntaxTrees.Contains(reference.SyntaxTree));

    private static IEnumerable<INamedTypeSymbol> SourceTypes(INamespaceSymbol ns)
    {
        foreach (var type in ns.GetTypeMembers())
        {
            foreach (var nested in WithNested(type))
            {
                yield return nested;
            }
        }

        foreach (var child in ns.GetNamespaceMembers())
        {
            foreach (var type in SourceTypes(child))
            {
                yield return type;
            }
        }

        static IEnumerable<INamedTypeSymbol> WithNested(INamedTypeSymbol type) =>
            type.GetTypeMembers().SelectMany(WithNested).Prepend(type);
    }
}
