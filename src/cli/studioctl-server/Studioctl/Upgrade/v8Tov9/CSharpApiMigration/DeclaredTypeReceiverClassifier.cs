using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Decides whether the receiver of a member access is of an Altinn app type: by the semantic model when there is
/// one, otherwise by the names declared with that type in the file, as a field, parameter, property or local. The
/// declared type may be written nullable, qualified by its namespace or through an alias such as <c>global::</c>.
/// </summary>
internal sealed class DeclaredTypeReceiverClassifier
{
    private readonly string _typeName;
    private readonly SemanticModel? _semanticModel;
    private readonly HashSet<string> _declaredNames = new(StringComparer.Ordinal);

    public DeclaredTypeReceiverClassifier(ScannedCSharpFile file, string typeName)
    {
        _typeName = typeName;
        _semanticModel = file.SemanticModel;
        foreach (var node in file.Root.DescendantNodes())
        {
            switch (node)
            {
                case VariableDeclarationSyntax variable when DeclaresType(variable.Type):
                    foreach (var declarator in variable.Variables)
                    {
                        _declaredNames.Add(declarator.Identifier.Text);
                    }

                    break;
                case ParameterSyntax parameter when DeclaresType(parameter.Type):
                    _declaredNames.Add(parameter.Identifier.Text);
                    break;
                case PropertyDeclarationSyntax property when DeclaresType(property.Type):
                    _declaredNames.Add(property.Identifier.Text);
                    break;
            }
        }
    }

    /// <summary>
    /// The receiver of <paramref name="invocation"/>, whether it is called with <c>.</c> or <c>?.</c>, and the
    /// invoked member in <paramref name="name"/>; both are <c>null</c> when the invocation has no receiver.
    /// </summary>
    public static ExpressionSyntax? ReceiverOf(InvocationExpressionSyntax invocation, out SimpleNameSyntax? name)
    {
        switch (invocation.Expression)
        {
            case MemberAccessExpressionSyntax memberAccess:
                name = memberAccess.Name;
                return memberAccess.Expression;
            // A null-conditional call (`x?.Method(...)`) binds the name via a member binding; the receiver is
            // the expression of the conditional access the invocation hangs off.
            case MemberBindingExpressionSyntax memberBinding
                when invocation.Parent is ConditionalAccessExpressionSyntax { WhenNotNull: var whenNotNull } conditional
                    && whenNotNull == invocation:
                name = memberBinding.Name;
                return conditional.Expression;
            default:
                name = null;
                return null;
        }
    }

    public bool IsOfType(ExpressionSyntax receiver)
    {
        if (_semanticModel is not null && _semanticModel.SyntaxTree == receiver.SyntaxTree)
        {
            var type = _semanticModel.GetTypeInfo(receiver).Type;
            if (type is not null)
            {
                return type.Name == _typeName && CSharpSemanticQueries.IsAltinnAppSymbol(type);
            }
        }

        return receiver switch
        {
            IdentifierNameSyntax identifier => _declaredNames.Contains(identifier.Identifier.Text),
            MemberAccessExpressionSyntax { Expression: ThisExpressionSyntax } member => _declaredNames.Contains(
                member.Name.Identifier.Text
            ),
            // `_resources!.Method(...)` on a nullable declaration.
            PostfixUnaryExpressionSyntax postfix when postfix.IsKind(SyntaxKind.SuppressNullableWarningExpression) =>
                IsOfType(postfix.Operand),
            ParenthesizedExpressionSyntax parenthesized => IsOfType(parenthesized.Expression),
            _ => false,
        };
    }

    private bool DeclaresType(TypeSyntax? type) => SimpleName(type) == _typeName;

    /// <summary>The trailing (unqualified) identifier of a type reference, or <c>null</c>.</summary>
    private static string? SimpleName(TypeSyntax? type) =>
        type switch
        {
            IdentifierNameSyntax identifier => identifier.Identifier.Text,
            QualifiedNameSyntax qualified => qualified.Right.Identifier.Text,
            AliasQualifiedNameSyntax alias => alias.Name.Identifier.Text,
            NullableTypeSyntax nullable => SimpleName(nullable.ElementType),
            _ => null,
        };
}
