using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.Backend.v7Tov8.CodeRewriters;

/// <summary>
/// Rewrites the IDataProcessor implementations
/// </summary>
internal sealed class DataProcessorRewriter : CSharpSyntaxRewriter
{
    /// <inheritdoc/>
    public override SyntaxNode? VisitClassDeclaration(ClassDeclarationSyntax node)
    {
        // Ignore any classes that don't implement `IDataProcessor` (consider using semantic model to ensure correct reference)
        if (node.BaseList?.Types.Any(t => t.Type.ToString() == "IDataProcessor") == true)
        {
            var processDataWrite = node
                .Members.OfType<MethodDeclarationSyntax>()
                .FirstOrDefault(m => m.Identifier.ValueText == "ProcessDataWrite");
            if (processDataWrite is not null)
            {
                node = node.ReplaceNode(processDataWrite, Update_DataProcessWrite(processDataWrite));
            }

            var processDataRead = node
                .Members.OfType<MethodDeclarationSyntax>()
                .FirstOrDefault(m => m.Identifier.ValueText == "ProcessDataRead");
            if (processDataRead is not null)
            {
                node = node.ReplaceNode(processDataRead, Update_DataProcessRead(processDataRead));
            }
        }

        return base.VisitClassDeclaration(node);
    }

    private MethodDeclarationSyntax Update_DataProcessRead(MethodDeclarationSyntax processDataRead)
    {
        if (
            processDataRead.ParameterList.Parameters.Count == 3
            && processDataRead.ReturnType.ToString() == "Task<bool>"
        )
        {
            processDataRead = AddParameterToProcessDataRead(processDataRead);
            processDataRead = ChangeReturnType_FromTaskBool_ToTask(processDataRead);
        }

        return processDataRead;
    }

    private MethodDeclarationSyntax Update_DataProcessWrite(MethodDeclarationSyntax processDataWrite)
    {
        if (
            processDataWrite.ParameterList.Parameters.Count == 3
            && processDataWrite.ReturnType.ToString() == "Task<bool>"
        )
        {
            processDataWrite = AddParameterToProcessDataWrite(processDataWrite);
            processDataWrite = ChangeReturnType_FromTaskBool_ToTask(processDataWrite);
        }

        return processDataWrite;
    }

    private MethodDeclarationSyntax AddParameterToProcessDataWrite(MethodDeclarationSyntax method)
    {
        return method.ReplaceNode(
            method.ParameterList,
            method.ParameterList.AddParameters(
                SyntaxFactory
                    .Parameter(SyntaxFactory.Identifier("previousData"))
                    .WithLeadingTrivia(SyntaxFactory.Space)
                    .WithType(SyntaxFactory.ParseTypeName("object?"))
                    .WithLeadingTrivia(SyntaxFactory.Space),
                SyntaxFactory
                    .Parameter(SyntaxFactory.Identifier("language"))
                    .WithLeadingTrivia(SyntaxFactory.Space)
                    .WithType(SyntaxFactory.ParseTypeName("string?"))
                    .WithLeadingTrivia(SyntaxFactory.Space)
            )
        );
    }

    private MethodDeclarationSyntax AddParameterToProcessDataRead(MethodDeclarationSyntax method)
    {
        return method.ReplaceNode(
            method.ParameterList,
            method.ParameterList.AddParameters(
                SyntaxFactory
                    .Parameter(SyntaxFactory.Identifier("language"))
                    .WithLeadingTrivia(SyntaxFactory.Space)
                    .WithType(SyntaxFactory.ParseTypeName("string?"))
                    .WithLeadingTrivia(SyntaxFactory.Space)
            )
        );
    }

    private MethodDeclarationSyntax ChangeReturnType_FromTaskBool_ToTask(MethodDeclarationSyntax method)
    {
        if (method.ReturnType.ToString() == "Task<bool>")
        {
            var returnTypeRewriter = new ReturnTypeTaskBooleanRewriter();
            method = (MethodDeclarationSyntax)returnTypeRewriter.Visit(method);
        }

        return method;
    }
}

/// <summary>
/// Rewrites the return type of a method from `Task<bool/>` to `Task`
/// </summary>
internal sealed class ReturnTypeTaskBooleanRewriter : CSharpSyntaxRewriter
{
    /// <inheritdoc/>
    public override SyntaxNode? VisitMethodDeclaration(MethodDeclarationSyntax node)
    {
        if (node.ReturnType.ToString() == "Task<bool>")
        {
            // Change return type
            node = node.WithReturnType(SyntaxFactory.ParseTypeName("Task").WithTrailingTrivia(SyntaxFactory.Space));
        }
        return base.VisitMethodDeclaration(node);
    }

    /// <inheritdoc/>
    public override SyntaxNode? VisitBlock(BlockSyntax node)
    {
        foreach (var returnStatementSyntax in node.Statements.OfType<ReturnStatementSyntax>())
        {
            var leadingTrivia = returnStatementSyntax.GetLeadingTrivia();
            var trailingTrivia = returnStatementSyntax.GetTrailingTrivia();
            // When we add multiple lines of code, we need the indentation and a newline
            var leadingTriviaMiddle = leadingTrivia.LastOrDefault(t => t.IsKind(SyntaxKind.WhitespaceTrivia));
            var trailingTriviaMiddle = trailingTrivia.FirstOrDefault(t => t.IsKind(SyntaxKind.EndOfLineTrivia));
            // If we don't find a newline, just guess that LF is used. Will likely work anyway.
            if (trailingTriviaMiddle == default)
                trailingTriviaMiddle = SyntaxFactory.LineFeed;

            switch (returnStatementSyntax.Expression)
            {
                // return true/false/variableName
                case IdentifierNameSyntax:
                case LiteralExpressionSyntax:
                case null:
                    node = node.ReplaceNode(
                        returnStatementSyntax,
                        SyntaxFactory
                            .ReturnStatement()
                            .WithLeadingTrivia(leadingTrivia)
                            .WithTrailingTrivia(trailingTrivia)
                    );
                    break;
                // case "Task.FromResult(...)":
                case InvocationExpressionSyntax
                {
                    Expression: MemberAccessExpressionSyntax
                    {
                        Expression: IdentifierNameSyntax { Identifier: { Text: "Task" } },
                        Name: { Identifier: { Text: "FromResult" } }
                    },
                    ArgumentList: { Arguments: { Count: 1 } }
                }:
                    node = node.ReplaceNode(
                        returnStatementSyntax,
                        SyntaxFactory
                            .ReturnStatement(SyntaxFactory.ParseExpression(" Task.CompletedTask"))
                            .WithLeadingTrivia(leadingTrivia)
                            .WithTrailingTrivia(trailingTrivia)
                    );
                    break;
                // case "await Task.FromResult(...)":
                // Assume we need an await to silence CS1998 and rewrite to
                // await Task.CompletedTask; return;
                // Could be dropped if we ignore CS1998
                case AwaitExpressionSyntax
                {
                    Expression: InvocationExpressionSyntax
                    {
                        Expression: MemberAccessExpressionSyntax
                        {
                            Expression: IdentifierNameSyntax { Identifier: { Text: "Task" } },
                            Name: { Identifier: { Text: "FromResult" } }
                        },
                        ArgumentList: { Arguments: [{ Expression: IdentifierNameSyntax or LiteralExpressionSyntax }] }
                    }
                }:
                    node = node.WithStatements(
                        node.Statements.ReplaceRange(
                            returnStatementSyntax,
                            new StatementSyntax[]
                            {
                                // Uncomment if cs1998 isn't disabled
                                // SyntaxFactory.ParseStatement("await Task.CompletedTask;")
                                //     .WithLeadingTrivia(leadingTrivia).WithTrailingTrivia(trailingTriviaMiddle),

                                SyntaxFactory
                                    .ReturnStatement()
                                    .WithLeadingTrivia(leadingTriviaMiddle)
                                    .WithTrailingTrivia(trailingTrivia),
                            }
                        )
                    );
                    break;
                // Just add move the return; statement after the existing return value
                default:
                    node = node.WithStatements(
                        node.Statements.ReplaceRange(
                            returnStatementSyntax,
                            new StatementSyntax[]
                            {
                                SyntaxFactory
                                    .ExpressionStatement(returnStatementSyntax.Expression)
                                    .WithLeadingTrivia(leadingTrivia)
                                    .WithTrailingTrivia(trailingTriviaMiddle),
                                SyntaxFactory
                                    .ReturnStatement()
                                    .WithLeadingTrivia(leadingTriviaMiddle)
                                    .WithTrailingTrivia(trailingTrivia),
                            }
                        )
                    );
                    break;
            }
        }

        return base.VisitBlock(node);
    }
}
