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
}

internal sealed class LayerContent(IAppDistStore store, string version, AppDistLayer layer)
    : AppDistContent(store, version)
{
    protected override Task<Stream?> OpenStoredFileAsync(string path, CancellationToken ct) =>
        Store.OpenFileAsync(Version, layer, path, ct);

    public override Task<IReadOnlyList<string>> ListFilesAsync(CancellationToken cancellationToken = default) =>
        Store.ListFilesAsync(Version, layer, cancellationToken);
}

internal sealed class VersionContent(IAppDistStore store, string version) : AppDistContent(store, version)
{
    protected override async Task<Stream?> OpenStoredFileAsync(string path, CancellationToken ct)
    {
        foreach (var layer in AppDistLayers.All)
        {
            if (await Store.OpenFileAsync(Version, layer, path, ct) is { } stream)
                return stream;
        }
        return null;
    }

    public override async Task<IReadOnlyList<string>> ListFilesAsync(CancellationToken cancellationToken = default)
    {
        var files = new SortedSet<string>(StringComparer.Ordinal);
        foreach (var layer in AppDistLayers.All)
            files.UnionWith(await Store.ListFilesAsync(Version, layer, cancellationToken));
        return files.ToArray();
    }
}
