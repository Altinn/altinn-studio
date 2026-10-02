namespace Altinn.Studio.Cli.Upgrade.v8Tov9.PdfServiceTaskMigration;

/// <summary>
/// The files planned for a UI folder, by path relative to it (with forward slashes). Writing never
/// overwrites: a folder left behind by an interrupted run, holding nothing but files identical to planned
/// ones, is completed rather than treated as a collision, so the migration can be re-run.
/// </summary>
internal sealed class UiFolderFiles
{
    private readonly SortedDictionary<string, byte[]> _files;

    public UiFolderFiles(IEnumerable<KeyValuePair<string, byte[]>> files)
    {
        _files = new SortedDictionary<string, byte[]>(StringComparer.Ordinal);
        foreach (var (path, content) in files)
            _files.Add(path, content);
    }

    /// <summary>A byte-for-byte copy of every file in <paramref name="folder"/>.</summary>
    public static UiFolderFiles CopyOf(string folder) =>
        new(
            Directory
                .EnumerateFiles(folder, "*", SearchOption.AllDirectories)
                .Select(file => KeyValuePair.Create(RelativePath(folder, file), File.ReadAllBytes(file)))
        );

    /// <summary>
    /// Whether the files can be written to <paramref name="folder"/> without overwriting anything: it does
    /// not exist, or holds only files identical to planned ones.
    /// </summary>
    public bool CanWriteTo(string folder) =>
        !File.Exists(folder)
        && (
            !Directory.Exists(folder)
            || Directory
                .EnumerateFiles(folder, "*", SearchOption.AllDirectories)
                .All(file =>
                    _files.TryGetValue(RelativePath(folder, file), out var content)
                    && File.ReadAllBytes(file).AsSpan().SequenceEqual(content)
                )
        );

    /// <summary>
    /// Writes every planned file <paramref name="folder"/> does not have yet. Throws if a file there differs
    /// from its plan, which <see cref="CanWriteTo"/> rules out.
    /// </summary>
    public void WriteTo(string folder)
    {
        foreach (var (relativePath, content) in _files)
        {
            var path = Path.Combine(folder, relativePath);
            if (Path.GetDirectoryName(path) is { } directory)
                Directory.CreateDirectory(directory);

            if (!File.Exists(path))
                File.WriteAllBytes(path, content);
            else if (!File.ReadAllBytes(path).AsSpan().SequenceEqual(content))
                throw new InvalidOperationException($"Cannot write {path}, because it exists with other content.");
        }
    }

    private static string RelativePath(string folder, string file) =>
        Path.GetRelativePath(folder, file).Replace('\\', '/');
}
