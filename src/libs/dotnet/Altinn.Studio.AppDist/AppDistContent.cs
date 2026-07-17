using System.Text;

namespace Altinn.Studio.AppDist;

public interface IAppDistContent
{
    string Version { get; }

    Task<Stream> OpenFileAsync(string path, CancellationToken cancellationToken = default);

    Task<string> GetFileTextAsync(string path, CancellationToken cancellationToken = default);

    Task<IReadOnlyDictionary<string, string>> GetFilesAsync(
        string pathPrefix = "",
        CancellationToken cancellationToken = default
    );

    Task<IReadOnlyList<string>> ListFilesAsync(CancellationToken cancellationToken = default);

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
                throw new InvalidOperationException($"file escapes the target directory: \"{path}\"");
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
