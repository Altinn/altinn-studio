using System.Globalization;
using System.Text.RegularExpressions;

namespace Altinn.Studio.AppDist;

public sealed partial class FileSystemAppDistStore(string rootDirectory) : IAppDistStore
{
    private readonly string _root = Path.GetFullPath(rootDirectory);

    public Task<bool> ContainsAsync(string version, AppDistLayer layer, CancellationToken cancellationToken)
    {
        var (contentDir, marker) = EntryPaths(version, layer);
        return Task.FromResult(Directory.Exists(contentDir) && File.Exists(marker));
    }

    public async Task WriteAsync(
        string version,
        AppDistLayer layer,
        IReadOnlyList<AppDistFileEntry> files,
        CancellationToken cancellationToken
    )
    {
        ArgumentNullException.ThrowIfNull(files);
        var (contentDir, marker) = EntryPaths(version, layer);

        var staging = Path.Combine(_root, "tmp", Guid.NewGuid().ToString("N"));
        try
        {
            Directory.CreateDirectory(staging);
            foreach (var file in files)
            {
                var target = SafeChild(staging, file.Path);
                if (Path.GetDirectoryName(target) is { } parent)
                    Directory.CreateDirectory(parent);
                await File.WriteAllBytesAsync(target, file.Content, cancellationToken);
            }

            Directory.CreateDirectory(Path.Combine(_root, "contents", version));
            File.Delete(marker);
            if (Directory.Exists(contentDir))
                Directory.Delete(contentDir, recursive: true);
            Directory.Move(staging, contentDir);
            await File.WriteAllTextAsync(
                marker,
                DateTimeOffset.UtcNow.ToString("O", CultureInfo.InvariantCulture),
                cancellationToken
            );
        }
        finally
        {
            if (Directory.Exists(staging))
                Directory.Delete(staging, recursive: true);
        }
    }

    public Task<Stream?> OpenFileAsync(
        string version,
        AppDistLayer layer,
        string path,
        CancellationToken cancellationToken
    )
    {
        var (contentDir, _) = EntryPaths(version, layer);
        var target = SafeChild(contentDir, path);
        return Task.FromResult<Stream?>(File.Exists(target) ? File.OpenRead(target) : null);
    }

    public Task<IReadOnlyList<string>> ListFilesAsync(
        string version,
        AppDistLayer layer,
        CancellationToken cancellationToken
    )
    {
        var (contentDir, _) = EntryPaths(version, layer);
        if (!Directory.Exists(contentDir))
            return Task.FromResult<IReadOnlyList<string>>(Array.Empty<string>());
        IReadOnlyList<string> files = Directory
            .EnumerateFiles(contentDir, "*", SearchOption.AllDirectories)
            .Select(f => Path.GetRelativePath(contentDir, f).Replace('\\', '/'))
            .Order(StringComparer.Ordinal)
            .ToArray();
        return Task.FromResult(files);
    }

    public Task<IReadOnlyList<string>> ListVersionsAsync(AppDistLayer layer, CancellationToken cancellationToken)
    {
        var contents = Path.Combine(_root, "contents");
        if (!Directory.Exists(contents))
            return Task.FromResult<IReadOnlyList<string>>(Array.Empty<string>());
        var layerName = LayerName(layer);
        IReadOnlyList<string> versions = Directory
            .EnumerateDirectories(contents)
            .Where(dir =>
                Directory.Exists(Path.Combine(dir, layerName)) && File.Exists(Path.Combine(dir, layerName + ".fetched"))
            )
            .Select(Path.GetFileName)
            .OfType<string>()
            .Order(StringComparer.Ordinal)
            .ToArray();
        return Task.FromResult(versions);
    }

    private (string ContentDir, string Marker) EntryPaths(string version, AppDistLayer layer)
    {
        if (!NameSafePattern().IsMatch(version))
            throw new ArgumentException($"not a name-safe version: \"{version}\"");
        var contentDir = Path.Combine(_root, "contents", version, LayerName(layer));
        return (contentDir, contentDir + ".fetched");
    }

    private static string LayerName(AppDistLayer layer) =>
        layer switch
        {
            AppDistLayer.Schemas => "schemas",
            AppDistLayer.Bundle => "bundle",
            _ => throw new ArgumentOutOfRangeException(nameof(layer), layer, "unknown app-dist layer"),
        };

    private static string SafeChild(string directory, string relativePath)
    {
        var root = Path.GetFullPath(directory);
        var target = Path.GetFullPath(Path.Combine(root, relativePath));
        if (!target.StartsWith(root + Path.DirectorySeparatorChar, StringComparison.Ordinal))
            throw new ArgumentException($"path escapes the entry directory: \"{relativePath}\"");
        return target;
    }

    [GeneratedRegex("^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$")]
    private static partial Regex NameSafePattern();
}
