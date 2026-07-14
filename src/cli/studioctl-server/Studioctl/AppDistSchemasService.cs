using System.Collections.Concurrent;
using Altinn.Studio.AppConfig.Validation.Schemas;
using Altinn.Studio.AppConfigLsp;
using Altinn.Studio.AppDist;

namespace Altinn.Studio.StudioctlServer.Studioctl;

internal sealed record SchemaValidationStatus(
    bool Ran,
    string? Version,
    string? Reason,
    IReadOnlyList<string> Warnings
);

internal sealed record SchemaSetResult(SchemaSet Schemas, SchemaValidationStatus Status)
{
    public static SchemaSetResult Skipped(string reason, string? version = null) =>
        new(SchemaSet.Empty, new SchemaValidationStatus(false, version, reason, Array.Empty<string>()));

    public static SchemaSetResult Loaded(string version, SchemaSet schemas) =>
        new(schemas, new SchemaValidationStatus(true, version, null, schemas.LoadWarnings));
}

internal sealed class AppDistSchemasService : IDisposable
{
    private readonly ILogger<AppDistSchemasService> _logger;
    private readonly Lazy<IAppDistProvider?> _appDist;
    private readonly ConcurrentDictionary<string, SchemaSet> _byVersion = new(StringComparer.Ordinal);

    public AppDistSchemasService(ILogger<AppDistSchemasService> logger)
        : this(logger, AppDistConfig.CreateProvider) { }

    internal AppDistSchemasService(ILogger<AppDistSchemasService> logger, Func<IAppDistProvider?> createProvider)
    {
        _logger = logger;
        _appDist = new Lazy<IAppDistProvider?>(createProvider);
    }

    public async Task<SchemaSetResult> GetAsync(string? version, CancellationToken cancellationToken)
    {
        if (version is null)
            return SchemaSetResult.Skipped("the app does not declare an exact Altinn.App version");
        if (_appDist.Value is not { } appDist)
            return SchemaSetResult.Skipped("app-dist fetching is not configured", version);
        if (_byVersion.TryGetValue(version, out var cached))
            return SchemaSetResult.Loaded(version, cached);

        if (await AppDistConfig.LoadSchemasAsync(appDist, version, cancellationToken) is not { } schemas)
        {
            _logger.LogWarning("app-dist {Version} unreachable and not cached; schema validation skipped", version);
            return SchemaSetResult.Skipped($"app-dist {version} is unreachable and not cached", version);
        }
        return SchemaSetResult.Loaded(version, _byVersion.GetOrAdd(version, schemas));
    }

    public void Dispose()
    {
        if (_appDist.IsValueCreated)
            (_appDist.Value as IDisposable)?.Dispose();
    }
}
