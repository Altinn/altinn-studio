using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;

/// <summary>
/// A class v8 ran for a hook family: an app class with its registrations, or a package's class that the app or the
/// package registers. <see cref="Anchor"/> is the call that registers it first, which gives its place in v8's order.
/// </summary>
internal sealed record Handler(
    ITypeSymbol Type,
    HookCandidate? Candidate,
    TaskIds Tasks,
    IReadOnlyList<HookRegistration> Registrations,
    ScannedCSharpFile File,
    InvocationExpressionSyntax Anchor
)
{
    public bool IsPackage => Candidate is null;
}

/// <summary>Handlers v9 would refuse side by side, combined into one generated class.</summary>
/// <param name="Members">The app's classes, in the order v8 ran them.</param>
internal sealed record MergeGroup(HookFamily Family, IReadOnlyList<Handler> Members, string CompositeName, string Path);

/// <summary>What the merge decided for one hook family.</summary>
/// <param name="Held">
/// Classes the port could move but leaves as they are, because a class that runs at the same task is blocked: moved
/// alone, the two would be two handlers for one task.
/// </param>
/// <param name="Duplicates">Registrations of a class that is registered already, which v9 would count twice.</param>
internal sealed record MergePlan(
    IReadOnlyList<Handler> Handlers,
    IReadOnlySet<HookCandidate> Held,
    IReadOnlyList<MergeGroup> Groups,
    IReadOnlyList<HookRegistration> Duplicates,
    IReadOnlyList<PortReport> Reports
);

/// <summary>
/// v8 ran every registered handler at every task, in registration order; v9 starts only when at most one
/// handler of a family runs for each task of the process (and at most one <c>IOnProcessEndedHandler</c> is registered).
/// Handlers whose tasks overlap are combined into one generated class that runs them in v8's order and stops at the
/// first failure; the classes keep their methods and are registered as themselves.
/// </summary>
internal static class HandlerMerge
{
    private const string ServiceCollection = "Microsoft.Extensions.DependencyInjection.IServiceCollection";

    /// <summary>Plans the merges of one family's handlers.</summary>
    public static MergePlan Plan(
        HookFamily family,
        IReadOnlyList<HookCandidate> candidates,
        IReadOnlyList<HookRegistration> registrations,
        IReadOnlyList<ScannedCSharpFile> files,
        Compilation compilation,
        ProcessHookPortContext context
    )
    {
        var handlers = Handlers(family, candidates, registrations, files, compilation);
        var held = new HashSet<HookCandidate>();
        var groups = new List<MergeGroup>();
        var reports = new List<PortReport>();
        var takenNames = new HashSet<string>(StringComparer.Ordinal);

        foreach (var group in OverlappingGroups(handlers, context.BpmnTaskIds))
        {
            var apps = group.Where(static handler => !handler.IsPackage).ToList();
            if (group.FirstOrDefault(static handler => handler.IsPackage) is { } package)
            {
                reports.Add(PackageTodo(family, group, package, apps, context));
                continue;
            }

            if (apps.Any(static handler => handler.Candidate is not { IsPortable: true }))
            {
                held.UnionWith(
                    apps.Select(static handler => handler.Candidate)
                        .OfType<HookCandidate>()
                        .Where(static c => c.IsPortable)
                );
                continue;
            }

            if (!CanCombine(group))
            {
                reports.Add(OrderTodo(family, group, context));
                continue;
            }

            var mergeGroup = Group(family, group, compilation, files, takenNames);
            groups.Add(mergeGroup);
            reports.Add(MergedWarning(mergeGroup, context));
        }

        var duplicates = handlers
            .Where(handler => handler.Candidate is { IsPortable: true } candidate && !held.Contains(candidate))
            .SelectMany(static handler => handler.Registrations.Skip(1))
            .ToList();
        return new MergePlan(handlers, held, groups, duplicates, reports);
    }

    /// <summary>
    /// The generated class's file: a constructor that takes the classes, <c>ShouldRunForTask</c> that is true when one
    /// of theirs is, and <c>Execute</c> that runs each that applies in order and returns the first failure.
    /// </summary>
    public static CompilationUnitSyntax CompositeFile(MergeGroup group, string lineEnding)
    {
        var family = group.Family;
        var first = group.Members[0];
        var firstHook = first.Candidate?.Hook ?? throw new InvalidOperationException("Only app classes are merged.");
        var ns = first.Type.ContainingNamespace;
        var names = ParameterNames(group.Members);
        var task = firstHook.Declaration?.ReturnType is QualifiedNameSyntax qualified ? qualified.ToString() : "Task";
        var handlerResult = "global::" + HookFamily.HandlerResult;
        var failedHandlerResult = "global::" + HookFamily.FailedHandlerResult;
        var lines = new List<string>();
        if (task == "Task")
        {
            lines.AddRange(["using System.Threading.Tasks;", ""]);
        }

        var fileScoped = firstHook.File.Root.Members.OfType<FileScopedNamespaceDeclarationSyntax>().Any();
        var indent = "";
        if (!ns.IsGlobalNamespace)
        {
            if (fileScoped)
            {
                lines.AddRange([$"namespace {ns.ToDisplayString()};", ""]);
            }
            else
            {
                lines.AddRange([$"namespace {ns.ToDisplayString()}", "{"]);
                indent = "    ";
            }
        }

        var parameters = string.Join(
            ", ",
            group.Members.Select((member, i) => $"{TypeName(member.Type, ns)} {names[i]}")
        );
        lines.Add($"{indent}internal sealed class {group.CompositeName}({parameters})");
        lines.Add($"{indent}    : global::{family.V9Interface}");
        lines.Add($"{indent}{{");
        var context = "context";
        if (family.FiltersTasks)
        {
            lines.Add($"{indent}    public bool ShouldRunForTask(string taskId) =>");
            lines.Add(
                $"{indent}        {string.Join(" || ", names.Select(static name => $"{name}.ShouldRunForTask(taskId)"))};"
            );
            lines.Add("");
        }

        lines.Add(
            $"{indent}    public async {task}<{handlerResult}> {family.V9Member}(global::{family.Context} {context})"
        );
        lines.Add($"{indent}    {{");
        lines.Add($"{indent}        // Registration order of the v8 handlers, which v8 ran one after the other.");
        for (var i = 0; i < names.Count; i++)
        {
            var failed = i == 0 ? "failed" : $"failed{i + 1}";
            var applies = family.FiltersTasks ? $"{names[i]}.ShouldRunForTask({context}.TaskId) && " : "";
            lines.Add(
                $"{indent}        if ({applies}await {names[i]}.{family.V9Member}({context}) is {failedHandlerResult} {failed})"
            );
            lines.Add($"{indent}        {{");
            lines.Add($"{indent}            return {failed};");
            lines.Add($"{indent}        }}");
        }

        lines.Add($"{indent}        return {handlerResult}.Success();");
        lines.Add($"{indent}    }}");
        lines.Add($"{indent}}}");
        if (!ns.IsGlobalNamespace && !fileScoped)
        {
            lines.Add("}");
        }

        var root = SyntaxFactory.ParseCompilationUnit(string.Join(lineEnding, lines) + lineEnding);
        var references = new[]
        {
            family.V9Interface,
            family.Context,
            HookFamily.HandlerResult,
            HookFamily.FailedHandlerResult,
        };
        return root.ReplaceNodes(
            root.DescendantNodes()
                .Where(node =>
                    node is QualifiedNameSyntax or MemberAccessExpressionSyntax
                    && references.Any(reference => node.ToString() == "global::" + reference)
                ),
            static (original, _) =>
                GeneratedTypeReferenceFinalizer
                    .Reference(original.ToString()["global::".Length..])
                    .WithTriviaFrom(original)
        );
    }

    /// <summary>Lifetimes of the registration methods, shortest first.</summary>
    private static readonly string[] _lifetimes = ["Transient", "Scoped", "Singleton"];

    /// <summary>
    /// The registration of the generated class, as the first member was registered but with the shortest lifetime of
    /// the members: <c>services.AddTransient&lt;IOnTaskEndingHandler, TaskEndingHandlers&gt;();</c>. A longer lifetime
    /// would capture a member whose registration is shorter, such as a scoped member in a singleton.
    /// </summary>
    public static StatementSyntax CompositeRegistration(MergeGroup group, HookRegistration last, string lineEnding)
    {
        var names = group
            .Members.Select(static member =>
                member.Registrations[0].TwoTypeArgumentsName
                ?? throw new InvalidOperationException("Merged classes are registered with two type arguments.")
            )
            .ToList();
        var name = names[0];
        var lifetime = names.Min(static method =>
            Array.FindIndex(
                _lifetimes,
                lifetime => method.Identifier.ValueText.EndsWith(lifetime, StringComparison.Ordinal)
            )
        );
        var registrationMethod =
            (name.Identifier.ValueText.StartsWith("TryAdd", StringComparison.Ordinal) ? "TryAdd" : "Add")
            + _lifetimes[lifetime];
        var implementation = name.TypeArgumentList.Arguments[1];
        TypeSyntax composite = implementation is QualifiedNameSyntax qualified
            ? qualified.WithRight(SyntaxFactory.IdentifierName(group.CompositeName))
            : SyntaxFactory.IdentifierName(group.CompositeName);
        var access = (MemberAccessExpressionSyntax)last.Invocation.Expression;
        var invocation = SyntaxFactory.InvocationExpression(
            SyntaxFactory.MemberAccessExpression(
                SyntaxKind.SimpleMemberAccessExpression,
                access.Expression.WithoutTrivia(),
                SyntaxFactory.GenericName(
                    SyntaxFactory.Identifier(registrationMethod),
                    SyntaxFactory.TypeArgumentList(
                        SyntaxFactory.SeparatedList<TypeSyntax>(
                            [
                                GeneratedTypeReferenceFinalizer.Reference(group.Family.V9Interface),
                                composite.WithoutTrivia(),
                            ],
                            [SyntaxFactory.Token(SyntaxKind.CommaToken).WithTrailingTrivia(SyntaxFactory.Space)]
                        )
                    )
                )
            )
        );
        var statement =
            last.Statement ?? throw new InvalidOperationException("Merged classes are registered by statements.");
        var indentation = statement.GetLeadingTrivia().LastOrDefault(static t => t.IsKind(SyntaxKind.WhitespaceTrivia));
        return SyntaxFactory
            .ExpressionStatement(invocation)
            .WithLeadingTrivia(SyntaxEditing.Indented(indentation))
            .WithTrailingTrivia(SyntaxFactory.EndOfLine(lineEnding));
    }

    /// <summary>
    /// The type declaration without <paramref name="baseType"/> in its base list, and without the base list when it was
    /// the only entry.
    /// </summary>
    public static TypeDeclarationSyntax WithoutBaseType(TypeDeclarationSyntax type, BaseTypeSyntax baseType)
    {
        if (type.BaseList is not { } list)
        {
            return type;
        }

        if (list.Types.Count > 1)
        {
            var types = list.Types.Remove(baseType);
            if (list.Types.Last() == baseType)
            {
                types = types.Replace(types.Last(), types.Last().WithTrailingTrivia(baseType.GetTrailingTrivia()));
            }

            return type.WithBaseList(list.WithTypes(types));
        }

        // What followed the base list, such as the line break before the brace, now follows what preceded it.
        var previous = list.GetFirstToken().GetPreviousToken();
        var trailing = list.GetTrailingTrivia();
        var withoutList = type.ReplaceToken(previous, previous.WithTrailingTrivia(trailing));
        return withoutList.WithBaseList(null);
    }

    private static List<Handler> Handlers(
        HookFamily family,
        IReadOnlyList<HookCandidate> candidates,
        IReadOnlyList<HookRegistration> registrations,
        IReadOnlyList<ScannedCSharpFile> files,
        Compilation compilation
    )
    {
        var handlers = new List<Handler>();
        foreach (
            var registered in registrations
                .Where(registration => registration.Family == family && registration.Implementation is not null)
                .GroupBy(static registration => registration.Implementation, SymbolEqualityComparer.Default)
        )
        {
            // A factory that returns the interface does not say which class it registers.
            if (
                registered.Key is not ITypeSymbol { TypeKind: TypeKind.Class } type
                || CSharpSemanticQueries.IsAltinnAppSymbol(type)
            )
            {
                continue;
            }

            var candidate = CandidateFor(type, family, candidates);
            if (candidate is null && IsInSource(type, compilation))
            {
                continue;
            }

            var first = registered.First();
            handlers.Add(
                new Handler(
                    type,
                    candidate,
                    candidate?.Tasks ?? TaskIds.Every,
                    [.. registered],
                    first.File,
                    first.Invocation
                )
            );
        }

        foreach (var (type, file, call) in PackageRegistrations(family, files, compilation))
        {
            if (!handlers.Exists(handler => SymbolEqualityComparer.Default.Equals(handler.Type, type)))
            {
                handlers.Add(new Handler(type, null, TaskIds.Every, [], file, call));
            }
        }

        return
        [
            .. handlers
                .OrderBy(static handler => PortReport.DisplayPath(handler.File.RelativePath), StringComparer.Ordinal)
                .ThenBy(static handler => handler.Anchor.SpanStart),
        ];
    }

    /// <summary>The app's implementation the registered class runs: its own, or one it inherits from an app class.</summary>
    private static HookCandidate? CandidateFor(
        ITypeSymbol type,
        HookFamily family,
        IReadOnlyList<HookCandidate> candidates
    )
    {
        for (ITypeSymbol? current = type; current is not null; current = current.BaseType)
        {
            if (
                candidates.FirstOrDefault(candidate =>
                    candidate.Hook.Family == family
                    && SymbolEqualityComparer.Default.Equals(candidate.Hook.Type, current.OriginalDefinition)
                ) is
                { } found
            )
            {
                return found;
            }
        }

        return null;
    }

    /// <summary>
    /// Package classes that implement the family's v8 interface, in packages the app registers services from: the
    /// package's own registration method may register them, which the app's code does not show.
    /// </summary>
    private static IEnumerable<(
        INamedTypeSymbol Type,
        ScannedCSharpFile File,
        InvocationExpressionSyntax Call
    )> PackageRegistrations(HookFamily family, IReadOnlyList<ScannedCSharpFile> files, Compilation compilation)
    {
        var hooksByAssembly = new Dictionary<IAssemblySymbol, IReadOnlyList<INamedTypeSymbol>>(
            SymbolEqualityComparer.Default
        );
        foreach (var file in files)
        {
            if (file.SemanticModel is not { } model)
            {
                continue;
            }

            foreach (var invocation in file.Root.DescendantNodes().OfType<InvocationExpressionSyntax>())
            {
                if (
                    model.GetSymbolInfo(invocation).Symbol is not IMethodSymbol method
                    || (method.ReducedFrom ?? method)
                        is not { IsExtensionMethod: true, Parameters: [var services, ..] } definition
                    || services.Type.ToDisplayString() != ServiceCollection
                    || !IsPackage(definition.ContainingAssembly, compilation)
                )
                {
                    continue;
                }

                var assembly = definition.ContainingAssembly;
                if (!hooksByAssembly.TryGetValue(assembly, out var hooks))
                {
                    hooksByAssembly[assembly] = hooks = [
                        .. Types(assembly.GlobalNamespace)
                            .Where(type =>
                                type is { TypeKind: TypeKind.Class, IsAbstract: false }
                                && type.AllInterfaces.Any(contract =>
                                    contract.ToDisplayString() == family.V8Interface
                                    && CSharpSemanticQueries.IsAltinnAppSymbol(contract)
                                )
                            ),
                    ];
                }

                foreach (var hook in hooks)
                {
                    yield return (hook, file, invocation);
                }
            }
        }
    }

    private static bool IsPackage(IAssemblySymbol assembly, Compilation compilation) =>
        !SymbolEqualityComparer.Default.Equals(assembly, compilation.Assembly)
        && assembly.Name is not ("Altinn.App.Core" or "Altinn.App.Api")
        && !assembly.Name.StartsWith("Microsoft.", StringComparison.Ordinal)
        && !assembly.Name.StartsWith("System.", StringComparison.Ordinal);

    private static bool IsInSource(ITypeSymbol type, Compilation compilation) =>
        SymbolEqualityComparer.Default.Equals(type.ContainingAssembly, compilation.Assembly);

    private static IEnumerable<INamedTypeSymbol> Types(INamespaceSymbol ns) =>
        ns.GetTypeMembers().Concat(ns.GetNamespaceMembers().SelectMany(Types));

    /// <summary>The handlers whose tasks overlap, transitively; only groups of two or more.</summary>
    private static IEnumerable<List<Handler>> OverlappingGroups(
        List<Handler> handlers,
        IReadOnlySet<string> processTasks
    )
    {
        var assigned = new HashSet<Handler>();
        foreach (var handler in handlers)
        {
            if (!assigned.Add(handler))
            {
                continue;
            }

            var group = new List<Handler> { handler };
            for (var i = 0; i < group.Count; i++)
            {
                foreach (var other in handlers)
                {
                    if (!assigned.Contains(other) && group[i].Tasks.Overlaps(other.Tasks, processTasks))
                    {
                        assigned.Add(other);
                        group.Add(other);
                    }
                }
            }

            if (group.Count > 1)
            {
                yield return [.. group.OrderBy(handlers.IndexOf)];
            }
        }
    }

    /// <summary>
    /// Whether the classes can be combined: each registered first as <c>Add*&lt;IHook, Class&gt;()</c>, by statements
    /// of one block, whose order is v8's; and none generic, so the generated class can name them.
    /// </summary>
    private static bool CanCombine(List<Handler> group) =>
        group.All(static handler =>
            handler.Registrations.Count > 0
            && handler.Registrations[0].TwoTypeArgumentsName is not null
            && handler.Registrations[0].Scope is not null
            && handler.Type is INamedTypeSymbol { IsGenericType: false }
        )
        && group.Select(static handler => handler.Registrations[0].Scope).Distinct().Count() == 1;

    private static MergeGroup Group(
        HookFamily family,
        List<Handler> group,
        Compilation compilation,
        IReadOnlyList<ScannedCSharpFile> files,
        HashSet<string> takenNames
    )
    {
        var first = group[0].Candidate?.Hook ?? throw new InvalidOperationException("Only app classes are merged.");
        var ns = first.Type.ContainingNamespace;
        var directory = Path.GetDirectoryName(first.File.Path) ?? "";
        var baseName = family.CompositeName ?? throw new InvalidOperationException("The family has no merged class.");
        var n = 1;
        while (true)
        {
            var name = n == 1 ? baseName : $"{baseName}{n}";
            var path = Path.Combine(directory, name + ".cs");
            var fullName = ns.IsGlobalNamespace ? name : $"{ns.ToDisplayString()}.{name}";
            // Unique by its short name, which the registration uses: Program.cs can import the namespaces of two groups.
            if (
                takenNames.Add(name)
                && compilation.GetTypeByMetadataName(fullName) is null
                && !File.Exists(path)
                && !files.Any(file => file.Path == path)
            )
            {
                return new MergeGroup(family, group, name, path);
            }

            n++;
        }
    }

    /// <summary>Camel-cased class names, or namespace-qualified ones for classes that share a name.</summary>
    private static IReadOnlyList<string> ParameterNames(IReadOnlyList<Handler> members)
    {
        var simple = members.Select(static member => member.Type.Name).ToList();
        return
        [
            .. members.Select(member =>
                CamelCase(
                    simple.Count(name => name == member.Type.Name) > 1
                        ? member.Type.ToDisplayString().Replace(".", "", StringComparison.Ordinal)
                        : member.Type.Name
                )
            ),
        ];
    }

    private static string CamelCase(string name) => char.ToLowerInvariant(name[0]) + name[1..];

    /// <summary>The class's name as the generated class in <paramref name="ns"/> can write it.</summary>
    private static string TypeName(ITypeSymbol type, INamespaceSymbol ns) =>
        SymbolEqualityComparer.Default.Equals(type.ContainingNamespace, ns)
            ? type.Name
            : type.ToDisplayString(SymbolDisplayFormat.FullyQualifiedFormat);

    private static PortReport MergedWarning(MergeGroup group, ProcessHookPortContext context)
    {
        var first = group.Members[0].Registrations[0];
        var classes = Join(group.Members.Select(static member => member.Type.Name));
        var path = PortReport.DisplayPath(Path.GetRelativePath(context.ProjectFolder, group.Path));
        return PortReport.Located(
            first.File,
            first.Invocation,
            UpgradeMessageStatus.Warning,
            $"v8 ran {classes} one after the other {Where(group.Family, group.Members, context)}, and v9 runs only one "
                + $"{group.Family.V9InterfaceName} there. "
                + $"{group.CompositeName} ({path}) now runs them in "
                + $"this registration order and is registered as {group.Family.V9InterfaceName} in their place."
        );
    }

    private static PortReport PackageTodo(
        HookFamily family,
        List<Handler> group,
        Handler package,
        List<Handler> apps,
        ProcessHookPortContext context
    )
    {
        return PortReport.Anchored(
            package.File,
            package.Anchor,
            UpgradeMessageStatus.Todo,
            $"{context.AppId}: {group.Count} handlers run {Where(family, group, context)} "
                + $"({string.Join(", ", group.Select(static handler => handler.Type.Name))}); v9 starts only with one "
                + $"{(family.FiltersTasks ? "per task" : "registered")}. "
                + $"{context.PackageName(package.Type.ContainingAssembly.Name)} "
                + $"registers {package.Type.Name}; a v9 version of the package is needed, then combine its check with "
                + $"{Join(apps.Select(static app => app.Type.Name))}."
        );
    }

    private static PortReport OrderTodo(HookFamily family, List<Handler> group, ProcessHookPortContext context) =>
        PortReport.Anchored(
            group[0].File,
            group[0].Anchor,
            UpgradeMessageStatus.Todo,
            $"{context.AppId}: {group.Count} handlers run {Where(family, group, context)} "
                + $"({string.Join(", ", group.Select(static handler => handler.Type.Name))}); v9 starts only with one "
                + $"{(family.FiltersTasks ? "per task" : "registered")}. They are not each registered once by a statement "
                + $"of the same method, so the upgrade cannot tell the order v8 ran them in; combine them into one "
                + $"{family.V9InterfaceName}."
        );

    private static string Where(HookFamily family, IReadOnlyList<Handler> group, ProcessHookPortContext context) =>
        family.FiltersTasks ? $"at {SharedTasks(group, context)}" : "when the process ends";

    /// <summary>The process's tasks at which more than one of the handlers runs.</summary>
    public static string SharedTasks(IReadOnlyList<Handler> handlers, ProcessHookPortContext context)
    {
        if (handlers.All(static handler => handler.Tasks.IsEvery) && context.BpmnTaskIds.Count == 0)
        {
            return "every task";
        }

        var tasks =
            context.BpmnTaskIds.Count > 0
                ? context.BpmnTaskIds.Order(StringComparer.Ordinal).ToList()
                : handlers
                    .SelectMany(static handler => handler.Tasks.Ids ?? [])
                    .Distinct(StringComparer.Ordinal)
                    .ToList();
        return Join(
            tasks.Where(task =>
                handlers.Count(handler => handler.Tasks.Ids is null || handler.Tasks.Ids.Contains(task)) > 1
            )
        );
    }

    public static string Join(IEnumerable<string> items)
    {
        var list = items.ToList();
        return list.Count <= 1 ? string.Concat(list) : $"{string.Join(", ", list[..^1])} and {list[^1]}";
    }
}
