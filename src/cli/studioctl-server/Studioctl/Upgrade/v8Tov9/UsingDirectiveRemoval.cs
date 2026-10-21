using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Removes <c>using</c> directives line by line, keeping intact the comments, preprocessor directives
/// and formatting around them.
/// </summary>
internal static class UsingDirectiveRemoval
{
    public static CompilationUnitSyntax Remove(CompilationUnitSyntax root, UsingDirectiveSyntax[] directives)
    {
        var tracked = root.TrackNodes(directives);
        foreach (var directive in directives)
        {
            var current = Current(tracked, directive);

            // The directive's own line goes, but not a comment or preprocessor directive (such as
            // '#nullable enable') on the lines above it, nor a comment after it on the same line. Those
            // are handed to whatever follows, minus the whitespace that separated them from the code.
            var carriedLeading = current.GetLeadingTrivia().Any(static trivia => !IsBlank(trivia))
                ? current.GetLeadingTrivia()
                : SyntaxTriviaList.Empty;
            var carriedTrailing = current
                .GetTrailingTrivia()
                .Any(static trivia => trivia.IsKind(SyntaxKind.SingleLineCommentTrivia))
                ? new SyntaxTriviaList(
                    current.GetTrailingTrivia().Where(static trivia => !trivia.IsKind(SyntaxKind.WhitespaceTrivia))
                )
                : SyntaxTriviaList.Empty;

            var options = SyntaxRemoveOptions.KeepNoTrivia;
            if (carriedLeading.Count > 0 || carriedTrailing.Count > 0)
            {
                tracked = tracked.ReplaceNode(
                    current,
                    current.WithLeadingTrivia(carriedLeading).WithTrailingTrivia(carriedTrailing)
                );
                current = Current(tracked, directive);
                options = SyntaxRemoveOptions.KeepExteriorTrivia;
            }

            tracked =
                tracked.RemoveNode(current, options)
                ?? throw new InvalidOperationException("Failed to remove using directive");
        }

        return TrimLeadingBlankLines(tracked);
    }

    private static UsingDirectiveSyntax Current(CompilationUnitSyntax tracked, UsingDirectiveSyntax original) =>
        tracked.GetCurrentNode(original) ?? throw new InvalidOperationException("Failed to track using directive");

    /// <summary>
    /// Removing the first directive of a file leaves the blank line that separated it from what
    /// follows at the very top of the file. A file does not start with blank lines, so drop them.
    /// </summary>
    private static CompilationUnitSyntax TrimLeadingBlankLines(CompilationUnitSyntax root)
    {
        var firstToken = root.GetFirstToken(includeZeroWidth: true);
        var leading = firstToken.LeadingTrivia;

        var blankCount = 0;
        var lastLineBreak = -1;
        while (blankCount < leading.Count && IsBlank(leading[blankCount]))
        {
            if (leading[blankCount].IsKind(SyntaxKind.EndOfLineTrivia))
                lastLineBreak = blankCount;
            blankCount++;
        }

        if (lastLineBreak < 0)
            return root;

        var trimmed = new SyntaxTriviaList(leading.Skip(lastLineBreak + 1));
        return root.ReplaceToken(firstToken, firstToken.WithLeadingTrivia(trimmed));
    }

    private static bool IsBlank(SyntaxTrivia trivia) =>
        trivia.IsKind(SyntaxKind.WhitespaceTrivia) || trivia.IsKind(SyntaxKind.EndOfLineTrivia);
}
