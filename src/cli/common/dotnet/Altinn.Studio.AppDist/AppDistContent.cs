using System.Text;

namespace Altinn.Studio.AppDist;

/// <summary>
/// Provides read access to one cached app distribution layer.
/// </summary>
public interface IAppDistContent
{
    /// <summary>Gets the app distribution version.</summary>
    string Version { get; }

    /// <summary>Opens a file for reading.</summary>
    /// <exception cref="FileNotFoundException">The layer has no file at <paramref name="path"/>.</exception>
    Task<Stream> OpenFileAsync(string path, CancellationToken cancellationToken = default);

    /// <summary>Reads a UTF-8 text file.</summary>
    /// <exception cref="FileNotFoundException">The layer has no file at <paramref name="path"/>.</exception>
    Task<string> GetFileTextAsync(string path, CancellationToken cancellationToken = default);

    /// <summary>
    /// Reads all UTF-8 text files below <paramref name="pathPrefix"/> and returns paths relative to that prefix.
    /// </summary>
    Task<IReadOnlyDictionary<string, string>> GetFilesAsync(
        string pathPrefix = "",
        CancellationToken cancellationToken = default
    );

    /// <summary>Lists every file path relative to the layer root.</summary>
    Task<IReadOnlyList<string>> ListFilesAsync(CancellationToken cancellationToken = default);

    /// <summary>Copies every file to <paramref name="targetDirectory"/>, overwriting matching files.</summary>
    Task CopyToDirectoryAsync(string targetDirectory, CancellationToken cancellationToken = default);
}

internal abstract class AppDistContent(IAppDistStore store, string version) : IAppDistContent
{
    protected IAppDistStore Store { get; } = store;

    public string Version { get; } = version;

    protected abstract Task<Stream?> OpenStoredFileAsync(string path, CancellationToken ct);

    public abstract Task<IReadOnlyList<string>> ListFilesAsync(CancellationToken cancellationToken = default);

    public async Task<Stream> OpenFileAsync(string path, CancellationToken cancellationToken = default) =>
        await OpenStoredFileAsync(path, cancellationToken)
        ?? throw new FileNotFoundException($"app-dist {Version} has no file \"{path}\"");

    public async Task<string> GetFileTextAsync(string path, CancellationToken cancellationToken = default)
    {
        await using var stream = await OpenFileAsync(path, cancellationToken);
        using var reader = new StreamReader(stream, Encoding.UTF8);
        return await reader.ReadToEndAsync(cancellationToken);
    }

    public async Task<IReadOnlyDictionary<string, string>> GetFilesAsync(
        string pathPrefix = "",
        CancellationToken cancellationToken = default
    )
    {
        ArgumentNullException.ThrowIfNull(pathPrefix);
        var prefix = pathPrefix.Length == 0 || pathPrefix.EndsWith('/') ? pathPrefix : pathPrefix + "/";
        var files = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var path in await ListFilesAsync(cancellationToken))
        {
            if (!path.StartsWith(prefix, StringComparison.Ordinal))
                continue;
            files[path[prefix.Length..]] = await GetFileTextAsync(path, cancellationToken);
        }
        return files;
    }

    public async Task CopyToDirectoryAsync(string targetDirectory, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrEmpty(targetDirectory);
        var root = Path.GetFullPath(targetDirectory);
        Directory.CreateDirectory(root);
        foreach (var path in await ListFilesAsync(cancellationToken))
        {
            var target = Path.GetFullPath(Path.Combine(root, path));
            if (!target.StartsWith(root + Path.DirectorySeparatorChar, StringComparison.Ordinal))
                throw new AppDistArtifactException($"file escapes the target directory: \"{path}\"");
            if (Path.GetDirectoryName(target) is { } parent)
                Directory.CreateDirectory(parent);
            await using var source = await OpenFileAsync(path, cancellationToken);
            await using var destination = File.Create(target);
            await source.CopyToAsync(destination, cancellationToken);
        }
    }
}

internal sealed class LayerContent(IAppDistStore store, string version, AppDistLayer layer)
    : AppDistContent(store, version)
{
    protected override Task<Stream?> OpenStoredFileAsync(string path, CancellationToken ct) =>
        Store.OpenFileAsync(Version, layer, path, ct);

    public override Task<IReadOnlyList<string>> ListFilesAsync(CancellationToken cancellationToken = default) =>
        Store.ListFilesAsync(Version, layer, cancellationToken);
}
