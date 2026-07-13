using System.Text;

namespace Altinn.Studio.AppDist.Tests;

internal sealed class FakeAppDistSource : IAppDistSource
{
    private readonly Dictionary<string, List<AppDistFileEntry>> _versions = new(StringComparer.Ordinal);

    public int FetchRequests { get; private set; }
    public bool Offline { get; set; }

    public void AddFiles(string version, params (string Path, string Content)[] files)
    {
        if (!_versions.TryGetValue(version, out var entries))
            _versions[version] = entries = new List<AppDistFileEntry>();
        entries.AddRange(files.Select(f => new AppDistFileEntry(f.Path, Encoding.UTF8.GetBytes(f.Content))));
    }

    public Task<IReadOnlyList<AppDistFileEntry>> FetchAsync(string version, CancellationToken cancellationToken)
    {
        if (Offline)
            throw new AppDistSourceUnavailableException("offline");
        FetchRequests++;
        if (!_versions.TryGetValue(version, out var files))
            throw new AppDistSourceUnavailableException($"no such version: {version}");
        return Task.FromResult<IReadOnlyList<AppDistFileEntry>>(files);
    }
}

internal sealed class InMemoryAppDistStore : IAppDistStore
{
    private readonly Dictionary<string, Dictionary<string, byte[]>> _entries = new(StringComparer.Ordinal);

    public Task<bool> ContainsAsync(string version, CancellationToken cancellationToken) =>
        Task.FromResult(_entries.ContainsKey(version));

    public Task WriteAsync(string version, IReadOnlyList<AppDistFileEntry> files, CancellationToken cancellationToken)
    {
        var byPath = new Dictionary<string, byte[]>(StringComparer.Ordinal);
        foreach (var file in files)
            byPath[file.Path] = file.Content;
        _entries[version] = byPath;
        return Task.CompletedTask;
    }

    public Task<Stream?> OpenFileAsync(string version, string path, CancellationToken cancellationToken) =>
        Task.FromResult<Stream?>(
            _entries.TryGetValue(version, out var entry) && entry.TryGetValue(path, out var content)
                ? new MemoryStream(content)
                : null
        );

    public Task<IReadOnlyList<string>> ListFilesAsync(string version, CancellationToken cancellationToken) =>
        Task.FromResult<IReadOnlyList<string>>(
            _entries.TryGetValue(version, out var entry)
                ? entry.Keys.Order(StringComparer.Ordinal).ToArray()
                : Array.Empty<string>()
        );
}
