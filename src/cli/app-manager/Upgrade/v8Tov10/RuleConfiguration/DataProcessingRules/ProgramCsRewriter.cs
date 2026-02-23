using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration.DataProcessingRules;

/// <summary>
/// Roslyn-based rewriter for adding IDataWriteProcessor registrations to Program.cs
/// </summary>
internal sealed class ProgramCsRewriter : CSharpSyntaxRewriter
{
    private readonly string _className;
    private bool _registrationAdded;

    public ProgramCsRewriter(string className)
    {
        _className = className;
    }

    public bool RegistrationAdded => _registrationAdded;

    public override SyntaxNode? VisitMethodDeclaration(MethodDeclarationSyntax node)
    {
        // Look for the RegisterCustomAppServices method
        if (node.Identifier.ValueText == "RegisterCustomAppServices" && node.Body != null)
        {
            return ProcessFunctionBody(node, node.Body, (n, b) => n.WithBody(b));
        }

        return base.VisitMethodDeclaration(node);
    }

    public override SyntaxNode? VisitLocalFunctionStatement(LocalFunctionStatementSyntax node)
    {
        // Look for the RegisterCustomAppServices local function
        if (node.Identifier.ValueText == "RegisterCustomAppServices" && node.Body != null)
        {
            return ProcessFunctionBody(node, node.Body, (n, b) => n.WithBody(b));
        }

        return base.VisitLocalFunctionStatement(node);
    }

    private T ProcessFunctionBody<T>(T node, BlockSyntax body, Func<T, BlockSyntax, T> withBody)
        where T : SyntaxNode
    {
        var statements = body.Statements;

        // Check if this registration already exists
        var registrationExists = statements
            .OfType<ExpressionStatementSyntax>()
            .Select(s => s.Expression)
            .OfType<InvocationExpressionSyntax>()
            .Any(invocation => IsDataWriteProcessorRegistration(invocation, _className));

        if (registrationExists)
        {
            _registrationAdded = true;
            return node;
        }

        // Find all existing IDataWriteProcessor registrations
        var lastDataWriteProcessorIndex = -1;
        for (int i = statements.Count - 1; i >= 0; i--)
        {
            if (
                statements[i] is ExpressionStatementSyntax expr
                && expr.Expression is InvocationExpressionSyntax invocation
                && IsDataWriteProcessorRegistration(invocation, null)
            )
            {
                lastDataWriteProcessorIndex = i;
                break;
            }
        }

        // Create the new registration statement
        var newRegistration = CreateRegistrationStatement(_className);

        // Add after the last IDataWriteProcessor registration, or at the beginning
        if (lastDataWriteProcessorIndex >= 0)
        {
            // Preserve the indentation and trivia from the existing registration
            var existingStatement = statements[lastDataWriteProcessorIndex];
            var leadingTrivia = existingStatement.GetLeadingTrivia();

            // Ensure we have a newline before the new statement
            newRegistration = newRegistration
                .WithLeadingTrivia(leadingTrivia)
                .WithTrailingTrivia(SyntaxFactory.LineFeed);

            statements = statements.Insert(lastDataWriteProcessorIndex + 1, newRegistration);
        }
        else
        {
            // Insert at the end of the method (before the closing brace)
            // Preserve indentation from last statement or use default
            if (statements.Count > 0)
            {
                var lastStatement = statements[^1];
                newRegistration = newRegistration
                    .WithLeadingTrivia(lastStatement.GetLeadingTrivia())
                    .WithTrailingTrivia(SyntaxFactory.LineFeed);
            }
            else
            {
                // Method is empty, add default indentation
                newRegistration = newRegistration
                    .WithLeadingTrivia(SyntaxFactory.Whitespace("    "))
                    .WithTrailingTrivia(SyntaxFactory.LineFeed);
            }

            statements = statements.Add(newRegistration);
        }

        _registrationAdded = true;
        return withBody(node, body.WithStatements(statements));
    }

    private static bool IsDataWriteProcessorRegistration(
        InvocationExpressionSyntax invocation,
        string? specificClassName
    )
    {
        // Check for pattern: services.AddTransient<IDataWriteProcessor, ClassName>()
        if (invocation.Expression is not MemberAccessExpressionSyntax memberAccess)
            return false;

        if (memberAccess.Name is not GenericNameSyntax genericName)
            return false;

        if (genericName.Identifier.ValueText != "AddTransient")
            return false;

        var typeArgs = genericName.TypeArgumentList.Arguments;
        if (typeArgs.Count != 2)
            return false;

        var firstType = typeArgs[0].ToString();
        if (firstType != "IDataWriteProcessor")
            return false;

        // If checking for a specific class name
        if (specificClassName != null)
        {
            var secondType = typeArgs[1].ToString();
            return secondType == specificClassName;
        }

        return true;
    }

    private static ExpressionStatementSyntax CreateRegistrationStatement(string className)
    {
        // Create: services.AddTransient<IDataWriteProcessor, ClassName>();
        var statement = SyntaxFactory.ParseStatement($"services.AddTransient<IDataWriteProcessor, {className}>();");

        if (statement is ExpressionStatementSyntax expressionStatement)
        {
            // Remove any trivia from the parsed statement - we'll add proper trivia in the calling code
            return expressionStatement.WithLeadingTrivia().WithTrailingTrivia();
        }

        throw new InvalidOperationException($"Failed to create registration statement for {className}");
    }
}
