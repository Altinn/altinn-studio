using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Decides whether the receiver of a member access is of an Altinn app type: by the semantic model when there is
/// one, otherwise by the names declared with that type in the file, as a field, parameter, property or local.
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
        foreach (var name in file.Root.DescendantNodes().OfType<IdentifierNameSyntax>())
        {
            if (name.Identifier.Text != typeName)
            {
                continue;
            }

            switch (name.Parent)
            {
                case VariableDeclarationSyntax variable:
                    foreach (var declarator in variable.Variables)
                    {
                        _declaredNames.Add(declarator.Identifier.Text);
                    }

                    break;
                case ParameterSyntax parameter:
                    _declaredNames.Add(parameter.Identifier.Text);
                    break;
                case PropertyDeclarationSyntax property:
                    _declaredNames.Add(property.Identifier.Text);
                    break;
            }
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
            _ => false,
        };
    }
}
