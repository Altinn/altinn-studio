using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Shared queries for detectors running against a semantic model from the app's v8 compilation (see
/// <see cref="V8CompilationLoader"/>). Where <see cref="CSharpSyntaxQueries"/> matches simple names and
/// accepts over-reporting, these bind the name to its symbol and check which assembly declared it —
/// so an app's own type that happens to share a name with an SDK type no longer matches, and an SDK
/// member reached through an alias, variable or fully-qualified spelling no longer escapes.
/// <para>
/// Every query takes the file's <see cref="SemanticModel"/> and is only valid for nodes reached from
/// that file's <see cref="ScannedCSharpFile.Root"/>. The name-set queries pre-filter syntactically
/// before binding; <see cref="ReferencesToAssembly"/> necessarily binds every name in the file, which
/// is fine at app scale (tens of files, models cached per file).
/// </para>
/// </summary>
internal static class CSharpSemanticQueries
{
    /// <summary>The assemblies whose symbols count as "the SDK" for the removed-API detectors.</summary>
    private static bool IsAltinnAppAssembly(string? assemblyName) =>
        assemblyName is "Altinn.App.Core" or "Altinn.App.Api";

    /// <summary>Whether the symbol is declared by the Altinn.App packages.</summary>
    public static bool IsAltinnAppSymbol(ISymbol? symbol) => IsAltinnAppAssembly(symbol?.ContainingAssembly?.Name);

    /// <summary>Whether the symbol is declared by <paramref name="assemblyName"/>.</summary>
    public static bool IsDeclaredBy(ISymbol? symbol, string assemblyName) =>
        string.Equals(symbol?.ContainingAssembly?.Name, assemblyName, StringComparison.Ordinal);

    /// <summary>
    /// Invocations that bind to an Altinn.App method with one of the given names — regardless of how
    /// the call is spelled (bare, receiver-qualified, aliased, fully qualified). An optional containing
    /// type name and an optional predicate over the bound method narrow the match further (the
    /// predicate receives the <em>unreduced</em> form of extension methods, so parameter counts include
    /// the receiver).
    /// </summary>
    public static IEnumerable<CSharpApiMatch> InvokedAltinnMethods(
        ScannedCSharpFile file,
        SemanticModel semanticModel,
        IReadOnlySet<string> methodNames,
        string? containingTypeName = null,
        Func<IMethodSymbol, bool>? predicate = null
    )
    {
        foreach (var invocation in file.Root.DescendantNodes().OfType<InvocationExpressionSyntax>())
        {
            var name = InvokedName(invocation);
            if (name is null || !methodNames.Contains(name.Identifier.Text))
            {
                continue;
            }

            if (semanticModel.GetSymbolInfo(invocation).Symbol is not IMethodSymbol method)
            {
                continue;
            }

            var unreduced = method.ReducedFrom ?? method;
            if (!IsAltinnAppSymbol(unreduced))
            {
                continue;
            }

            if (containingTypeName is not null && unreduced.ContainingType?.Name != containingTypeName)
            {
                continue;
            }

            if (predicate is not null && !predicate(unreduced))
            {
                continue;
            }

            yield return new CSharpApiMatch(file.RelativePath, file.GetLine(name), name.Identifier.Text);
        }
    }

    /// <summary>
    /// Name nodes that bind to an Altinn.App type with one of the given names — type references,
    /// base-list entries, object creations, <c>nameof</c>/<c>typeof</c> operands, and so on.
    /// </summary>
    public static IEnumerable<CSharpApiMatch> AltinnTypeReferences(
        ScannedCSharpFile file,
        SemanticModel semanticModel,
        IReadOnlySet<string> typeNames
    )
    {
        foreach (var name in file.Root.DescendantNodes().OfType<SimpleNameSyntax>())
        {
            if (!typeNames.Contains(name.Identifier.Text))
            {
                continue;
            }

            var symbol = semanticModel.GetSymbolInfo(name).Symbol;
            if (symbol is INamedTypeSymbol type && IsAltinnAppSymbol(type))
            {
                yield return new CSharpApiMatch(file.RelativePath, file.GetLine(name), name.Identifier.Text);
            }
        }
    }

    /// <summary>
    /// Name nodes that bind to <em>any</em> symbol (type, method, property, ...) declared by the given
    /// assembly. The detector for the external Maskinporten package uses this: assembly identity is the
    /// exact form of the question its distinctive/ambiguous name split approximates.
    /// </summary>
    public static IEnumerable<CSharpApiMatch> ReferencesToAssembly(
        ScannedCSharpFile file,
        SemanticModel semanticModel,
        string assemblyName
    )
    {
        foreach (var name in file.Root.DescendantNodes().OfType<SimpleNameSyntax>())
        {
            var symbol = semanticModel.GetSymbolInfo(name).Symbol;
            var unreduced = symbol is IMethodSymbol { ReducedFrom: { } reducedFrom } ? reducedFrom : symbol;

            // Namespace segments are excluded even though they do carry the assembly (Roslyn's merged
            // namespace collapses to its single constituent when only one assembly declares it):
            // reporting `ApiClients`/`Services` for every using directive would bury the real usages,
            // and the syntactic using-directive query already reports the directive itself.
            if (unreduced is null or INamespaceSymbol || unreduced.IsImplicitlyDeclared)
            {
                continue;
            }

            if (IsDeclaredBy(unreduced, assemblyName))
            {
                yield return new CSharpApiMatch(file.RelativePath, file.GetLine(name), name.Identifier.Text);
            }
        }
    }

    /// <summary>
    /// Member accesses that bind to an Altinn.App property or field with one of the given names.
    /// </summary>
    public static IEnumerable<CSharpApiMatch> AltinnMemberReferences(
        ScannedCSharpFile file,
        SemanticModel semanticModel,
        IReadOnlySet<string> memberNames
    )
    {
        foreach (var name in file.Root.DescendantNodes().OfType<SimpleNameSyntax>())
        {
            if (!memberNames.Contains(name.Identifier.Text))
            {
                continue;
            }

            var symbol = semanticModel.GetSymbolInfo(name).Symbol;
            if (symbol is (IPropertySymbol or IFieldSymbol) and { } member && IsAltinnAppSymbol(member))
            {
                yield return new CSharpApiMatch(file.RelativePath, file.GetLine(name), name.Identifier.Text);
            }
        }
    }

    /// <summary>The simple name being invoked, mirroring <c>CSharpSyntaxQueries</c>' extraction.</summary>
    public static SimpleNameSyntax? InvokedName(InvocationExpressionSyntax invocation) =>
        invocation.Expression switch
        {
            MemberAccessExpressionSyntax memberAccess => memberAccess.Name,
            MemberBindingExpressionSyntax memberBinding => memberBinding.Name,
            SimpleNameSyntax simple => simple,
            _ => null,
        };
}
