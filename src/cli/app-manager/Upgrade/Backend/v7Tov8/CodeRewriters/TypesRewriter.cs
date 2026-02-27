using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.Backend.v7Tov8.CodeRewriters;

/// <summary>
/// Rewrite the types of moved interfaces
/// </summary>
internal sealed class TypesRewriter : CSharpSyntaxRewriter
{
    private readonly SemanticModel _semanticModel;
    private readonly Dictionary<string, TypeSyntax> _fieldDescendantsMapping = new Dictionary<string, TypeSyntax>()
    {
        { "Altinn.App.Core.Interface.IAppEvents", SyntaxFactory.IdentifierName("IAppEvents") },
        { "Altinn.App.Core.Interface.IApplication", SyntaxFactory.IdentifierName("IApplicationClient") },
        { "Altinn.App.Core.Interface.IAppResources", SyntaxFactory.IdentifierName("IAppResources") },
        { "Altinn.App.Core.Interface.IAuthentication", SyntaxFactory.IdentifierName("IAuthenticationClient") },
        { "Altinn.App.Core.Interface.IAuthorization", SyntaxFactory.IdentifierName("IAuthorizationClient") },
        { "Altinn.App.Core.Interface.IData", SyntaxFactory.IdentifierName("IDataClient") },
        { "Altinn.App.Core.Interface.IDSF", SyntaxFactory.IdentifierName("IPersonClient") },
        { "Altinn.App.Core.Interface.IER", SyntaxFactory.IdentifierName("IOrganizationClient") },
        { "Altinn.App.Core.Interface.IEvents", SyntaxFactory.IdentifierName("IEventsClient") },
        { "Altinn.App.Core.Interface.IInstance", SyntaxFactory.IdentifierName("IInstanceClient") },
        { "Altinn.App.Core.Interface.IInstanceEvent", SyntaxFactory.IdentifierName("IInstanceEventClient") },
        { "Altinn.App.Core.Interface.IPersonLookup", SyntaxFactory.IdentifierName("IPersonClient") },
        { "Altinn.App.Core.Interface.IPersonRetriever", SyntaxFactory.IdentifierName("IPersonClient") },
        { "Altinn.App.Core.Interface.IPrefill", SyntaxFactory.IdentifierName("IPrefill") },
        { "Altinn.App.Core.Interface.IProcess", SyntaxFactory.IdentifierName("IProcessClient") },
        { "Altinn.App.Core.Interface.IProfile", SyntaxFactory.IdentifierName("IProfileClient") },
        { "Altinn.App.Core.Interface.IRegister", SyntaxFactory.IdentifierName("IAltinnPartyClient") },
        { "Altinn.App.Core.Interface.ISecrets", SyntaxFactory.IdentifierName("ISecretsClient") },
        { "Altinn.App.Core.Interface.ITaskEvents", SyntaxFactory.IdentifierName("ITaskEvents") },
        { "Altinn.App.Core.Interface.IUserTokenProvider", SyntaxFactory.IdentifierName("IUserTokenProvider") },
    };
    private readonly IEnumerable<string> _statementsToRemove = new List<string>()
    {
        "app.UseDefaultSecurityHeaders();",
        "app.UseRouting();",
        "app.UseStaticFiles('/' + applicationId);",
        "app.UseAuthentication();",
        "app.UseAuthorization();",
        "app.UseEndpoints(endpoints",
        "app.UseHealthChecks(\"/health\");",
        "app.UseAltinnAppCommonConfiguration();",
    };

    /// <summary>
    /// Initializes a new instance of the <see cref="TypesRewriter"/> class.
    /// </summary>
    /// <param name="semanticModel"></param>
    public TypesRewriter(SemanticModel semanticModel)
    {
        _semanticModel = semanticModel;
    }

    /// <inheritdoc/>
    public override SyntaxNode VisitFieldDeclaration(FieldDeclarationSyntax node)
    {
        return UpdateField(node);
    }

    /// <inheritdoc/>
    public override SyntaxNode VisitParameter(ParameterSyntax node)
    {
        var parameterTypeName = node.Type;
        if (parameterTypeName is null)
        {
            return node;
        }
        var parameterType = (ITypeSymbol?)_semanticModel.GetSymbolInfo(parameterTypeName).Symbol;
        var parameterTypeString = parameterType?.ToString();
        if (
            parameterTypeString is not null
            && _fieldDescendantsMapping.TryGetValue(parameterTypeString, out var newType)
        )
        {
            var newTypeName = newType
                .WithLeadingTrivia(parameterTypeName.GetLeadingTrivia())
                .WithTrailingTrivia(parameterTypeName.GetTrailingTrivia());
            return node.ReplaceNode(parameterTypeName, newTypeName);
        }

        return node;
    }

    /// <inheritdoc/>
    public override SyntaxNode VisitGlobalStatement(GlobalStatementSyntax node)
    {
        if (
            node.Statement is LocalFunctionStatementSyntax localFunctionStatementSyntax
            && localFunctionStatementSyntax.Identifier.Text == "Configure"
            && !localFunctionStatementSyntax.ParameterList.Parameters.Any()
            && localFunctionStatementSyntax.Body is not null
        )
        {
            SyntaxTriviaList leadingTrivia = SyntaxFactory.TriviaList();
            SyntaxTriviaList trailingTrivia = SyntaxFactory.TriviaList();
            var newBody = SyntaxFactory
                .Block()
                .WithoutLeadingTrivia()
                .WithTrailingTrivia(localFunctionStatementSyntax.Body.GetTrailingTrivia());
            foreach (var childNode in localFunctionStatementSyntax.Body.ChildNodes())
            {
                if (
                    childNode is IfStatementSyntax ifStatementSyntax
                    && ifStatementSyntax.Condition.ToString() != "app.Environment.IsDevelopment()"
                )
                {
                    newBody = AddStatementWithTrivia(newBody, ifStatementSyntax);
                }
                if (childNode is ExpressionStatementSyntax statementSyntax)
                {
                    leadingTrivia = statementSyntax.GetLeadingTrivia();
                    trailingTrivia = statementSyntax.GetTrailingTrivia();
                    if (!ShouldRemoveStatement(statementSyntax))
                    {
                        newBody = AddStatementWithTrivia(newBody, statementSyntax);
                    }
                }
                if (childNode is LocalDeclarationStatementSyntax localDeclarationStatement)
                {
                    newBody = AddStatementWithTrivia(newBody, localDeclarationStatement);
                }
            }
            newBody = newBody.AddStatements(
                SyntaxFactory
                    .ParseStatement("app.UseAltinnAppCommonConfiguration();")
                    .WithLeadingTrivia(leadingTrivia)
                    .WithTrailingTrivia(trailingTrivia)
            );
            return node.ReplaceNode(localFunctionStatementSyntax.Body, newBody);
        }

        return node;
    }

    /// <inheritdoc/>
    public override SyntaxNode VisitMethodDeclaration(MethodDeclarationSyntax node)
    {
        if (
            node.Identifier.Text == "FilterAsync"
            && node.Parent is ClassDeclarationSyntax { BaseList: not null } classDeclarationSyntax
            && classDeclarationSyntax.BaseList.Types.Any(x => x.Type.ToString() == "IProcessExclusiveGateway")
            && node.ParameterList.Parameters.All(x => x.Type?.ToString() != "ProcessGatewayInformation")
        )
        {
            return node.AddParameterListParameters(
                SyntaxFactory
                    .Parameter(
                        SyntaxFactory
                            .Identifier("processGatewayInformation")
                            .WithLeadingTrivia(SyntaxFactory.ElasticSpace)
                    )
                    .WithType(
                        SyntaxFactory
                            .ParseTypeName("ProcessGatewayInformation")
                            .WithLeadingTrivia(SyntaxFactory.ElasticSpace)
                    )
            );
        }

        return node;
    }

    private FieldDeclarationSyntax UpdateField(FieldDeclarationSyntax node)
    {
        var variableTypeName = node.Declaration.Type;
        var variableType = (ITypeSymbol?)_semanticModel.GetSymbolInfo(variableTypeName).Symbol;
        var variableTypeString = variableType?.ToString();
        if (variableTypeString is not null && _fieldDescendantsMapping.TryGetValue(variableTypeString, out var newType))
        {
            var newTypeName = newType
                .WithLeadingTrivia(variableTypeName.GetLeadingTrivia())
                .WithTrailingTrivia(variableTypeName.GetTrailingTrivia());
            node = node.ReplaceNode(variableTypeName, newTypeName);
            Console.WriteLine(
                $"Updated field {node.Declaration.Variables.First().Identifier.Text} from {variableType} to {newType}"
            );
        }
        return node;
    }

    private bool ShouldRemoveStatement(StatementSyntax statementSyntax)
    {
        foreach (var statementToRemove in _statementsToRemove)
        {
            var s = statementSyntax.ToString();
            if (s == statementToRemove || s.StartsWith(statementToRemove, StringComparison.Ordinal))
            {
                return true;
            }
        }
        return false;
    }

    private static BlockSyntax AddStatementWithTrivia(BlockSyntax block, StatementSyntax statement)
    {
        return block
            .AddStatements(statement)
            .WithLeadingTrivia(statement.GetLeadingTrivia())
            .WithTrailingTrivia(statement.GetTrailingTrivia());
    }
}
