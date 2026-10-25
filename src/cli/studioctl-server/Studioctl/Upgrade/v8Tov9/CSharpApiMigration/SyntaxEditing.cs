using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>Syntax edits the C# migrations share, made so the edited code keeps the layout of the code around it.</summary>
internal static class SyntaxEditing
{
    /// <summary>The declaration of <paramref name="method"/> in the scanned files, or <c>null</c> when it has none there.</summary>
    public static (ScannedCSharpFile File, MethodDeclarationSyntax Method)? Locate(
        IMethodSymbol method,
        IReadOnlyDictionary<SyntaxTree, ScannedCSharpFile> filesByTree
    )
    {
        foreach (var reference in method.DeclaringSyntaxReferences)
        {
            if (
                filesByTree.TryGetValue(reference.SyntaxTree, out var file)
                && file.Root.FindNode(reference.Span) is MethodDeclarationSyntax declaration
            )
            {
                return (file, declaration);
            }
        }

        return null;
    }

    /// <summary>Whether the method's body contains the identifier, by name.</summary>
    public static bool BodyUses(MethodDeclarationSyntax method, string identifier) =>
        ((SyntaxNode?)method.Body ?? method.ExpressionBody) is { } body
        && body.DescendantTokens()
            .Any(token => token.IsKind(SyntaxKind.IdentifierToken) && token.ValueText == identifier);

    /// <summary>
    /// The method with <paramref name="statements"/> as its first statements. An expression body becomes a block that
    /// runs them and then returns (or throws) the expression.
    /// </summary>
    public static MethodDeclarationSyntax WithStatementsFirst(
        MethodDeclarationSyntax method,
        IReadOnlyList<StatementSyntax> statements,
        string lineEnding
    )
    {
        if (method.Body is { } body)
        {
            var indentation =
                body.Statements.Count > 0
                    ? body.Statements[0]
                        .GetLeadingTrivia()
                        .LastOrDefault(static t => t.IsKind(SyntaxKind.WhitespaceTrivia))
                    : SyntaxFactory.Whitespace(BodyIndentation(method));
            var onItsOwnLine =
                body.Statements.Count == 0
                || body.OpenBraceToken.TrailingTrivia.Any(SyntaxKind.EndOfLineTrivia)
                || body.Statements[0].GetLeadingTrivia().Any(SyntaxKind.EndOfLineTrivia);
            var inserted = statements.Select(statement =>
                statement
                    .WithLeadingTrivia(Indented(indentation))
                    .WithTrailingTrivia(
                        onItsOwnLine
                            ? SyntaxFactory.TriviaList(SyntaxFactory.EndOfLine(lineEnding))
                            : SyntaxFactory.TriviaList()
                    )
            );
            return method.WithBody(body.WithStatements(body.Statements.InsertRange(0, inserted)));
        }

        if (method.ExpressionBody is not { } arrow)
        {
            return method;
        }

        var semicolon = SyntaxFactory.Token(SyntaxKind.SemicolonToken);
        StatementSyntax result = arrow.Expression is ThrowExpressionSyntax thrown
            ? SyntaxFactory.ThrowStatement(
                SyntaxFactory.Token(SyntaxKind.ThrowKeyword).WithTrailingTrivia(SyntaxFactory.Space),
                thrown.Expression.WithoutLeadingTrivia(),
                semicolon
            )
            : SyntaxFactory.ReturnStatement(
                SyntaxFactory.Token(SyntaxKind.ReturnKeyword).WithTrailingTrivia(SyntaxFactory.Space),
                arrow.Expression.WithoutLeadingTrivia(),
                semicolon
            );
        return WithBlockBody(method, [.. statements, result], lineEnding);
    }

    /// <summary>
    /// The method with a block body of <paramref name="statements"/>, one per line, in place of its expression body;
    /// the block starts on a line of its own.
    /// </summary>
    public static MethodDeclarationSyntax WithBlockBody(
        MethodDeclarationSyntax method,
        IReadOnlyList<StatementSyntax> statements,
        string lineEnding
    )
    {
        var methodIndentation = Indentation(method);
        var bodyIndentation = BodyIndentation(method);
        var block = SyntaxFactory.Block(
            SyntaxFactory.Token(
                SyntaxFactory.TriviaList(
                    SyntaxFactory.EndOfLine(lineEnding),
                    SyntaxFactory.Whitespace(methodIndentation)
                ),
                SyntaxKind.OpenBraceToken,
                SyntaxFactory.TriviaList(SyntaxFactory.EndOfLine(lineEnding))
            ),
            SyntaxFactory.List(
                statements.Select(statement =>
                    statement
                        .WithLeadingTrivia(SyntaxFactory.Whitespace(bodyIndentation))
                        .WithTrailingTrivia(SyntaxFactory.EndOfLine(lineEnding))
                )
            ),
            SyntaxFactory.Token(
                SyntaxFactory.TriviaList(SyntaxFactory.Whitespace(methodIndentation)),
                SyntaxKind.CloseBraceToken,
                method.SemicolonToken.TrailingTrivia
            )
        );

        if (method.ExpressionBody is not { } arrow)
        {
            return method.WithBody(block);
        }

        // Whatever separated the signature from the arrow goes; the block starts on a line of its own.
        var beforeArrow = arrow.ArrowToken.GetPreviousToken();
        var trimmed = method.ReplaceToken(
            beforeArrow,
            beforeArrow.WithTrailingTrivia(
                beforeArrow
                    .TrailingTrivia.Reverse()
                    .SkipWhile(static t =>
                        t.IsKind(SyntaxKind.WhitespaceTrivia) || t.IsKind(SyntaxKind.EndOfLineTrivia)
                    )
                    .Reverse()
            )
        );
        return trimmed.WithExpressionBody(null).WithSemicolonToken(default).WithBody(block);
    }

    /// <summary>Removes nodes that have lines of their own, keeping comments on the lines above them.</summary>
    public static CompilationUnitSyntax RemoveLines(CompilationUnitSyntax root, IReadOnlyList<SyntaxNode> nodes)
    {
        root = root.TrackNodes(nodes);
        foreach (var original in nodes)
        {
            var node = Current(root, original);
            var leading = node.GetLeadingTrivia();
            var options = SyntaxRemoveOptions.KeepNoTrivia;
            if (
                leading.Any(static t => !t.IsKind(SyntaxKind.WhitespaceTrivia) && !t.IsKind(SyntaxKind.EndOfLineTrivia))
            )
            {
                // The comments stay, but not the node's indentation, which would double the next line's.
                var indentation = leading
                    .Reverse()
                    .TakeWhile(static t => t.IsKind(SyntaxKind.WhitespaceTrivia))
                    .Count();
                root = root.ReplaceNode(node, node.WithLeadingTrivia(leading.Take(leading.Count - indentation)));
                node = Current(root, original);
                options = SyntaxRemoveOptions.KeepLeadingTrivia;
            }

            root = root.RemoveNode(node, options) ?? throw new InvalidOperationException("Failed to remove a line");
        }

        return root;
    }

    private static SyntaxNode Current(CompilationUnitSyntax root, SyntaxNode original) =>
        root.GetCurrentNode(original) ?? throw new InvalidOperationException("Failed to track a line");

    /// <summary>The whitespace that starts the line the member's first token is on.</summary>
    public static string Indentation(MemberDeclarationSyntax member) =>
        member
            .GetLeadingTrivia()
            .Reverse()
            .TakeWhile(static t => !t.IsKind(SyntaxKind.EndOfLineTrivia))
            .LastOrDefault(static t => t.IsKind(SyntaxKind.WhitespaceTrivia))
            .ToString();

    /// <summary>One level deeper than the member, with the member's kind of whitespace.</summary>
    public static string BodyIndentation(MemberDeclarationSyntax member)
    {
        var indentation = Indentation(member);
        return indentation + (indentation.Contains('\t') ? "\t" : "    ");
    }

    /// <summary>The file's line ending, so inserted lines match the lines around them.</summary>
    public static string LineEnding(CompilationUnitSyntax root) =>
        root.DescendantTrivia().FirstOrDefault(static t => t.IsKind(SyntaxKind.EndOfLineTrivia)).ToString()
            is { Length: > 0 } ending
            ? ending
            : "\n";

    public static SyntaxTriviaList Indented(SyntaxTrivia indentation) =>
        indentation == default ? SyntaxFactory.TriviaList() : SyntaxFactory.TriviaList(indentation);
}
