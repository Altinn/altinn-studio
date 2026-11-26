using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Fleet.Cli.Analysis.ApiUsage;

/// <summary>Reports each app library symbol a syntax tree binds to, with how the code uses it.</summary>
/// <remarks>
/// A name binds to a type or member, so asking the semantic model about every name, creation, attribute and operator
/// finds the uses. A type declaration adds what it inherits, implements and overrides, since an app that implements
/// an interface depends on all of its members, called or not.
/// </remarks>
internal sealed class UsageWalker(SemanticModel model, Action<ISymbol, string, Location> report) : CSharpSyntaxWalker
{
    public override void DefaultVisit(SyntaxNode node)
    {
        switch (node)
        {
            case BaseTypeDeclarationSyntax declaration:
                ReportDeclaration(declaration);
                break;
            case SimpleNameSyntax
            or ObjectCreationExpressionSyntax
            or ImplicitObjectCreationExpressionSyntax
            or AttributeSyntax
            or BinaryExpressionSyntax
            or PrefixUnaryExpressionSyntax
            or PostfixUnaryExpressionSyntax
            or AssignmentExpressionSyntax
            or ElementAccessExpressionSyntax
            or ConstructorInitializerSyntax
            or PrimaryConstructorBaseTypeSyntax:
                ReportBound(node);
                break;
        }

        if (node is ExpressionSyntax expression && model.GetConversion(expression).MethodSymbol is { } conversion)
        {
            Report(conversion, UseKinds.Conversion, node.GetLocation());
        }

        base.DefaultVisit(node);
    }

    private void ReportBound(SyntaxNode node)
    {
        SymbolInfo info = model.GetSymbolInfo(node);
        ISymbol? symbol = info.Symbol ?? (info.CandidateSymbols.Length > 0 ? info.CandidateSymbols[0] : null);
        if (symbol is null or INamespaceSymbol)
        {
            return;
        }

        Report(symbol, KindOf(symbol, node), node.GetLocation());
    }

    private static string KindOf(ISymbol symbol, SyntaxNode node) =>
        symbol switch
        {
            INamedTypeSymbol => UseKinds.Type,
            IMethodSymbol { MethodKind: MethodKind.Constructor } => node is AttributeSyntax
                ? UseKinds.Attribute
                : UseKinds.Construct,
            IMethodSymbol { MethodKind: MethodKind.UserDefinedOperator or MethodKind.Conversion } => UseKinds.Operator,
            IMethodSymbol => UseKinds.Call,
            IPropertySymbol or IFieldSymbol => UseKinds.Access,
            IEventSymbol => UseKinds.Event,
            _ => symbol.Kind.ToString().ToLowerInvariant(),
        };

    private void ReportDeclaration(BaseTypeDeclarationSyntax declaration)
    {
        if (model.GetDeclaredSymbol(declaration) is not INamedTypeSymbol type)
        {
            return;
        }

        // A partial type is reported once, from its first declaration: the app's own, ahead of generated parts.
        if (type.DeclaringSyntaxReferences[0].GetSyntax() != declaration)
        {
            return;
        }

        Location location = declaration.Identifier.GetLocation();
        if (type.BaseType is { } baseType && LibrarySymbols.IsLibrary(baseType))
        {
            Report(baseType, UseKinds.Inherit, location);
        }

        foreach (INamedTypeSymbol iface in type.AllInterfaces.Where(LibrarySymbols.IsLibrary))
        {
            Report(iface, UseKinds.Implement, location);
            foreach (ISymbol member in iface.GetMembers())
            {
                // Accessors are reported through their property or event.
                if (
                    member.IsStatic
                    || member is INamedTypeSymbol
                    || member is IMethodSymbol { AssociatedSymbol: not null }
                )
                {
                    continue;
                }

                ISymbol? implementation = type.FindImplementationForInterfaceMember(member);
                if (
                    implementation is not null
                    && SymbolEqualityComparer.Default.Equals(implementation.ContainingType, type)
                )
                {
                    Report(member, UseKinds.Implement, location);
                }
            }
        }

        foreach (ISymbol member in type.GetMembers())
        {
            ISymbol? overridden = member switch
            {
                IMethodSymbol method => method.OverriddenMethod,
                IPropertySymbol property => property.OverriddenProperty,
                IEventSymbol @event => @event.OverriddenEvent,
                _ => null,
            };
            if (overridden is not null && LibrarySymbols.IsLibrary(overridden))
            {
                Report(overridden, UseKinds.Override, location);
            }
        }
    }

    private void Report(ISymbol symbol, string kind, Location location)
    {
        // A name that did not bind is an error type that claims a library assembly, not a use of the library.
        if (symbol is not IErrorTypeSymbol && LibrarySymbols.IsLibrary(symbol))
        {
            report(symbol, kind, location);
        }
    }
}
