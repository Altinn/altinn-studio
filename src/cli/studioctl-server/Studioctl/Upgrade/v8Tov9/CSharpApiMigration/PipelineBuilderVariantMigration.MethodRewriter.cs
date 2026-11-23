using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

internal sealed partial class PipelineBuilderVariantMigration
{
    /// <summary>
    /// Applies the planned changes to one method.
    /// </summary>
    private sealed class MethodRewriter(string variant, bool returnsVoid) : CSharpSyntaxRewriter
    {
        public HashSet<TypeSyntax> Retype { get; } = [];

        public Dictionary<InvocationExpressionSyntax, string> Renames { get; } = [];

        /// <summary>
        /// The lambdas that get an explicit return type, which a simple lambda needs parentheses for.
        /// </summary>
        public Dictionary<LambdaExpressionSyntax, TypeSyntax> ReturnTypes { get; } = [];

        public Dictionary<ReturnStatementSyntax, ReturnChange> Returns { get; } = [];

        /// <summary>
        /// Whether the expression body only returned <c>pipeline.Build()</c>, and becomes an empty body.
        /// </summary>
        public bool EmptyBody { get; set; }

        public override SyntaxNode? Visit(SyntaxNode? node)
        {
            switch (node)
            {
                case MethodDeclarationSyntax method when returnsVoid:
                    var visited = Kept(base.Visit(method), method)
                        .WithReturnType(
                            SyntaxFactory
                                .PredefinedType(SyntaxFactory.Token(SyntaxKind.VoidKeyword))
                                .WithTriviaFrom(method.ReturnType)
                        );
                    if (
                        method.ExpressionBody is not { } arrow
                        || visited.ExpressionBody is not { } visitedArrow
                        || EmptyBody
                    )
                    {
                        return visited;
                    }

                    var (chain, before, after) = ChainOf(arrow.Expression);
                    return visited
                        .WithExpressionBody(visitedArrow.WithExpression(chain.WithLeadingTrivia(before)))
                        .WithSemicolonToken(
                            visited.SemicolonToken.WithLeadingTrivia(
                                Keep(after.Concat(visited.SemicolonToken.LeadingTrivia))
                            )
                        );
                case TypeSyntax type when Retype.Contains(type):
                    return SyntaxFactory
                        .QualifiedName((NameSyntax)type.WithoutTrivia(), SyntaxFactory.IdentifierName(variant))
                        .WithTriviaFrom(type);
                case InvocationExpressionSyntax invocation when Renames.TryGetValue(invocation, out var renamed):
                    var call = Kept(base.Visit(invocation), invocation);
                    var access = (MemberAccessExpressionSyntax)call.Expression;
                    return call.WithExpression(
                        access.WithName(SyntaxFactory.IdentifierName(renamed).WithTriviaFrom(access.Name))
                    );
                case LambdaExpressionSyntax lambda when ReturnTypes.TryGetValue(lambda, out var returnType):
                    return WithReturnType(Kept(base.Visit(lambda), lambda), returnType);
                case ReturnStatementSyntax statement
                    when Returns.TryGetValue(statement, out var change) && change == ReturnChange.ReturnVoid:
                    // A comment in the removed value stays, before the semicolon.
                    return statement
                        .WithExpression(null)
                        .WithReturnKeyword(statement.ReturnKeyword.WithTrailingTrivia())
                        .WithSemicolonToken(
                            statement.SemicolonToken.WithLeadingTrivia(
                                Keep(
                                    statement
                                        .ReturnKeyword.TrailingTrivia.Concat(
                                            statement.Expression?.DescendantTrivia() ?? []
                                        )
                                        .Concat(statement.SemicolonToken.LeadingTrivia)
                                )
                            )
                        );
                default:
                    return base.Visit(node);
            }
        }

        public override SyntaxNode? VisitBlock(BlockSyntax node)
        {
            if (!node.Statements.Any(statement => statement is ReturnStatementSyntax r && Returns.ContainsKey(r)))
            {
                return base.VisitBlock(node);
            }

            var statements = new List<StatementSyntax>();
            var closeBrace = node.CloseBraceToken;
            foreach (var statement in node.Statements)
            {
                if (statement is not ReturnStatementSyntax returned || !Returns.TryGetValue(returned, out var change))
                {
                    statements.Add(Kept(Visit(statement), statement));
                    continue;
                }

                var leading = returned.GetLeadingTrivia();
                switch (change)
                {
                    case ReturnChange.Remove:
                        // A comment or directive around the removed return, and the code a directive disables,
                        // stay above the closing brace.
                        closeBrace = closeBrace.WithLeadingTrivia(
                            OwnLines(returned.DescendantTrivia()).AddRange(closeBrace.LeadingTrivia)
                        );
                        break;
                    case ReturnChange.Statement:
                        statements.Add(Statement(returned));
                        break;
                    case ReturnChange.Expand:
                        statements.Add(Statement(returned));
                        statements.Add(
                            SyntaxFactory
                                .ReturnStatement()
                                .WithReturnKeyword(SyntaxFactory.Token(SyntaxKind.ReturnKeyword))
                                .WithLeadingTrivia(
                                    leading
                                        .Where(static trivia => trivia.IsKind(SyntaxKind.WhitespaceTrivia))
                                        .TakeLast(1)
                                )
                                .WithTrailingTrivia(returned.GetTrailingTrivia())
                        );
                        break;
                    default:
                        statements.Add(Kept(Visit(statement), statement));
                        break;
                }
            }

            return node.WithStatements(SyntaxFactory.List(statements)).WithCloseBraceToken(closeBrace);
        }

        /// <summary>
        /// The chain a <c>return chain.Build();</c> composed, as a statement in its place. A comment or directive
        /// between <c>return</c> and the chain stays above it, and one after the chain stays before the semicolon.
        /// </summary>
        private ExpressionStatementSyntax Statement(ReturnStatementSyntax returned)
        {
            var (chain, before, after) = ChainOf(
                returned.Expression ?? throw new InvalidOperationException("A planned return lost its value.")
            );
            var above = Keep(returned.ReturnKeyword.TrailingTrivia.Concat(before))
                .SkipWhile(static trivia =>
                    trivia.IsKind(SyntaxKind.WhitespaceTrivia) || trivia.IsKind(SyntaxKind.EndOfLineTrivia)
                );
            return SyntaxFactory
                .ExpressionStatement(
                    chain,
                    returned.SemicolonToken.WithLeadingTrivia(Keep(after.Concat(returned.SemicolonToken.LeadingTrivia)))
                )
                .WithLeadingTrivia(returned.GetLeadingTrivia().AddRange(above));
        }

        /// <summary>
        /// <c>chain</c> from <c>chain.Build()</c>, with the changes planned inside it, without the trivia around it
        /// and the parentheses, which a statement cannot start with. Also the trivia before and after the chain, which
        /// can hold a directive or comment that goes with what is removed, such as one before <c>.Build()</c>.
        /// </summary>
        private (ExpressionSyntax Chain, SyntaxTriviaList Before, SyntaxTriviaList After) ChainOf(
            ExpressionSyntax built
        )
        {
            var chain = Unwrap(BuiltFrom(built));
            var before = new List<SyntaxTrivia>();
            var after = new List<SyntaxTrivia>(chain.GetTrailingTrivia());
            foreach (var token in built.DescendantTokens())
            {
                if (token.SpanStart < chain.SpanStart)
                {
                    before.AddRange(token.LeadingTrivia);
                    before.AddRange(token.TrailingTrivia);
                }
                else if (token.SpanStart >= chain.Span.End)
                {
                    after.AddRange(token.LeadingTrivia);
                    after.AddRange(token.TrailingTrivia);
                }
            }

            before.AddRange(chain.GetLeadingTrivia());
            return (
                Kept(Visit(chain), chain).WithoutTrivia(),
                SyntaxFactory.TriviaList(before),
                SyntaxFactory.TriviaList(after)
            );
        }

        /// <summary>
        /// The lambda with an explicit return type, after its modifiers, as in
        /// <c>static Task&lt;StageResult&gt; (context) => throw ...</c>.
        /// </summary>
        private static ParenthesizedLambdaExpressionSyntax WithReturnType(
            LambdaExpressionSyntax lambda,
            TypeSyntax returnType
        )
        {
            var parameters = lambda switch
            {
                SimpleLambdaExpressionSyntax simple => SyntaxFactory
                    .ParameterList(SyntaxFactory.SingletonSeparatedList(simple.Parameter.WithoutTrivia()))
                    .WithLeadingTrivia(simple.Parameter.GetLeadingTrivia())
                    .WithTrailingTrivia(simple.Parameter.GetTrailingTrivia()),
                ParenthesizedLambdaExpressionSyntax parenthesized => parenthesized.ParameterList,
                _ => throw new InvalidOperationException($"Unexpected lambda {lambda.Kind()}."),
            };
            // The return type takes the place of the parameters, which follow it after a space.
            var typed = SyntaxFactory.ParenthesizedLambdaExpression(
                lambda.AttributeLists,
                lambda.Modifiers,
                returnType
                    .WithLeadingTrivia(lambda.Modifiers.Count == 0 ? parameters.GetLeadingTrivia() : default)
                    .WithTrailingTrivia(SyntaxFactory.Space),
                parameters.WithLeadingTrivia(),
                lambda.ArrowToken,
                lambda.Block,
                lambda.ExpressionBody
            );
            return lambda.AttributeLists.Count == 0 && lambda.Modifiers.Count == 0
                ? typed
                : typed.WithLeadingTrivia(lambda.GetLeadingTrivia());
        }

        /// <summary>
        /// The rewritten form of <paramref name="original"/>, which keeps its kind.
        /// </summary>
        public static T Kept<T>(SyntaxNode? rewritten, T original)
            where T : SyntaxNode =>
            rewritten as T
            ?? throw new InvalidOperationException($"Rewriting changed the kind of a {original.Kind()}.");

        private static ExpressionSyntax BuiltFrom(ExpressionSyntax built) =>
            ((MemberAccessExpressionSyntax)((InvocationExpressionSyntax)built).Expression).Expression;
    }
}
