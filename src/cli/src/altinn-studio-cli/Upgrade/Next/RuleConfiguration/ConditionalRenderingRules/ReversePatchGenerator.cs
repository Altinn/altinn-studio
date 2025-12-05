using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Altinn.Studio.Cli.Upgrade.Next.RuleConfiguration.ConditionalRenderingRules;

/// <summary>
/// Generates reverse patches to undo whitespace-only changes
/// </summary>
internal class ReversePatchGenerator
{
    /// <summary>
    /// Generate a reverse patch from whitespace-only hunks
    /// </summary>
    public string GenerateReversePatch(
        List<DiffFile> diffFiles,
        Dictionary<DiffHunk, ChunkClassification> classifications
    )
    {
        var patchBuilder = new StringBuilder();

        foreach (var diffFile in diffFiles)
        {
            var whitespaceOnlyHunks = diffFile
                .Hunks.Where(h => classifications.ContainsKey(h) && classifications[h].IsWhitespaceOnly)
                .ToList();

            if (whitespaceOnlyHunks.Count == 0)
            {
                continue;
            }

            // Add file header
            patchBuilder.AppendLine($"--- a/{diffFile.FilePath}");
            patchBuilder.AppendLine($"+++ b/{diffFile.FilePath}");

            // Recalculate line numbers for reversed hunks
            var adjustedHunks = RecalculateLineNumbers(diffFile.Hunks, classifications);

            // Add each reversed hunk
            foreach (var hunk in whitespaceOnlyHunks)
            {
                var adjustedHeader = adjustedHunks[hunk];
                var reversedHunk = ReverseHunk(hunk, adjustedHeader);
                patchBuilder.Append(reversedHunk);
            }
        }

        return patchBuilder.ToString();
    }

    /// <summary>
    /// Recalculate line numbers for hunks when only some hunks are being reversed
    /// </summary>
    private Dictionary<DiffHunk, HunkHeader> RecalculateLineNumbers(
        List<DiffHunk> allHunks,
        Dictionary<DiffHunk, ChunkClassification> classifications
    )
    {
        var adjustedHeaders = new Dictionary<DiffHunk, HunkHeader>();
        int cumulativeOffsetFromPatchedHunks = 0; // Line number shift from patches applied so far
        int offsetFromContentChanges = 0; // Offset from content changes we're keeping

        foreach (var hunk in allHunks)
        {
            bool isWhitespaceOnly = classifications.ContainsKey(hunk) && classifications[hunk].IsWhitespaceOnly;

            if (isWhitespaceOnly)
            {
                // For whitespace-only hunks we're reversing:
                // - OldStart: Where git will find this hunk after applying previous patches in this patch file
                //   = NewStart from original + cumulativeOffsetFromPatchedHunks
                // - NewStart: Where it will end up after reverting ALL whitespace hunks but keeping content changes
                //   = OldStart from original + offsetFromContentChanges
                var adjustedHeader = new HunkHeader
                {
                    OldStart = hunk.Header.NewStart + cumulativeOffsetFromPatchedHunks,
                    OldCount = hunk.Header.NewCount,
                    NewStart = hunk.Header.OldStart + offsetFromContentChanges,
                    NewCount = hunk.Header.OldCount,
                };
                adjustedHeaders[hunk] = adjustedHeader;

                // Update cumulative offset: this patch removes lines
                int linesAddedByOriginalHunk = hunk.Header.NewCount - hunk.Header.OldCount;
                cumulativeOffsetFromPatchedHunks -= linesAddedByOriginalHunk;
            }
            else
            {
                // Content change hunk we're NOT reversing: it stays in the file
                int linesAddedByOriginalHunk = hunk.Header.NewCount - hunk.Header.OldCount;

                // This change will remain in the final file, so it contributes to the offset
                offsetFromContentChanges += linesAddedByOriginalHunk;
            }
        }

        return adjustedHeaders;
    }

    /// <summary>
    /// Create a reversed hunk (swap + and -, adjust line numbers)
    /// </summary>
    private string ReverseHunk(DiffHunk hunk, HunkHeader adjustedHeader)
    {
        var builder = new StringBuilder();

        // Use the adjusted header with recalculated line numbers
        var reversedHeader = FormatHunkHeader(adjustedHeader, reversed: false);
        builder.AppendLine(reversedHeader);

        // Reverse the lines (swap + and -)
        foreach (var line in hunk.Lines)
        {
            switch (line.Type)
            {
                case DiffLineType.Added:
                    // Added becomes removed
                    builder.AppendLine($"-{line.Content}");
                    break;
                case DiffLineType.Removed:
                    // Removed becomes added
                    builder.AppendLine($"+{line.Content}");
                    break;
                case DiffLineType.Context:
                    // Context stays the same
                    builder.AppendLine($" {line.Content}");
                    break;
            }
        }

        return builder.ToString();
    }

    /// <summary>
    /// Format a hunk header for the reverse patch
    /// </summary>
    private string FormatHunkHeader(HunkHeader header, bool reversed)
    {
        if (reversed)
        {
            // Swap old and new when reversing
            return $"@@ -{header.NewStart},{header.NewCount} +{header.OldStart},{header.OldCount} @@";
        }
        else
        {
            return $"@@ -{header.OldStart},{header.OldCount} +{header.NewStart},{header.NewCount} @@";
        }
    }
}
