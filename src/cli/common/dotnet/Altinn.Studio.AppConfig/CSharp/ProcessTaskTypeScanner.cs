using Altinn.Studio.AppConfig.Models;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.AppConfig.CSharp;

internal static class ProcessTaskTypeScanner
{
    private static readonly HashSet<string> _taskInterfaces = new(StringComparer.Ordinal)
    {
        "IProcessTask",
        "IServiceTask",
        "IPipelineServiceTask",
    };

    public static void Collect(SyntaxNode root, AppModelBuilder app)
    {
        var types = root.DescendantNodes().OfType<TypeDeclarationSyntax>().ToList();
        foreach (var type in types)
        {
            if (type.BaseList is null || !type.BaseList.Types.Any(b => _taskInterfaces.Contains(SimpleName(b.Type))))
                continue;
            if (TypeValue(type) is { } value && Resolve(value, type, types) is { Length: > 0 } taskType)
                app.CustomTaskTypes.Add(taskType);
        }
    }

    private static ExpressionSyntax? TypeValue(TypeDeclarationSyntax type)
    {
        var property = type
            .Members.OfType<PropertyDeclarationSyntax>()
            .FirstOrDefault(p => p.Identifier.Text == "Type");
        if (property?.ExpressionBody is { } arrow)
            return arrow.Expression;
        if (property?.Initializer is { } initializer)
            return initializer.Value;
        var getter = property?.AccessorList?.Accessors.FirstOrDefault(a => a.IsKind(SyntaxKind.GetAccessorDeclaration));
        return getter?.ExpressionBody?.Expression
            ?? getter?.Body?.Statements.OfType<ReturnStatementSyntax>().FirstOrDefault()?.Expression;
    }

    private static string? Resolve(
        ExpressionSyntax value,
        TypeDeclarationSyntax owner,
        IReadOnlyList<TypeDeclarationSyntax> typesInFile
    ) =>
        value switch
        {
            LiteralExpressionSyntax literal => StringLiteral(literal),
            ParenthesizedExpressionSyntax parenthesized => Resolve(parenthesized.Expression, owner, typesInFile),
            IdentifierNameSyntax name => StringConstant(owner.AncestorsAndSelf().OfType<TypeDeclarationSyntax>(), name)
                ?? StringConstant(typesInFile, name),
            MemberAccessExpressionSyntax { Name: IdentifierNameSyntax name } access => StringConstant(
                typesInFile.Where(t => t.Identifier.Text == LastIdentifier(access.Expression)),
                name
            ),
            _ => null,
        };

    private static string? StringConstant(IEnumerable<TypeDeclarationSyntax> types, IdentifierNameSyntax name)
    {
        foreach (var type in types)
        {
            foreach (var field in type.Members.OfType<FieldDeclarationSyntax>().Where(IsConstant))
            {
                foreach (var variable in field.Declaration.Variables)
                {
                    if (
                        variable.Identifier.Text == name.Identifier.Text
                        && StringLiteral(variable.Initializer?.Value) is { } text
                    )
                        return text;
                }
            }
        }
        return null;
    }

    private static bool IsConstant(FieldDeclarationSyntax field) =>
        field.Modifiers.Any(SyntaxKind.ConstKeyword)
        || (field.Modifiers.Any(SyntaxKind.StaticKeyword) && field.Modifiers.Any(SyntaxKind.ReadOnlyKeyword));

    private static string? StringLiteral(ExpressionSyntax? expression) =>
        expression is LiteralExpressionSyntax literal && literal.IsKind(SyntaxKind.StringLiteralExpression)
            ? literal.Token.ValueText
            : null;

    private static string? LastIdentifier(ExpressionSyntax expression) =>
        expression switch
        {
            IdentifierNameSyntax name => name.Identifier.Text,
            MemberAccessExpressionSyntax access => access.Name.Identifier.Text,
            _ => null,
        };

    private static string SimpleName(TypeSyntax type) =>
        type switch
        {
            QualifiedNameSyntax qualified => qualified.Right.Identifier.Text,
            AliasQualifiedNameSyntax aliased => aliased.Name.Identifier.Text,
            GenericNameSyntax generic => generic.Identifier.Text,
            IdentifierNameSyntax name => name.Identifier.Text,
            _ => type.ToString(),
        };
}
