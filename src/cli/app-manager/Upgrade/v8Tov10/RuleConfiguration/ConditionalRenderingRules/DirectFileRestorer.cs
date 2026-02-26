using System.Text;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration.ConditionalRenderingRules;

/// <summary>
/// Directly restores whitespace-only changes by manipulating files line-by-line
/// </summary>
internal sealed class DirectFileRestorer
{
    private static readonly string[] LineSeparators = ["\r\n", "\n"];
    private readonly IGitRepositoryService _gitService;

    public DirectFileRestorer(IGitRepositoryService gitService)
    {
        _gitService = gitService;
    }

    /// <summary>
    /// Restore whitespace-only changes for a single file
    /// </summary>
    public void RestoreWhitespaceOnlyChanges(
        DiffFile diffFile,
        Dictionary<DiffHunk, ChunkClassification> classifications,
        string repoRoot
    )
    {
        // Validate that we have whitespace-only hunks to restore
        var whitespaceOnlyHunks = diffFile
            .Hunks.Where(h => classifications.ContainsKey(h) && classifications[h].IsWhitespaceOnly)
            .ToList();

        if (whitespaceOnlyHunks.Count == 0)
        {
            return;
        }

        // Get file path relative to repo root
        var fullFilePath = Path.Combine(repoRoot, diffFile.FilePath);

        // Read original content from HEAD
        string originalContent = _gitService.GetFileContentFromHead(repoRoot, diffFile.FilePath);
        string[] originalLines = SplitIntoLines(originalContent);

        // Build the result by processing hunks
        var resultLines = BuildRestoredContent(originalLines, diffFile.Hunks, classifications);

        // Write the result back to the file
        // Preserve the original line ending style
        var lineEnding = DetectLineEnding(originalContent);
        var resultContent = string.Join(lineEnding, resultLines);

        // Preserve trailing newline if original had one
        if (originalContent.EndsWith('\n') || originalContent.EndsWith("\r\n", StringComparison.Ordinal))
        {
            resultContent += lineEnding;
        }

        File.WriteAllText(fullFilePath, resultContent, Encoding.UTF8);
    }

    /// <summary>
    /// Build restored content by selectively reverting whitespace-only hunks
    /// </summary>
    private List<string> BuildRestoredContent(
        string[] originalLines,
        List<DiffHunk> hunks,
        Dictionary<DiffHunk, ChunkClassification> classifications
    )
    {
        var result = new List<string>();

        // Track our position in the original file
        int originalLineIndex = 0;

        foreach (var hunk in hunks)
        {
            bool isWhitespaceOnly = classifications.ContainsKey(hunk) && classifications[hunk].IsWhitespaceOnly;

            // Add all lines from original file before this hunk starts
            int hunkStartLine = hunk.StartLineInOriginal - 1; // Convert to 0-based index
            while (originalLineIndex < hunkStartLine && originalLineIndex < originalLines.Length)
            {
                result.Add(originalLines[originalLineIndex]);
                originalLineIndex++;
            }

            if (isWhitespaceOnly)
            {
                // REVERT: Use original lines (restore original whitespace)
                for (int i = 0; i < hunk.Header.OldCount && originalLineIndex < originalLines.Length; i++)
                {
                    result.Add(originalLines[originalLineIndex]);
                    originalLineIndex++;
                }
            }
            else
            {
                // KEEP: Use modified lines (preserve content changes)
                var modifiedLinesFromHunk = ExtractModifiedLinesFromHunk(hunk);
                result.AddRange(modifiedLinesFromHunk);

                // Skip the original lines that were replaced
                originalLineIndex += hunk.Header.OldCount;
            }
        }

        // Add any remaining lines after the last hunk
        while (originalLineIndex < originalLines.Length)
        {
            result.Add(originalLines[originalLineIndex]);
            originalLineIndex++;
        }

        return result;
    }

    /// <summary>
    /// Extract the modified lines from a content-change hunk
    /// </summary>
    private List<string> ExtractModifiedLinesFromHunk(DiffHunk hunk)
    {
        var modifiedLines = new List<string>();

        foreach (var line in hunk.Lines)
        {
            switch (line.Type)
            {
                case DiffLineType.Context:
                case DiffLineType.Added:
                    // Include context and added lines in the result
                    modifiedLines.Add(line.Content);
                    break;
                case DiffLineType.Removed:
                    // Skip removed lines - they're being replaced by added lines
                    break;
            }
        }

        return modifiedLines;
    }

    /// <summary>
    /// Split content into lines, preserving empty lines
    /// </summary>
    private string[] SplitIntoLines(string content)
    {
        if (string.IsNullOrEmpty(content))
        {
            return Array.Empty<string>();
        }

        // Split on both \r\n and \n to handle different line endings
        // Use StringSplitOptions.None to preserve empty lines
        var lines = content.Split(LineSeparators, StringSplitOptions.None);

        // If the content ends with a newline, Split will add an empty element at the end
        // Remove it to avoid adding an extra line
        if (lines.Length > 0 && string.IsNullOrEmpty(lines[^1]))
        {
            return lines[..^1];
        }

        return lines;
    }

    /// <summary>
    /// Detect the line ending style used in the content
    /// </summary>
    private string DetectLineEnding(string content)
    {
        if (content.Contains("\r\n", StringComparison.Ordinal))
        {
            return "\r\n"; // Windows style
        }

        if (content.Contains('\n'))
        {
            return "\n"; // Unix style
        }

        // Default to Unix style if no line endings found
        return "\n";
    }
}
