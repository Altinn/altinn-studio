using System.Collections.Concurrent;
using System.Text;

namespace Altinn.Studio.AppDist.Tests;

internal sealed class FakeAppDistSource : IAppDistSource
{
    private readonly Dictionary<(string Version, AppDistLayer Layer), List<AppDistFileEntry>> _layers = new();
    private int _fetchRequests;

    public int FetchRequests => _fetchRequests;
    public bool Offline { get; set; }
    public TaskCompletionSource FetchStarted { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
    public TaskCompletionSource? BlockFetch { get; set; }

    public void AddFiles(string version, AppDistLayer layer, params (string Path, string Content)[] files)
    {
        if (!_layers.TryGetValue((version, layer), out var entries))
            _layers[(version, layer)] = entries = new List<AppDistFileEntry>();
        entries.AddRange(files.Select(f => new AppDistFileEntry(f.Path, Encoding.UTF8.GetBytes(f.Content))));
    }

    public async Task<IReadOnlyList<AppDistFileEntry>> FetchLayerAsync(
        string version,
        AppDistLayer layer,
        CancellationToken cancellationToken
    )
    {
        if (Offline)
            throw new AppDistSourceUnavailableException("offline");
        Interlocked.Increment(ref _fetchRequests);
        FetchStarted.TrySetResult();
        if (BlockFetch is not null)
            await BlockFetch.Task.WaitAsync(cancellationToken);
        if (!_layers.TryGetValue((version, layer), out var files))
            throw new AppDistSourceUnavailableException($"no such layer: {version}/{layer}");
        return files;
    }

    public Task<IReadOnlyList<string>> ListVersionsAsync(CancellationToken cancellationToken)
    {
        if (Offline)
            throw new AppDistSourceUnavailableException("offline");
        IReadOnlyList<string> versions = _layers
            .Keys.Select(k => k.Version)
            .Distinct(StringComparer.Ordinal)
            .Order(StringComparer.Ordinal)
            .ToArray();
        return Task.FromResult(versions);
    }
}

internal sealed class InMemoryAppDistStore : IAppDistStore
{
    private readonly ConcurrentDictionary<(string Version, AppDistLayer Layer), Dictionary<string, byte[]>> _entries =
        new();

    public Task<bool> ContainsAsync(string version, AppDistLayer layer, CancellationToken cancellationToken) =>
        Task.FromResult(_entries.ContainsKey((version, layer)));

    public Task WriteAsync(
        string version,
        AppDistLayer layer,
        IReadOnlyList<AppDistFileEntry> files,
        CancellationToken cancellationToken
    )
    {
        var byPath = new Dictionary<string, byte[]>(StringComparer.Ordinal);
        foreach (var file in files)
            byPath[file.Path] = file.Content;
        _entries[(version, layer)] = byPath;
        return Task.CompletedTask;
    }

    public Task<Stream?> OpenFileAsync(
        string version,
        AppDistLayer layer,
        string path,
        CancellationToken cancellationToken
    ) =>
        Task.FromResult<Stream?>(
            _entries.TryGetValue((version, layer), out var entry) && entry.TryGetValue(path, out var content)
                ? new MemoryStream(content)
                : null
        );

    public Task<IReadOnlyList<string>> ListFilesAsync(
        string version,
        AppDistLayer layer,
        CancellationToken cancellationToken
    ) =>
        Task.FromResult<IReadOnlyList<string>>(
            _entries.TryGetValue((version, layer), out var entry)
                ? entry.Keys.Order(StringComparer.Ordinal).ToArray()
                : Array.Empty<string>()
        );

    public Task<IReadOnlyList<string>> ListVersionsAsync(AppDistLayer layer, CancellationToken cancellationToken) =>
        Task.FromResult<IReadOnlyList<string>>(
            _entries.Keys.Where(k => k.Layer == layer).Select(k => k.Version).Order(StringComparer.Ordinal).ToArray()
        );
}
