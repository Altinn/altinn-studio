using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

internal sealed partial class PreviewPipelineMigration
{
    /// <summary>
    /// Applies the planned changes to one method that composes a pipeline.
    /// </summary>
    /// <param name="variant">The builder variant the method composes.</param>
    /// <param name="returnsVoid">Whether the method is a <c>Define</c> method, which now returns nothing.</param>
    /// <param name="returnsChain">
    /// Whether the method returned its chain itself, as <c>DefineExecute</c> did, rather than <c>chain.Build()</c>.
    /// </param>
    private sealed class MethodRewriter(string variant, bool returnsVoid, bool returnsChain) : CSharpSyntaxRewriter
    {
        public bool ReturnsChain => returnsChain;

        public HashSet<TypeSyntax> Retype { get; } = [];

        /// <summary>
        /// Written types that become another type, such as a helper's <c>ServiceTaskPipeline</c>.
        /// </summary>
        public Dictionary<TypeSyntax, TypeSyntax> Replace { get; } = [];

        public Dictionary<InvocationExpressionSyntax, string> Renames { get; } = [];

        /// <summary>
        /// The calls that become an <c>ExternalStage</c>: the handler in the send's chain, or else the send.
        /// </summary>
        public Dictionary<InvocationExpressionSyntax, ExternalStagePlan> ExternalStages { get; } = [];

        /// <summary>
        /// Handlers merged into a send in the statement before, which leave only their receiver.
        /// </summary>
        public HashSet<InvocationExpressionSyntax> Strips { get; } = [];

        /// <summary>
        /// Statements that were only a stripped handler.
        /// </summary>
        public HashSet<StatementSyntax> Removed { get; } = [];

        /// <summary>
        /// The lambdas and local functions passed as steps, and how each is rewritten.
        /// </summary>
        public Dictionary<SyntaxNode, StepRewriter> Steps { get; } = [];

        public Dictionary<ReturnStatementSyntax, ReturnChange> Returns { get; } = [];

        /// <summary>
        /// Whether the expression body only returned <c>pipeline.Build()</c>, and becomes an empty body.
        /// </summary>
        public bool EmptyBody { get; set; }

        /// <summary>
        /// The whole method in its new shape, when it is replaced rather than rewritten, as a port stub is.
        /// </summary>
        public MemberDeclarationSyntax? Replacement { get; init; }

        public MemberDeclarationSyntax Rewrite(MethodDeclarationSyntax method)
        {
            if (Replacement is not null)
            {
                return Replacement;
            }

            var rewritten = Kept(Visit(method), method);
            return EmptyBody ? WithEmptyBody(rewritten) : rewritten;
        }

        public override SyntaxNode? Visit(SyntaxNode? node)
        {
            switch (node)
            {
                case null:
                    return null;
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
                case TypeSyntax type when Replace.TryGetValue(type, out var replacement):
                    return replacement.WithTriviaFrom(type);
                case InvocationExpressionSyntax invocation when ExternalStages.TryGetValue(invocation, out var plan):
                    return ExternalStageCall(plan);
                case InvocationExpressionSyntax invocation when Strips.Contains(invocation):
                    var receiver = ((MemberAccessExpressionSyntax)invocation.Expression).Expression;
                    return Kept(Visit(receiver), receiver).WithTrailingTrivia(invocation.GetTrailingTrivia());
                case InvocationExpressionSyntax invocation when Renames.TryGetValue(invocation, out var renamed):
                    var call = Kept(base.Visit(invocation), invocation);
                    var access = (MemberAccessExpressionSyntax)call.Expression;
                    return call.WithExpression(
                        access.WithName(SyntaxFactory.IdentifierName(renamed).WithTriviaFrom(access.Name))
                    );
                case var function when Steps.TryGetValue(function, out var step):
                    return step.Rewrite(function);
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
            if (
                !node.Statements.Any(statement =>
                    Removed.Contains(statement) || (statement is ReturnStatementSyntax r && Returns.ContainsKey(r))
                )
            )
            {
                return base.VisitBlock(node);
            }

            var statements = new List<StatementSyntax>();
            var closeBrace = node.CloseBraceToken;
            // What a removed statement held to keep, for the next statement or the closing brace.
            var carried = new List<SyntaxTrivia>();
            var aboveCloseBrace = new List<SyntaxTrivia>();
            void Add(StatementSyntax statement)
            {
                statements.Add(
                    carried.Count == 0
                        ? statement
                        : statement.WithLeadingTrivia(carried.Concat(statement.GetLeadingTrivia()))
                );
                carried.Clear();
            }

            foreach (var statement in node.Statements)
            {
                if (Removed.Contains(statement))
                {
                    carried.AddRange(OwnLines(statement.GetLeadingTrivia().Concat(statement.GetTrailingTrivia())));
                    continue;
                }

                if (statement is not ReturnStatementSyntax returned || !Returns.TryGetValue(returned, out var change))
                {
                    Add(Kept(Visit(statement), statement));
                    continue;
                }

                var leading = returned.GetLeadingTrivia();
                switch (change)
                {
                    case ReturnChange.Remove:
                        // A comment or directive around the removed return, and the code a directive disables,
                        // stay above the closing brace.
                        aboveCloseBrace.AddRange(OwnLines(returned.DescendantTrivia()));
                        break;
                    case ReturnChange.Statement:
                        Add(Statement(returned));
                        break;
                    case ReturnChange.Expand:
                        Add(Statement(returned));
                        Add(
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
                        Add(Kept(Visit(statement), statement));
                        break;
                }
            }

            carried.AddRange(aboveCloseBrace);
            if (carried.Count > 0)
            {
                closeBrace = closeBrace.WithLeadingTrivia(carried.Concat(closeBrace.LeadingTrivia));
            }

            return node.WithStatements(SyntaxFactory.List(statements)).WithCloseBraceToken(closeBrace);
        }

        /// <summary>
        /// The chain a <c>return</c> composed, as a statement in its place. A comment or directive between
        /// <c>return</c> and the chain stays above it, and one after the chain stays before the semicolon.
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
        /// The chain a returned expression composes, with the changes planned inside it: <c>chain</c> from
        /// <c>chain.Build()</c>, or the expression itself, without the trivia around it and the parentheses, which a
        /// statement cannot start with. Also the trivia before and after the chain, which can hold a directive or
        /// comment that goes with what is removed, such as one before <c>.Build()</c>.
        /// </summary>
        private (ExpressionSyntax Chain, SyntaxTriviaList Before, SyntaxTriviaList After) ChainOf(
            ExpressionSyntax returned
        )
        {
            var chain = Unwrap(
                returnsChain
                    ? returned
                    : ((MemberAccessExpressionSyntax)((InvocationExpressionSyntax)returned).Expression).Expression
            );
            var before = new List<SyntaxTrivia>();
            var after = new List<SyntaxTrivia>(chain.GetTrailingTrivia());
            foreach (var token in returned.DescendantTokens())
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
        /// The <c>ExternalStage</c> call a send and its reply handler become, on the send's receiver, laid out as the
        /// send's arguments were: on one line, or one per line. Comments around the arguments it keeps go with them.
        /// </summary>
        private InvocationExpressionSyntax ExternalStageCall(ExternalStagePlan plan)
        {
            var access = (MemberAccessExpressionSyntax)plan.Send.Expression;
            var arguments = new List<(string? Name, ExpressionSyntax Value, List<SyntaxTrivia> Comments)>
            {
                Carried(null, plan.Work),
                Carried(null, plan.OnMessage),
                (
                    "timeout",
                    Kept(Visit(plan.Timeout), plan.Timeout).WithoutTrivia(),
                    [
                        .. plan.Mailbox.GetLeadingTrivia().Where(IsComment),
                        .. plan.Timeout.GetLeadingTrivia().Concat(plan.Timeout.GetTrailingTrivia()).Where(IsComment),
                    ]
                ),
                Carried("onTimeout", plan.OnClosed),
            };
            if (plan.Options is { } options)
            {
                arguments.Add(Carried("options", options));
            }

            var lines = new[] { plan.Send.ArgumentList, plan.Handler.ArgumentList }.FirstOrDefault(OnOwnLines);
            var multiline = lines is not null || arguments.Any(static argument => argument.Comments.Count > 0);
            var endOfLine = EndOfLine(plan.Send);
            var nameIndent = LineIndentation(access.Name.Identifier);
            var indent = lines is not null
                ? Whitespace(lines.Arguments[0].GetLeadingTrivia())
                : SyntaxFactory.Whitespace(nameIndent + "    ");
            var closeIndent = lines is not null
                ? Whitespace(lines.CloseParenToken.LeadingTrivia)
                : SyntaxFactory.Whitespace(nameIndent);

            var built = new List<ArgumentSyntax>();
            foreach (var (name, value, comments) in arguments)
            {
                var argument = SyntaxFactory.Argument(value);
                if (name is not null)
                {
                    argument = argument.WithNameColon(
                        SyntaxFactory.NameColon(
                            SyntaxFactory.IdentifierName(name),
                            SyntaxFactory.Token(SyntaxKind.ColonToken).WithTrailingTrivia(SyntaxFactory.Space)
                        )
                    );
                }

                var leading = new List<SyntaxTrivia>();
                foreach (var comment in comments)
                {
                    leading.AddRange(multiline ? [indent, comment, endOfLine] : [comment, SyntaxFactory.Space]);
                }

                if (multiline)
                {
                    leading.Add(indent);
                }

                built.Add(argument.WithLeadingTrivia(leading));
            }

            if (multiline)
            {
                built[^1] = built[^1].WithTrailingTrivia(endOfLine);
            }

            var separators = Enumerable.Repeat(
                SyntaxFactory
                    .Token(SyntaxKind.CommaToken)
                    .WithTrailingTrivia(multiline ? endOfLine : SyntaxFactory.Space),
                built.Count - 1
            );
            var end = (plan.SameChain ? plan.Handler : plan.Send).ArgumentList.CloseParenToken;
            var argumentList = SyntaxFactory.ArgumentList(
                plan.Send.ArgumentList.OpenParenToken.WithTrailingTrivia(
                    multiline ? SyntaxFactory.TriviaList(endOfLine) : default
                ),
                SyntaxFactory.SeparatedList(built, separators),
                SyntaxFactory
                    .Token(SyntaxKind.CloseParenToken)
                    .WithLeadingTrivia(multiline ? SyntaxFactory.TriviaList(closeIndent) : default)
                    .WithTrailingTrivia(end.TrailingTrivia)
            );
            return SyntaxFactory.InvocationExpression(
                access
                    .WithExpression(Kept(Visit(access.Expression), access.Expression))
                    .WithName(SyntaxFactory.IdentifierName("ExternalStage").WithTriviaFrom(access.Name)),
                argumentList
            );
        }

        /// <summary>
        /// The argument's value with its changes, without the name it was passed by, and the comments around it.
        /// </summary>
        private (string? Name, ExpressionSyntax Value, List<SyntaxTrivia> Comments) Carried(
            string? name,
            ArgumentSyntax argument
        ) =>
            (
                name,
                Kept(Visit(argument.Expression), argument.Expression).WithoutTrivia(),
                [
                    .. argument
                        .DescendantTrivia()
                        .Where(trivia => IsComment(trivia) && !argument.Expression.Span.Contains(trivia.Span)),
                ]
            );

        private static bool OnOwnLines(ArgumentListSyntax list) =>
            list.Arguments.Count > 0
            && list.OpenParenToken.TrailingTrivia.Any(static trivia => trivia.IsKind(SyntaxKind.EndOfLineTrivia));

        private static SyntaxTrivia Whitespace(SyntaxTriviaList trivia) =>
            trivia.LastOrDefault(static t => t.IsKind(SyntaxKind.WhitespaceTrivia)) is var whitespace
            && whitespace.IsKind(SyntaxKind.WhitespaceTrivia)
                ? whitespace
                : SyntaxFactory.Whitespace("");

        /// <summary>
        /// The whitespace the token's line starts with.
        /// </summary>
        private static string LineIndentation(SyntaxToken token)
        {
            var text = token.SyntaxTree?.GetText() ?? throw new InvalidOperationException("A token outside a tree.");
            var line = text.Lines.GetLineFromPosition(token.SpanStart).ToString();
            return line[..(line.Length - line.TrimStart().Length)];
        }

        /// <summary>
        /// The line break the file uses.
        /// </summary>
        private static SyntaxTrivia EndOfLine(SyntaxNode node) =>
            node
                .SyntaxTree.GetRoot()
                .DescendantTrivia()
                .FirstOrDefault(static trivia => trivia.IsKind(SyntaxKind.EndOfLineTrivia))
                is var lineBreak
            && lineBreak.IsKind(SyntaxKind.EndOfLineTrivia)
                ? lineBreak
                : SyntaxFactory.LineFeed;

        /// <summary>
        /// The rewritten form of <paramref name="original"/>, which keeps its kind.
        /// </summary>
        public static T Kept<T>(SyntaxNode? rewritten, T original)
            where T : SyntaxNode =>
            rewritten as T
            ?? throw new InvalidOperationException($"Rewriting changed the kind of a {original.Kind()}.");
    }

    /// <summary>
    /// The method with an empty block for its expression body, keeping a comment written in the expression body.
    /// </summary>
    private static MethodDeclarationSyntax WithEmptyBody(MethodDeclarationSyntax method)
    {
        var semicolon = method.SemicolonToken;
        var kept = Keep(
                method
                    .ParameterList.CloseParenToken.TrailingTrivia.Concat(
                        method.ExpressionBody?.DescendantTrivia() ?? []
                    )
                    .Concat(semicolon.LeadingTrivia)
            )
            .SkipWhile(static trivia => trivia.IsKind(SyntaxKind.WhitespaceTrivia))
            .Reverse()
            .SkipWhile(static trivia => trivia.IsKind(SyntaxKind.WhitespaceTrivia))
            .Reverse()
            .ToList();
        return method
            .WithParameterList(
                method.ParameterList.WithCloseParenToken(method.ParameterList.CloseParenToken.WithTrailingTrivia())
            )
            .WithExpressionBody(null)
            .WithSemicolonToken(default)
            .WithBody(
                SyntaxFactory.Block(
                    SyntaxFactory
                        .Token(SyntaxKind.OpenBraceToken)
                        .WithLeadingTrivia(SyntaxFactory.Space)
                        .WithTrailingTrivia(kept.Prepend(SyntaxFactory.Space)),
                    default,
                    SyntaxFactory
                        .Token(SyntaxKind.CloseBraceToken)
                        .WithLeadingTrivia(
                            kept is [.., var last] && !last.IsKind(SyntaxKind.EndOfLineTrivia)
                                ? SyntaxFactory.TriviaList(SyntaxFactory.Space)
                                : default
                        )
                        .WithTrailingTrivia(semicolon.TrailingTrivia)
                )
            );
    }
}
