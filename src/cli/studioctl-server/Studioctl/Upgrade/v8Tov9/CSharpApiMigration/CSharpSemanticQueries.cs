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
/// before binding.
/// </para>
/// </summary>
internal static class CSharpSemanticQueries
{
    /// <summary>The assemblies whose symbols count as "the SDK" for the removed-API detectors.</summary>
    private static bool IsAltinnAppAssembly(string? assemblyName) =>
        assemblyName is "Altinn.App.Core" or "Altinn.App.Api";

    /// <summary>Whether the symbol is declared by the Altinn.App packages.</summary>
    public static bool IsAltinnAppSymbol(ISymbol? symbol) => IsAltinnAppAssembly(symbol?.ContainingAssembly?.Name);

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

    /// <summary>
    /// Whether the token names an SDK symbol — a reference that binds to one, or the declaration of
    /// a member that implements or overrides one. Both sides matter: an app's <c>GetAppOptionsAsync</c>
    /// method on the SDK's <c>IAppOptionsProvider</c> is declared by the app, and a call through the app's own
    /// concrete type binds to the app's method — either would be missed by a plain
    /// declared-in-the-SDK check, and renaming a declaration while leaving its call sites (or the
    /// reverse) would not compile.
    /// </summary>
    public static bool NamesSdkMember(SemanticModel semanticModel, SyntaxToken token, SyntaxNode parent)
    {
        var symbol = parent switch
        {
            SimpleNameSyntax name => Unreduce(BoundSymbol(semanticModel, name)),
            MethodDeclarationSyntax or PropertyDeclarationSyntax => semanticModel.GetDeclaredSymbol(
                (MemberDeclarationSyntax)parent
            ),
            _ => null,
        };

        return symbol is not null && RefersToSdkMember(symbol, token.ValueText);
    }

    private static ISymbol? BoundSymbol(SemanticModel semanticModel, SimpleNameSyntax name)
    {
        var info = semanticModel.GetSymbolInfo(name);
        return info.Symbol ?? info.CandidateSymbols.FirstOrDefault();
    }

    private static ISymbol? Unreduce(ISymbol? symbol) =>
        symbol is IMethodSymbol method ? method.ReducedFrom ?? method : symbol;

    /// <summary>
    /// Whether <paramref name="symbol"/> is declared by the SDK, overrides an SDK member, or
    /// implements an SDK interface member named <paramref name="name"/>.
    /// </summary>
    private static bool RefersToSdkMember(ISymbol symbol, string name)
    {
        if (IsAltinnAppSymbol(symbol))
        {
            return true;
        }

        for (var overridden = Overridden(symbol); overridden is not null; overridden = Overridden(overridden))
        {
            if (IsAltinnAppSymbol(overridden))
            {
                return true;
            }
        }

        if (symbol.ContainingType is not { } containingType)
        {
            return false;
        }

        foreach (var contract in containingType.AllInterfaces)
        {
            if (!IsAltinnAppSymbol(contract))
            {
                continue;
            }

            foreach (var member in contract.GetMembers(name))
            {
                var implementation = containingType.FindImplementationForInterfaceMember(member);
                if (SymbolEqualityComparer.Default.Equals(implementation, symbol))
                {
                    return true;
                }
            }
        }

        return false;
    }

    private static ISymbol? Overridden(ISymbol symbol) =>
        symbol switch
        {
            IMethodSymbol method => method.OverriddenMethod,
            IPropertySymbol property => property.OverriddenProperty,
            _ => null,
        };
}
