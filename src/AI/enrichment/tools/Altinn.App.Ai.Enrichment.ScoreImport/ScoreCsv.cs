using System.Globalization;
using System.Security.Cryptography;
using System.Text;

namespace Altinn.App.Ai.Enrichment.ScoreImport;

/// <summary>One judged submission: which instance, what verdict, and why.</summary>
public sealed record ScoreRow
{
    public required string InstanceId { get; init; }
    public required double Value { get; init; }
    public string? Comment { get; init; }
}

/// <summary>
/// Reads the spreadsheet a caseworker hands over. Deliberately small: the input is
/// exported by hand, so the useful behaviour is a precise complaint about row 14
/// rather than support for every CSV dialect.
/// </summary>
public static class ScoreCsv
{
    private static readonly string[] TrueWords = ["1", "true", "ja", "yes", "ok", "korrekt"];
    private static readonly string[] FalseWords = ["0", "false", "nei", "no", "feil"];

    public static IEnumerable<ScoreRow> Read(IEnumerable<string> lines)
    {
        var lineNumber = 0;
        var headerSeen = false;
        var separator = ',';

        foreach (var line in lines)
        {
            lineNumber++;
            if (string.IsNullOrWhiteSpace(line))
                continue;

            // Decided once, from the header. Guessing per line gets it wrong on exactly
            // the file this exists for: a semicolon-separated export whose values use a
            // decimal comma contains both characters.
            if (!headerSeen)
                separator = line.Contains(';') ? ';' : ',';

            var fields = SplitLine(line, separator);

            if (!headerSeen)
            {
                headerSeen = true;
                // The header is required, so a file whose first row is data would
                // otherwise lose that row silently.
                if (fields[0].Trim().Equals("instanceId", StringComparison.OrdinalIgnoreCase))
                    continue;
                throw new FormatException(
                    $"Line {lineNumber}: expected a header row starting with 'instanceId', found '{fields[0]}'.");
            }

            if (fields.Count < 2)
                throw new FormatException($"Line {lineNumber}: expected at least instanceId and value.");

            var instanceId = fields[0].Trim();
            if (instanceId.Length == 0)
                throw new FormatException($"Line {lineNumber}: instanceId is empty.");

            yield return new ScoreRow
            {
                InstanceId = instanceId,
                Value = ParseValue(fields[1].Trim(), lineNumber),
                Comment = fields.Count > 2 && fields[2].Trim().Length > 0 ? fields[2].Trim() : null,
            };
        }

        if (!headerSeen)
            throw new FormatException("The file is empty.");
    }

    /// <summary>
    /// A stable id per (submission, score name, trace), so importing a corrected file
    /// overwrites the earlier verdict instead of stacking a second one beside it.
    /// Hashed because instance ids contain '/' and the id travels in a URL path.
    /// </summary>
    public static string DeterministicScoreId(string instanceId, string scoreName, string traceId)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes($"{instanceId}|{scoreName}|{traceId}"));
        return "import-" + Convert.ToHexString(bytes)[..32].ToLowerInvariant();
    }

    private static double ParseValue(string raw, int lineNumber)
    {
        if (TrueWords.Contains(raw, StringComparer.OrdinalIgnoreCase))
            return 1;
        if (FalseWords.Contains(raw, StringComparer.OrdinalIgnoreCase))
            return 0;

        // Accept both decimal separators: these files come out of Norwegian Excel as
        // often as they come out of a script.
        if (double.TryParse(raw, NumberStyles.Float, CultureInfo.InvariantCulture, out var value)
            || double.TryParse(raw.Replace(',', '.'), NumberStyles.Float, CultureInfo.InvariantCulture, out value))
        {
            return value;
        }

        throw new FormatException(
            $"Line {lineNumber}: '{raw}' is not a value. Use a number, or one of "
            + $"{string.Join('/', TrueWords)} / {string.Join('/', FalseWords)}.");
    }

    /// <summary>
    /// Splits on the given separator, honouring double quotes so a comment may contain
    /// it. Norwegian Excel writes semicolons by default.
    /// </summary>
    private static List<string> SplitLine(string line, char separator)
    {
        var fields = new List<string>();
        var current = new StringBuilder();
        var inQuotes = false;

        for (var i = 0; i < line.Length; i++)
        {
            var c = line[i];
            if (c == '"')
            {
                if (inQuotes && i + 1 < line.Length && line[i + 1] == '"')
                {
                    current.Append('"');
                    i++;
                }
                else
                {
                    inQuotes = !inQuotes;
                }
            }
            else if (c == separator && !inQuotes)
            {
                fields.Add(current.ToString());
                current.Clear();
            }
            else
            {
                current.Append(c);
            }
        }

        fields.Add(current.ToString());
        return fields;
    }
}
