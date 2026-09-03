using Altinn.Studio.AppConfig.Validation.Schemas;

namespace Altinn.Studio.AppConfigLsp;

internal sealed class SchemaSetLoader(object sync, Func<string, Task<SchemaSet?>> load, Action loaded, Logger log)
{
    private string? _targetVersion;
    private string? _loadingVersion;
    private string? _failedVersion;

    public SchemaSet? Current { get; private set; }

    public bool Loading => _loadingVersion is not null;

    public void Observe(string? version)
    {
        if (!string.Equals(version, _targetVersion, StringComparison.Ordinal))
        {
            Current = null;
            _targetVersion = version;
            _failedVersion = null;
        }
        if (version is null || Current is not null || _loadingVersion is not null)
            return;
        if (string.Equals(version, _failedVersion, StringComparison.Ordinal))
            return;
        _loadingVersion = version;
        Task.Run(() => LoadAsync(version));
    }

    public void ResetFailure() => _failedVersion = null;

    private async Task LoadAsync(string version)
    {
        SchemaSet? schemas = null;
        try
        {
            schemas = await load(version);
        }
        catch (Exception ex)
        {
            log.Log(LogLevel.Error, $"app-dist schema load failed: {ex}");
        }
        if (schemas is null)
        {
            log.Log(LogLevel.Info, $"app-dist {version} unreachable and not cached; schema pass disabled");
        }
        else
        {
            foreach (var warning in schemas.LoadWarnings)
                log.Log(LogLevel.Warning, $"app-dist {version}: {warning}");
            log.Log(LogLevel.Info, $"app-dist {version} schemas loaded");
        }
        lock (sync)
        {
            _loadingVersion = null;
            if (schemas is not null && string.Equals(version, _targetVersion, StringComparison.Ordinal))
            {
                Current = schemas;
                _failedVersion = null;
                loaded();
                return;
            }
            if (schemas is null)
                _failedVersion = version;
            Observe(_targetVersion);
        }
    }
}
