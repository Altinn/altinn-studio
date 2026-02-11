using System.Text.RegularExpressions;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration.ConditionalRenderingRules;

/// <summary>
/// Classifies diff hunks as whitespace-only or content changes
/// </summary>
internal sealed class ChunkClassifier
{
    /// <summary>
    /// Determine if a hunk contains only whitespace changes
    /// </summary>
    public ChunkClassification ClassifyHunk(DiffHunk hunk)
    {
        var removedLines = hunk.Lines.Where(l => l.Type == DiffLineType.Removed).ToList();
        var addedLines = hunk.Lines.Where(l => l.Type == DiffLineType.Added).ToList();

        // If no changes, it's context only (shouldn't happen in practice)
        if (removedLines.Count == 0 && addedLines.Count == 0)
        {
            return new ChunkClassification
            {
                IsWhitespaceOnly = true,
                Reason = "No changes in hunk",
                Type = ClassificationType.WhitespaceOnly,
            };
        }

        // Check for BOM change at line 1
        if (IsBomChange(hunk, removedLines, addedLines))
        {
            return new ChunkClassification
            {
                IsWhitespaceOnly = true,
                Reason = "BOM character change at line 1",
                Type = ClassificationType.BomChange,
            };
        }

        // Check for trailing newline change
        if (IsTrailingNewlineChange(removedLines, addedLines))
        {
            return new ChunkClassification
            {
                IsWhitespaceOnly = true,
                Reason = "Trailing newline change",
                Type = ClassificationType.TrailingNewline,
            };
        }

        // Normalize and compare content
        // Join all removed lines into one string and normalize
        var normalizedRemovedContent = string.Join(
            "",
            removedLines.Select(l => NormalizeContent(l.Content)).Where(s => !string.IsNullOrEmpty(s))
        );

        // Join all added lines into one string and normalize
        var normalizedAddedContent = string.Join(
            "",
            addedLines.Select(l => NormalizeContent(l.Content)).Where(s => !string.IsNullOrEmpty(s))
        );

        // If normalized content is identical, it's whitespace only
        if (normalizedRemovedContent == normalizedAddedContent)
        {
            return new ChunkClassification
            {
                IsWhitespaceOnly = true,
                Reason = "Content identical after normalization",
                Type = ClassificationType.WhitespaceOnly,
            };
        }

        // Content differs - this is a real change
        return new ChunkClassification
        {
            IsWhitespaceOnly = false,
            Reason = "Content differs after normalization",
            Type = ClassificationType.ContentChange,
        };
    }

    /// <summary>
    /// Normalize a line by removing all whitespace for comparison
    /// </summary>
    private string NormalizeContent(string line)
    {
        if (string.IsNullOrEmpty(line))
        {
            return string.Empty;
        }

        // Remove BOM character
        line = line.Replace("\uFEFF", "");

        // Remove all whitespace (spaces, tabs, newlines)
        line = Regex.Replace(line, @"\s+", "");

        return line;
    }

    /// <summary>
    /// Check if this is a BOM character change at line 1
    /// </summary>
    private bool IsBomChange(DiffHunk hunk, List<DiffLine> removedLines, List<DiffLine> addedLines)
    {
        // BOM changes typically occur at line 1
        if (hunk.StartLineInOriginal != 1)
        {
            return false;
        }

        // Check if we have exactly one removed and one added line
        if (removedLines.Count != 1 || addedLines.Count != 1)
        {
            return false;
        }

        var removed = removedLines[0].Content;
        var added = addedLines[0].Content;

        // Check if one has BOM and the other doesn't
        var removedHasBom = removed.StartsWith('\uFEFF');
        var addedHasBom = added.StartsWith('\uFEFF');

        if (removedHasBom != addedHasBom)
        {
            // Remove BOM and compare
            var removedWithoutBom = removed.Replace("\uFEFF", "");
            var addedWithoutBom = added.Replace("\uFEFF", "");

            return removedWithoutBom == addedWithoutBom;
        }

        return false;
    }

    /// <summary>
    /// Check if this is a trailing newline change (typically at end of file)
    /// </summary>
    private bool IsTrailingNewlineChange(List<DiffLine> removedLines, List<DiffLine> addedLines)
    {
        // Trailing newline changes are usually empty line additions/removals
        // or lines with only whitespace
        if (removedLines.Count == 0 && addedLines.Count == 1 && string.IsNullOrWhiteSpace(addedLines[0].Content))
        {
            return true;
        }

        if (addedLines.Count == 0 && removedLines.Count == 1 && string.IsNullOrWhiteSpace(removedLines[0].Content))
        {
            return true;
        }

        // Also handle the case where both sides have content but it's just whitespace
        if (
            removedLines.All(l => string.IsNullOrWhiteSpace(l.Content))
            && addedLines.All(l => string.IsNullOrWhiteSpace(l.Content))
        )
        {
            return true;
        }

        return false;
    }
}

/// <summary>
/// Classification result for a hunk
/// </summary>
internal sealed class ChunkClassification
{
    public bool IsWhitespaceOnly { get; set; }
    public string Reason { get; set; } = string.Empty;
    public ClassificationType Type { get; set; }
}

/// <summary>
/// Type of classification
/// </summary>
internal enum ClassificationType
{
    WhitespaceOnly,
    ContentChange,
    BomChange,
    TrailingNewline,
    MixedChange,
}
