using System.Collections.Concurrent;

namespace Altinn.Studio.AppDist;

/// <summary>
/// Identifies a separately cached layer in an app distribution artifact.
/// </summary>
public enum AppDistLayer
{
    /// <summary>The complete app frontend distribution.</summary>
    Content,

    /// <summary>The JSON schemas extracted from the frontend distribution.</summary>
    Schemas,
}

/// <summary>
/// Fetches and caches versioned app distribution content.
/// </summary>
public interface IAppDistProvider
{
    /// <summary>
    /// Gets the complete frontend distribution for <paramref name="version"/>.
    /// </summary>
    /// <returns>The requested content, or <see langword="null"/> when the version does not exist.</returns>
    /// <exception cref="AppDistSourceException">The source could not complete the request.</exception>
    /// <exception cref="AppDistArtifactException">The published artifact is invalid.</exception>
    Task<IAppDistContent?> GetVersion(string version, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets one layer of the app distribution for <paramref name="version"/>.
    /// </summary>
    /// <returns>The requested content, or <see langword="null"/> when the version does not exist.</returns>
    /// <exception cref="AppDistSourceException">The source could not complete the request.</exception>
    /// <exception cref="AppDistArtifactException">The published artifact is invalid.</exception>
    Task<IAppDistContent?> GetLayer(string version, AppDistLayer layer, CancellationToken cancellationToken = default);

    /// <summary>
    /// Lists versions currently available from the configured source, in ascending Semantic Versioning
    /// precedence. Tags that are not valid Semantic Versioning 2.0.0 versions are omitted.
    /// </summary>
    /// <exception cref="AppDistSourceException">The source could not complete the request.</exception>
    Task<IReadOnlyList<string>> ListVersions(CancellationToken cancellationToken = default);

    /// <summary>
    /// Lists versions present in the local cache for <paramref name="layer"/> without contacting the source,
    /// filtered and ordered like <see cref="ListVersions"/>.
    /// </summary>
    Task<IReadOnlyList<string>> ListCachedVersions(AppDistLayer layer, CancellationToken cancellationToken = default);
}

/// <summary>
/// Default app distribution provider composed from a source and a local store.
/// </summary>
public sealed class AppDistProvider : IAppDistProvider, IDisposable
{
    private readonly IAppDistSource _source;
    private readonly IAppDistStore _store;
    private readonly HttpClient? _ownedHttpClient;
    private readonly ConcurrentDictionary<(string Version, AppDistLayer Layer), SemaphoreSlim> _fetchGates = new();

    /// <summary>
    /// Creates a provider from independently supplied source and store implementations.
    /// </summary>
    public AppDistProvider(IAppDistSource source, IAppDistStore store)
        : this(source, store, ownedHttpClient: null) { }

    private AppDistProvider(IAppDistSource source, IAppDistStore store, HttpClient? ownedHttpClient)
    {
        ArgumentNullException.ThrowIfNull(source);
        ArgumentNullException.ThrowIfNull(store);
        _source = source;
        _store = store;
        _ownedHttpClient = ownedHttpClient;
    }

    /// <summary>
    /// Creates a provider backed by the public Altinn app distribution registry and a file-system cache.
    /// </summary>
    public static AppDistProvider CreateDefault(string cacheDirectory)
    {
        ArgumentException.ThrowIfNullOrEmpty(cacheDirectory);
        var store = new FileSystemAppDistStore(cacheDirectory);
        var handler = new SocketsHttpHandler { PooledConnectionLifetime = TimeSpan.FromMinutes(15) };
        var httpClient = new HttpClient(handler, disposeHandler: true);
        return new AppDistProvider(new OciRegistrySource(httpClient), store, httpClient);
    }

    internal static AppDistProvider CreateDefault(string cacheDirectory, HttpClient httpClient, string repository)
    {
        ArgumentException.ThrowIfNullOrEmpty(cacheDirectory);
        return new AppDistProvider(
            new OciRegistrySource(httpClient, repository),
            new FileSystemAppDistStore(cacheDirectory)
        );
    }

    public Task<IAppDistContent?> GetVersion(string version, CancellationToken cancellationToken = default) =>
        GetLayer(version, AppDistLayer.Content, cancellationToken);

    public async Task<IAppDistContent?> GetLayer(
        string version,
        AppDistLayer layer,
        CancellationToken cancellationToken = default
    )
    {
        ArgumentException.ThrowIfNullOrEmpty(version);
        if (!await EnsureLayer(version, layer, cancellationToken))
            return null;
        return new LayerContent(_store, version, layer);
    }

    public async Task<IReadOnlyList<string>> ListVersions(CancellationToken cancellationToken = default) =>
        SemVer.FilterAndSort(await _source.ListVersions(cancellationToken));

    public async Task<IReadOnlyList<string>> ListCachedVersions(
        AppDistLayer layer,
        CancellationToken cancellationToken = default
    ) => SemVer.FilterAndSort(await _store.ListVersions(layer, cancellationToken));

    public void Dispose() => _ownedHttpClient?.Dispose();

    private async Task<bool> EnsureLayer(string version, AppDistLayer layer, CancellationToken ct)
    {
        if (await _store.Contains(version, layer, ct))
            return true;

        var gate = _fetchGates.GetOrAdd((version, layer), static _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(ct);
        try
        {
            if (await _store.Contains(version, layer, ct))
                return true;

            var files = await _source.FetchLayer(version, layer, ct);
            if (files is null)
                return false;

            await _store.Write(version, layer, files, ct);
            _fetchGates.TryRemove((version, layer), out _);
            return true;
        }
        finally
        {
            gate.Release();
        }
    }
}
