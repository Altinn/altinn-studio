using Altinn.Studio.AppConfig.Models;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.AppConfig.CSharp;

/// <summary>
/// Locates option-list ids registered in C# — classes implementing
/// <c>IAppOptionsProvider</c> / <c>IInstanceAppOptionsProvider</c> whose <c>Id</c> property is a
/// string literal.
/// </summary>
internal static class OptionProviderScanner
{
    private static readonly HashSet<string> _providerInterfaces = new(StringComparer.Ordinal)
    {
        "IAppOptionsProvider",
        "IInstanceAppOptionsProvider",
    };

    public static void Collect(SyntaxNode root, AppModelBuilder app)
    {
        foreach (var type in root.DescendantNodes().OfType<TypeDeclarationSyntax>())
        {
            if (
                type.BaseList is null
                || !type.BaseList.Types.Any(b => _providerInterfaces.Contains(SimpleName(b.Type)))
            )
                continue;
            if (ExtractId(type) is { Length: > 0 } id)
                app.OptionsProviders.Add(id);
        }
    }

    private static string SimpleName(TypeSyntax t) =>
        t switch
        {
            QualifiedNameSyntax q => q.Right.Identifier.Text,
            GenericNameSyntax g => g.Identifier.Text,
            IdentifierNameSyntax i => i.Identifier.Text,
            _ => t.ToString(),
        };

    private static string? ExtractId(TypeDeclarationSyntax type)
    {
        var idProp = type.Members.OfType<PropertyDeclarationSyntax>().FirstOrDefault(p => p.Identifier.Text == "Id");
        var expr = idProp?.Initializer?.Value ?? idProp?.ExpressionBody?.Expression;
        return expr is LiteralExpressionSyntax lit && lit.IsKind(SyntaxKind.StringLiteralExpression)
            ? lit.Token.ValueText
            : null;
    }
}
