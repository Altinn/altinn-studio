#nullable enable

using System.Text.Json;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.EnvTopology;

public sealed class BoundTopologyIndexAccessor
{
    private static readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web);

    private readonly object _reloadLock = new();
    private readonly string? _boundConfigPath;
    private BoundTopologyIndex _current;
    private FileStamp? _currentFileStamp;

    public BoundTopologyIndexAccessor(
        IOptionsMonitor<BoundTopologyConfig> boundTopologyConfig,
        BoundTopologyOptions options
    )
    {
        _boundConfigPath = options.ConfigPath;
        _current = new BoundTopologyIndex(boundTopologyConfig.Get(BoundTopologyOptions.BoundName));
        _currentFileStamp = TryGetFileStamp(_boundConfigPath, out var fileStamp) ? fileStamp : null;
        boundTopologyConfig.OnChange(
            (config, name) =>
            {
                if (name == BoundTopologyOptions.BoundName)
                {
                    Volatile.Write(ref _current, new BoundTopologyIndex(config));
                    _currentFileStamp = TryGetFileStamp(_boundConfigPath, out var fileStamp) ? fileStamp : null;
                }
            }
        );
    }

    public BoundTopologyIndex Current
    {
        get
        {
            RefreshFromFileIfChanged();
            return Volatile.Read(ref _current);
        }
    }

    private void RefreshFromFileIfChanged()
    {
        if (!TryGetFileStamp(_boundConfigPath, out var fileStamp) || fileStamp == _currentFileStamp)
        {
            return;
        }

        lock (_reloadLock)
        {
            if (!TryGetFileStamp(_boundConfigPath, out fileStamp) || fileStamp == _currentFileStamp)
            {
                return;
            }

            var config = LoadConfigFromFile(_boundConfigPath);
            if (config is null)
            {
                return;
            }

            Volatile.Write(ref _current, new BoundTopologyIndex(config));
            _currentFileStamp = fileStamp;
        }
    }

    private static BoundTopologyConfig? LoadConfigFromFile(string? path)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            return null;
        }

        try
        {
            using var stream = File.OpenRead(path);
            return JsonSerializer.Deserialize<BoundTopologyConfig>(stream, _jsonOptions) ?? new BoundTopologyConfig();
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or JsonException)
        {
            return null;
        }
    }

    private static bool TryGetFileStamp(string? path, out FileStamp fileStamp)
    {
        fileStamp = default;
        if (string.IsNullOrWhiteSpace(path))
        {
            return false;
        }

        try
        {
            var fileInfo = new FileInfo(path);
            if (!fileInfo.Exists)
            {
                return false;
            }

            fileStamp = new FileStamp(fileInfo.LastWriteTimeUtc, fileInfo.Length);
            return true;
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            return false;
        }
    }

    private readonly record struct FileStamp(DateTime LastWriteTimeUtc, long Length);
}
