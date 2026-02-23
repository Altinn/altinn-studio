namespace Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration.ConditionalRenderingRules;

/// <summary>
/// Parses unified diff format into structured objects
/// </summary>
internal sealed class DiffParser
{
    private static readonly char[] s_spaceSeparator = { ' ' };

    /// <summary>
    /// Parse unified diff output into DiffFile structure
    /// </summary>
    public DiffFile ParseUnifiedDiff(string diffOutput, string filePath)
    {
        var diffFile = new DiffFile { FilePath = filePath, Hunks = new List<DiffHunk>() };
        var lines = diffOutput.Split('\n');
        DiffHunk? currentHunk = null;

        foreach (var line in lines)
        {
            // Skip file headers
            if (
                line.StartsWith("diff --git", StringComparison.Ordinal)
                || line.StartsWith("index ", StringComparison.Ordinal)
                || line.StartsWith("---", StringComparison.Ordinal)
                || line.StartsWith("+++", StringComparison.Ordinal)
            )
            {
                continue;
            }

            // Hunk header
            if (line.StartsWith("@@", StringComparison.Ordinal))
            {
                // Save previous hunk
                if (currentHunk != null)
                {
                    diffFile.Hunks.Add(currentHunk);
                }

                // Parse new hunk header
                var header = ParseHunkHeader(line);
                currentHunk = new DiffHunk
                {
                    Header = header,
                    Lines = new List<DiffLine>(),
                    StartLineInOriginal = header.OldStart,
                };
                continue;
            }

            if (currentHunk == null)
            {
                continue;
            }

            // Parse diff line
            if (line.Length == 0)
            {
                // Empty line (context)
                currentHunk.Lines.Add(new DiffLine { Type = DiffLineType.Context, Content = "" });
            }
            else if (line.StartsWith('+'))
            {
                currentHunk.Lines.Add(new DiffLine { Type = DiffLineType.Added, Content = line.Substring(1) });
            }
            else if (line.StartsWith('-'))
            {
                currentHunk.Lines.Add(new DiffLine { Type = DiffLineType.Removed, Content = line.Substring(1) });
            }
            else if (line.StartsWith(' '))
            {
                currentHunk.Lines.Add(new DiffLine { Type = DiffLineType.Context, Content = line.Substring(1) });
            }
            else if (line.StartsWith('\\'))
            {
                // "\ No newline at end of file" - skip
            }
        }

        // Add the last hunk
        if (currentHunk != null)
        {
            diffFile.Hunks.Add(currentHunk);
        }

        return diffFile;
    }

    /// <summary>
    /// Parse hunk header like "@@ -10,5 +10,7 @@"
    /// </summary>
    private HunkHeader ParseHunkHeader(string headerLine)
    {
        // Format: @@ -oldStart,oldCount +newStart,newCount @@
        var parts = headerLine.Split(s_spaceSeparator, StringSplitOptions.RemoveEmptyEntries);

        var oldPart = parts[1].Substring(1); // Remove '-'
        var newPart = parts[2].Substring(1); // Remove '+'

        var oldParts = oldPart.Split(',');
        var newParts = newPart.Split(',');

        return new HunkHeader
        {
            OldStart = int.Parse(oldParts[0], System.Globalization.CultureInfo.InvariantCulture),
            OldCount =
                oldParts.Length > 1 ? int.Parse(oldParts[1], System.Globalization.CultureInfo.InvariantCulture) : 1,
            NewStart = int.Parse(newParts[0], System.Globalization.CultureInfo.InvariantCulture),
            NewCount =
                newParts.Length > 1 ? int.Parse(newParts[1], System.Globalization.CultureInfo.InvariantCulture) : 1,
        };
    }
}

/// <summary>
/// Represents a parsed diff file
/// </summary>
internal sealed class DiffFile
{
    public string FilePath { get; set; } = string.Empty;
    public List<DiffHunk> Hunks { get; set; } = new List<DiffHunk>();
}

/// <summary>
/// Represents a hunk in a diff
/// </summary>
internal sealed class DiffHunk
{
    public HunkHeader Header { get; set; } = new HunkHeader();
    public List<DiffLine> Lines { get; set; } = new List<DiffLine>();
    public int StartLineInOriginal { get; set; }
}

/// <summary>
/// Represents a hunk header with line numbers
/// </summary>
internal sealed class HunkHeader
{
    public int OldStart { get; set; }
    public int OldCount { get; set; }
    public int NewStart { get; set; }
    public int NewCount { get; set; }
}

/// <summary>
/// Represents a single line in a diff
/// </summary>
internal sealed class DiffLine
{
    public DiffLineType Type { get; set; }
    public string Content { get; set; } = string.Empty;
}

/// <summary>
/// Type of diff line
/// </summary>
internal enum DiffLineType
{
    Context,
    Added,
    Removed,
}
