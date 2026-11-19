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
        var insertions = SyntaxFactory.List<StatementSyntax>();
        if (
            statements is [TryStatementSyntax { Catches.Count: 0, Finally: { Block: var final } } guarded]
            && final.Statements.All(IsProcessorInsertion)
        )
        {
            statements = guarded.Block.Statements;
            insertions = final.Statements;
        }
        var update = CreateRegistrationStatement(0, "IDataProcessor", _className);
        var create = CreateRegistrationStatement(1, "IDataWriteProcessor", _className);
        if (
            !statements.Any(IsGeneratedRegistration)
            && insertions.Count(IsGeneratedRegistration) == 2
            && insertions[^2].IsEquivalentTo(update)
            && insertions[^1].IsEquivalentTo(create)
        )
        {
            _registrationAdded = true;
            return node;
        }

        statements = SyntaxFactory.List(statements.Where(statement => !IsGeneratedRegistration(statement)));
        insertions = SyntaxFactory.List(insertions.Where(statement => !IsGeneratedRegistration(statement)));
        // Let app registrations, including TryAdd calls in helpers, run before adding our descriptors.
        // Finally also covers an early return from the app's registration method.
        var wrapper = SyntaxFactory.TryStatement(
            SyntaxFactory.Block(statements),
            default,
            SyntaxFactory.FinallyClause(SyntaxFactory.Block(insertions.Add(update).Add(create)))
        );
        _registrationAdded = true;
        return withBody(
            node,
            body.WithStatements(SyntaxFactory.SingletonList<StatementSyntax>(wrapper))
                .NormalizeWhitespace()
                .WithTriviaFrom(body)
        );
    }

    private static bool IsProcessorInsertion(StatementSyntax statement) =>
        RegistrationTypes(statement) is { Count: 2 } types
        && TypeName(types[0]) is "IDataProcessor" or "IDataWriteProcessor"
        && statement
            is ExpressionStatementSyntax
            {
                Expression: InvocationExpressionSyntax
                {
                    Expression: MemberAccessExpressionSyntax { Name.Identifier.ValueText: "Insert" }
                }
            };

    private bool IsGeneratedRegistration(StatementSyntax statement) =>
        RegistrationTypes(statement) is { Count: 2 } types
        && TypeName(types[0]) is "IDataProcessor" or "IDataWriteProcessor"
        && IsGeneratedClass(types[1]);

    private bool IsGeneratedClass(TypeSyntax type) =>
        type.ToString() == _className
        || type.ToString() == "Altinn.App.Logic.ConvertedLegacyRules." + _className
        || type.ToString() == "global::Altinn.App.Logic.ConvertedLegacyRules." + _className;

    private static SeparatedSyntaxList<TypeSyntax>? RegistrationTypes(StatementSyntax statement)
    {
        if (statement is not ExpressionStatementSyntax { Expression: InvocationExpressionSyntax invocation })
            return null;
        if (
            invocation.Expression is MemberAccessExpressionSyntax { Name.Identifier.ValueText: "Insert" }
            && invocation.ArgumentList.Arguments is [_, { Expression: InvocationExpressionSyntax descriptor }]
            && descriptor.Expression
                is MemberAccessExpressionSyntax
                {
                    Expression: var factory,
                    Name: GenericNameSyntax
                    {
                        Identifier.ValueText: "Transient",
                        TypeArgumentList.Arguments: var inserted
                    }
                }
            && factory.ToString() == "global::Microsoft.Extensions.DependencyInjection.ServiceDescriptor"
        )
            return inserted;
        return
            invocation.Expression
                is MemberAccessExpressionSyntax
                {
                    Name: GenericNameSyntax
                    {
                        Identifier.ValueText: "AddTransient" or "AddScoped" or "AddSingleton",
                        TypeArgumentList.Arguments: var types
                    }
                }
            ? types
            : null;
    }

    private static string TypeName(TypeSyntax type) =>
        type switch
        {
            QualifiedNameSyntax qualified => qualified.Right.Identifier.ValueText,
            AliasQualifiedNameSyntax alias => alias.Name.Identifier.ValueText,
            IdentifierNameSyntax identifier => identifier.Identifier.ValueText,
            _ => type.ToString(),
        };

    private static ExpressionStatementSyntax CreateRegistrationStatement(
        int index,
        string interfaceName,
        string className
    )
    {
        var statement = SyntaxFactory.ParseStatement(
            $"services.Insert({index}, global::Microsoft.Extensions.DependencyInjection.ServiceDescriptor.Transient<{interfaceName}, {className}>());"
        );

        if (statement is ExpressionStatementSyntax expressionStatement)
        {
            // Remove any trivia from the parsed statement - we'll add proper trivia in the calling code
            return expressionStatement.WithLeadingTrivia().WithTrailingTrivia();
        }

        throw new InvalidOperationException($"Failed to create registration statement for {className}");
    }
}
