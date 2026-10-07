namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>Pairs scanned files with compiler inputs without merging distinct or ambiguous paths.</summary>
internal static class SourceFilePaths
{
    public static IReadOnlyDictionary<string, T> Match<T>(
        IEnumerable<string> sourcePaths,
        IEnumerable<T> candidates,
        Func<T, string?> candidatePath
    )
    {
        var sources = sourcePaths.Select(path => (Original: path, Full: Path.GetFullPath(path))).ToArray();
        var targets = new List<(T Item, string Full)>();
        foreach (var candidate in candidates)
        {
            if (candidatePath(candidate) is { Length: > 0 } path)
            {
                targets.Add((candidate, Path.GetFullPath(path)));
            }
        }

        var exactTargets = targets.ToLookup(target => target.Full, StringComparer.Ordinal);
        var foldedSources = sources.ToLookup(source => source.Full, StringComparer.OrdinalIgnoreCase);
        var foldedTargets = targets.ToLookup(target => target.Full, StringComparer.OrdinalIgnoreCase);
        var matches = new Dictionary<string, T>(StringComparer.Ordinal);
        foreach (var sourceGroup in sources.GroupBy(source => source.Full, StringComparer.Ordinal))
        {
            if (sourceGroup.Count() != 1)
            {
                continue;
            }
            var source = sourceGroup.Single();
            var exact = exactTargets[source.Full].ToArray();
            if (exact.Length == 1)
            {
                matches.Add(source.Original, exact[0].Item);
            }
            else if (
                exact.Length == 0
                && (OperatingSystem.IsWindows() || OperatingSystem.IsMacOS())
                && foldedSources[source.Full].Count() == 1
                && foldedTargets[source.Full].Count() == 1
            )
            {
                var target = foldedTargets[source.Full].Single();
                if (SameExistingFile(source.Full, target.Full))
                {
                    matches.Add(source.Original, target.Item);
                }
            }
        }
        return matches;
    }

    private static bool SameExistingFile(string first, string second)
    {
        // macOS volumes (and Windows directories) can be case-sensitive. Unambiguous input lists
        // alone do not prove that differently cased paths refer to the same existing file.
        if (!File.Exists(first) || !File.Exists(second))
        {
            return false;
        }
        var firstSpelling = ExistingSpelling(first);
        return firstSpelling is not null && firstSpelling == ExistingSpelling(second);
    }

    private static string? ExistingSpelling(string path)
    {
        try
        {
            var root =
                Path.GetPathRoot(path) ?? throw new ArgumentException("Expected an absolute file path.", nameof(path));
            var current = OperatingSystem.IsWindows() ? root.ToUpperInvariant() : root;
            foreach (
                var component in path[root.Length..]
                    .Split(Path.DirectorySeparatorChar, StringSplitOptions.RemoveEmptyEntries)
            )
            {
                var entries = Directory
                    .EnumerateFileSystemEntries(current)
                    .Where(entry =>
                        string.Equals(Path.GetFileName(entry), component, StringComparison.OrdinalIgnoreCase)
                    )
                    .ToArray();
                var spelling =
                    entries.FirstOrDefault(entry => Path.GetFileName(entry) == component)
                    ?? (entries.Length == 1 ? entries[0] : null);
                if (spelling is null)
                {
                    return null;
                }
                current = spelling;
            }
            return current;
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            return null;
        }
    }
}
