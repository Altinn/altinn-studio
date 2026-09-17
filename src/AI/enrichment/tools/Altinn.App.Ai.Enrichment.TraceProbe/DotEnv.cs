namespace Altinn.App.Ai.Enrichment.TraceProbe;

/// <summary>
/// Reads a <c>.env</c> file into the process environment.
///
/// Deliberately minimal — this exists so a Langfuse secret key can sit in a
/// gitignored file next to the repo instead of in a shell history or a committed
/// settings file. It is not a general dotenv implementation: no interpolation, no
/// multi-line values.
/// </summary>
public static class DotEnv
{
    /// <summary>
    /// Applies a file's entries to the current process. A variable already set in
    /// the real environment wins, so an explicit export still overrides the file.
    /// </summary>
    public static void Load(string path)
    {
        foreach (var (key, value) in Parse(File.ReadLines(path)))
        {
            if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable(key)))
                Environment.SetEnvironmentVariable(key, value);
        }
    }

    /// <summary>
    /// Parses <c>KEY=value</c> lines. Blank lines and <c>#</c> comments are skipped,
    /// a leading <c>export</c> is tolerated, and a value wrapped in matching quotes is
    /// unwrapped — all three appear in files people paste together by hand.
    /// </summary>
    public static IReadOnlyDictionary<string, string> Parse(IEnumerable<string> lines)
    {
        var values = new Dictionary<string, string>(StringComparer.Ordinal);

        foreach (var raw in lines)
        {
            var line = raw.Trim();
            if (line.Length == 0 || line.StartsWith('#'))
                continue;

            if (line.StartsWith("export ", StringComparison.Ordinal))
                line = line["export ".Length..].TrimStart();

            // Split on the first '=' only: a secret may legitimately contain more.
            var separator = line.IndexOf('=');
            if (separator <= 0)
                continue;

            var key = line[..separator].Trim();
            var value = line[(separator + 1)..].Trim();

            if (value.Length >= 2
                && (value[0] == '"' || value[0] == '\'')
                && value[^1] == value[0])
            {
                value = value[1..^1];
            }

            if (key.Length > 0)
                values[key] = value;
        }

        return values;
    }
}
