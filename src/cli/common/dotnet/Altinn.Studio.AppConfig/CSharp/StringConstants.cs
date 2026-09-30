using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.AppConfig.CSharp;

internal sealed class StringConstants
{
    private const int MaxDepth = 8;

    private readonly Dictionary<string, ExpressionSyntax> _byQualifiedName = new(StringComparer.Ordinal);

    public static StringConstants Collect(IEnumerable<SyntaxNode> roots)
    {
        var constants = new StringConstants();
        foreach (var root in roots)
        {
            foreach (var field in root.DescendantNodes().OfType<FieldDeclarationSyntax>())
            {
                if (!field.Modifiers.Any(SyntaxKind.ConstKeyword) || field.Parent is not TypeDeclarationSyntax owner)
                    continue;
                var ownerName = QualifiedName(owner);
                foreach (var variable in field.Declaration.Variables)
                    if (variable.Initializer is { Value: var value })
                        constants._byQualifiedName.TryAdd(ownerName + "." + variable.Identifier.ValueText, value);
            }
        }
        return constants;
    }

    public string? Evaluate(ExpressionSyntax expression) => Evaluate(expression, 0);

    private string? Evaluate(ExpressionSyntax expression, int depth)
    {
        if (depth > MaxDepth)
            return null;
        switch (expression)
        {
            case LiteralExpressionSyntax literal when literal.IsKind(SyntaxKind.StringLiteralExpression):
                return literal.Token.ValueText;
            case ParenthesizedExpressionSyntax parenthesized:
                return Evaluate(parenthesized.Expression, depth);
            case InterpolatedStringExpressionSyntax interpolated:
                return PlainText(interpolated);
            case BinaryExpressionSyntax binary when binary.IsKind(SyntaxKind.AddExpression):
                var left = Evaluate(binary.Left, depth);
                var right = Evaluate(binary.Right, depth);
                return left is null || right is null ? null : left + right;
            case InvocationExpressionSyntax
            {
                Expression: IdentifierNameSyntax { Identifier.ValueText: "nameof" },
                ArgumentList.Arguments: [var argument],
            }:
                return LastName(argument.Expression);
            case IdentifierNameSyntax or MemberAccessExpressionSyntax:
                return Lookup(expression, depth);
            default:
                return null;
        }
    }

    private string? Lookup(ExpressionSyntax reference, int depth)
    {
        var name = string.Concat(reference.ToString().Where(c => !char.IsWhiteSpace(c)));
        for (
            var type = reference.FirstAncestorOrSelf<TypeDeclarationSyntax>();
            type is not null;
            type = type.Parent?.FirstAncestorOrSelf<TypeDeclarationSyntax>()
        )
        {
            if (_byQualifiedName.TryGetValue(QualifiedName(type) + "." + name, out var scoped))
                return Evaluate(scoped, depth + 1);
        }
        if (reference is not MemberAccessExpressionSyntax)
            return null;

        var values = _byQualifiedName
            .Where(kv =>
                string.Equals(kv.Key, name, StringComparison.Ordinal)
                || kv.Key.EndsWith("." + name, StringComparison.Ordinal)
            )
            .Select(kv => Evaluate(kv.Value, depth + 1))
            .Distinct(StringComparer.Ordinal)
            .ToList();
        return values is [{ } only] ? only : null;
    }

    private static string? PlainText(InterpolatedStringExpressionSyntax interpolated) =>
        interpolated.Contents.All(c => c is InterpolatedStringTextSyntax)
            ? string.Concat(
                interpolated.Contents.Cast<InterpolatedStringTextSyntax>().Select(t => t.TextToken.ValueText)
            )
            : null;

    private static string? LastName(ExpressionSyntax expression) =>
        expression switch
        {
            SimpleNameSyntax simple => simple.Identifier.ValueText,
            MemberAccessExpressionSyntax member => member.Name.Identifier.ValueText,
            QualifiedNameSyntax qualified => qualified.Right.Identifier.ValueText,
            _ => null,
        };

    private static string QualifiedName(TypeDeclarationSyntax type)
    {
        var parts = new List<string>();
        for (SyntaxNode? node = type; node is not null; node = node.Parent)
        {
            switch (node)
            {
                case BaseTypeDeclarationSyntax declaration:
                    parts.Add(declaration.Identifier.ValueText);
                    break;
                case BaseNamespaceDeclarationSyntax ns:
                    parts.Add(ns.Name.ToString());
                    break;
            }
        }
        parts.Reverse();
        return string.Join('.', parts);
    }
}
