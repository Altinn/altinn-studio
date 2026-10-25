using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Operations;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;

/// <summary>
/// Whether a hook's code calls Platform Storage directly, which v9 refuses while the process is transitioning: a
/// member of one of the v8 Storage clients, or of an <c>HttpClient</c> in the hook's own class. Calls are followed into
/// the app's own methods, constructors and property accessors in any class, through interfaces and overrides to
/// their implementations in the app; code in packages is not followed.
/// </summary>
internal sealed class StorageCallReach
{
    private const int MaxDepth = 12;

    private static readonly HashSet<string> _clients =
    [
        "Altinn.App.Core.Internal.Data.IDataClient",
        "Altinn.App.Core.Internal.Instances.IInstanceClient",
        "Altinn.App.Core.Internal.Data.IDataService",
        "Altinn.App.Core.Internal.Instances.IInstanceEventClient",
        "Altinn.App.Core.Internal.Sign.ISignClient",
        "Altinn.App.Core.Internal.Pdf.IPdfService",
    ];

    private readonly Compilation _compilation;
    private readonly Lazy<IReadOnlyList<INamedTypeSymbol>> _sourceTypes;

    public StorageCallReach(Compilation compilation)
    {
        _compilation = compilation;
        _sourceTypes = new(() => [.. SourceTypes(compilation.Assembly.GlobalNamespace)]);
    }

    /// <summary>
    /// Whether <paramref name="method"/>, or app code it calls, calls Storage. Code more than
    /// <see cref="MaxDepth"/> calls away counts as calling it.
    /// </summary>
    public bool Reaches(IMethodSymbol method)
    {
        var hookType = method.ContainingType.OriginalDefinition;
        var visited = new HashSet<IMethodSymbol>(SymbolEqualityComparer.Default);
        var pending = new Queue<(IMethodSymbol Method, int Depth)>([(method.OriginalDefinition, 0)]);
        while (pending.TryDequeue(out var current))
        {
            if (!visited.Add(current.Method))
            {
                continue;
            }

            if (current.Depth > MaxDepth)
            {
                return true;
            }

            var inHookType = SymbolEqualityComparer.Default.Equals(
                current.Method.ContainingType.OriginalDefinition,
                hookType
            );
            foreach (var target in Targets(current.Method))
            {
                if (IsStorageCall(target, inHookType))
                {
                    return true;
                }

                foreach (var callee in SourceImplementations(target))
                {
                    pending.Enqueue((callee, current.Depth + 1));
                }
            }
        }

        return false;
    }

    /// <summary>The methods the body of <paramref name="method"/> calls or refers to, lambdas and local functions included.</summary>
    private IEnumerable<IMethodSymbol> Targets(IMethodSymbol method)
    {
        foreach (var reference in method.DeclaringSyntaxReferences)
        {
            var model = _compilation.GetSemanticModel(reference.SyntaxTree);
            foreach (var body in Bodies(reference.GetSyntax()))
            {
                if (model.GetOperation(body) is not { } operation)
                {
                    continue;
                }

                foreach (var descendant in operation.DescendantsAndSelf())
                {
                    var target = descendant switch
                    {
                        IInvocationOperation invocation => invocation.TargetMethod,
                        IObjectCreationOperation creation => creation.Constructor,
                        IMethodReferenceOperation methodReference => methodReference.Method,
                        IPropertyReferenceOperation property => property.Property.GetMethod,
                        _ => null,
                    };
                    if (target is not null)
                    {
                        yield return target;
                    }
                }
            }
        }
    }

    private static IEnumerable<SyntaxNode> Bodies(SyntaxNode declaration) =>
        declaration switch
        {
            ArrowExpressionClauseSyntax arrow => [arrow],
            BaseMethodDeclarationSyntax method => new SyntaxNode?[]
            {
                method.Body,
                method.ExpressionBody,
            }.OfType<SyntaxNode>(),
            AccessorDeclarationSyntax accessor => new SyntaxNode?[]
            {
                accessor.Body,
                accessor.ExpressionBody,
            }.OfType<SyntaxNode>(),
            _ => [],
        };

    /// <summary>
    /// The declarations in the app that a call to <paramref name="target"/> can run: the method itself, and for an
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
            foreach (var type in _sourceTypes.Value)
            {
                if (
                    type.AllInterfaces.Any(contract =>
                        SymbolEqualityComparer.Default.Equals(contract.OriginalDefinition, method.ContainingType)
                    )
                    && type.FindImplementationForInterfaceMember(ConstructedMember(method, type))
                        is IMethodSymbol implementation
                    && IsInSource(implementation)
                )
                {
                    yield return implementation.OriginalDefinition;
                }
            }
        }
        else if (method.IsAbstract || method.IsVirtual || method.IsOverride)
        {
            foreach (var type in _sourceTypes.Value)
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

    /// <summary>The interface member as the type sees it, which differs from its definition for a generic interface.</summary>
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

    /// <summary>
    /// A member of a Storage client, called on a receiver of a client type (extension methods on one included), or an
    /// <c>HttpClient</c> member called from the hook's own class, which may be a request to Storage.
    /// </summary>
    private static bool IsStorageCall(IMethodSymbol target, bool inHookType)
    {
        var receiver = (target.ReducedFrom ?? target) is { IsExtensionMethod: true, Parameters: [var extended, ..] }
            ? extended.Type
            : target.ContainingType;
        return receiver is not null && (IsClient(receiver) || inHookType && IsHttpClient(receiver));
    }

    private static bool IsClient(ITypeSymbol type) =>
        IsClientInterface(type) || type.AllInterfaces.Any(IsClientInterface);

    private static bool IsClientInterface(ITypeSymbol type) =>
        _clients.Contains(type.OriginalDefinition.ToDisplayString()) && CSharpSemanticQueries.IsAltinnAppSymbol(type);

    private static bool IsHttpClient(ITypeSymbol type)
    {
        for (var current = type; current is not null; current = current.BaseType)
        {
            if (current.ToDisplayString() == "System.Net.Http.HttpClient")
            {
                return true;
            }
        }

        return false;
    }

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
