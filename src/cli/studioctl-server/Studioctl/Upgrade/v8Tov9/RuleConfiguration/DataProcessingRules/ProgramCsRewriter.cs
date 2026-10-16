using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.DataProcessingRules;

/// <summary>
/// Roslyn-based rewriter for adding IDataProcessor registrations to Program.cs
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
        var generated = statements.Where(IsGeneratedRegistration).ToList();
        if (
            generated.Count == 1
            && generated[0] == statements[0]
            && RegistrationTypes(generated[0]) is { } existing
            && TypeName(existing[0]) == "IDataProcessor"
        )
        {
            _registrationAdded = true;
            return node;
        }

        // A resumed upgrade may have registered this class as an IDataWriteProcessor. Replace that
        // registration rather than running the same calculation through both interfaces.
        foreach (var statement in generated)
            statements = statements.Remove(statement);

        // Legacy frontend calculations ran before saving. Register their replacements first so app
        // processors consume fresh results, including processors registered through app helper methods.
        // All existing registrations keep their relative order.
        var indentation =
            statements.Count > 0
                ? statements[0]
                    .GetLeadingTrivia()
                    .LastOrDefault(trivia => trivia.IsKind(SyntaxKind.WhitespaceTrivia))
                    .ToString()
                : "    ";
        var newRegistration = CreateRegistrationStatement(_className)
            .WithLeadingTrivia(SyntaxFactory.Whitespace(indentation))
            .WithTrailingTrivia(SyntaxFactory.LineFeed);
        if (generated.Count > 0)
            newRegistration = newRegistration.WithTriviaFrom(generated[0]);
        statements = statements.Insert(0, newRegistration);
        _registrationAdded = true;
        return withBody(node, body.WithStatements(statements));
    }

    private bool IsGeneratedRegistration(StatementSyntax statement) =>
        RegistrationTypes(statement) is { Count: 2 } types
        && TypeName(types[0]) is "IDataProcessor" or "IDataWriteProcessor"
        && TypeName(types[1]) == _className;

    private static SeparatedSyntaxList<TypeSyntax>? RegistrationTypes(StatementSyntax statement) =>
        statement
            is ExpressionStatementSyntax
            {
                Expression: InvocationExpressionSyntax
                {
                    Expression: MemberAccessExpressionSyntax
                    {
                        Name: GenericNameSyntax
                        {
                            Identifier.ValueText: "AddTransient" or "AddScoped" or "AddSingleton",
                            TypeArgumentList.Arguments: var types
                        }
                    }
                }
            }
            ? types
            : null;

    private static string TypeName(TypeSyntax type) =>
        type switch
        {
            QualifiedNameSyntax qualified => qualified.Right.Identifier.ValueText,
            AliasQualifiedNameSyntax alias => alias.Name.Identifier.ValueText,
            IdentifierNameSyntax identifier => identifier.Identifier.ValueText,
            _ => type.ToString(),
        };

    private static ExpressionStatementSyntax CreateRegistrationStatement(string className)
    {
        // Create: services.AddTransient<IDataProcessor, ClassName>();
        var statement = SyntaxFactory.ParseStatement($"services.AddTransient<IDataProcessor, {className}>();");

        if (statement is ExpressionStatementSyntax expressionStatement)
        {
            // Remove any trivia from the parsed statement - we'll add proper trivia in the calling code
            return expressionStatement.WithLeadingTrivia().WithTrailingTrivia();
        }

        throw new InvalidOperationException($"Failed to create registration statement for {className}");
    }
}
