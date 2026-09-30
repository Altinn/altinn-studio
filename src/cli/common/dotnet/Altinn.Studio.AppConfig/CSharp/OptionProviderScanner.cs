using Altinn.Studio.AppConfig.Models;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.AppConfig.CSharp;

/// <summary>
/// Locates option-list ids registered in C#: classes implementing <c>IAppOptionsProvider</c> /
/// <c>IInstanceAppOptionsProvider</c> whose <c>Id</c> property is a string literal, and the
/// registration helpers <see cref="OptionsRegistrationScanner"/> knows.
/// </summary>
internal static class OptionProviderScanner
{
    private static readonly HashSet<string> _providerInterfaces = new(StringComparer.Ordinal)
    {
        "IAppOptionsProvider",
        "IInstanceAppOptionsProvider",
    };

    public static void Collect(IReadOnlyList<(string File, SyntaxNode Root)> sources, AppModelBuilder app)
    {
        var ordered = sources.OrderBy(s => s.File, StringComparer.Ordinal).ToList();
        var constants = StringConstants.Collect(ordered.Select(s => s.Root));
        foreach (var (file, root) in ordered)
        {
            CollectClasses(root, file, app);
            OptionsRegistrationScanner.Collect(file, root, constants, app);
        }
    }

    private static void CollectClasses(SyntaxNode root, string file, AppModelBuilder app)
    {
        foreach (var type in root.DescendantNodes().OfType<TypeDeclarationSyntax>())
        {
            if (
                type.BaseList is null
                || !type.BaseList.Types.Any(b => _providerInterfaces.Contains(SimpleName(b.Type)))
            )
                continue;
            if (IdLiteral(type) is { Token.ValueText: { Length: > 0 } id } literal)
                app.OptionsProviders.TryAdd(
                    id,
                    new OptionsProvider(id, type.Identifier.ValueText, RoslynSyntaxIntrospector.SpanOf(literal, file))
                );
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

    private static LiteralExpressionSyntax? IdLiteral(TypeDeclarationSyntax type)
    {
        var idProp = type.Members.OfType<PropertyDeclarationSyntax>().FirstOrDefault(p => p.Identifier.Text == "Id");
        var expr = idProp?.Initializer?.Value ?? idProp?.ExpressionBody?.Expression;
        return expr is LiteralExpressionSyntax lit && lit.IsKind(SyntaxKind.StringLiteralExpression) ? lit : null;
    }
}
