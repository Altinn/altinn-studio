using System.Collections.Concurrent;
using Altinn.Studio.AppConfig.Validation.Schemas;
using Altinn.Studio.AppConfigLsp;
using AppDistFacade = Altinn.Studio.AppDist.AppDist;

namespace Altinn.Studio.StudioctlServer.Studioctl;

internal sealed class AppDistSchemasService(ILogger<AppDistSchemasService> logger) : IDisposable
{
    private readonly Lazy<AppDistFacade?> _appDist = new(AppDistConfig.CreateProvider);
    private readonly ConcurrentDictionary<string, SchemaSet> _byVersion = new(StringComparer.Ordinal);

    public async Task<SchemaSet> GetAsync(string? version, CancellationToken cancellationToken)
    {
        if (version is null || _appDist.Value is not { } appDist)
            return SchemaSet.Empty;
        if (_byVersion.TryGetValue(version, out var cached))
            return cached;
        if (await AppDistConfig.LoadSchemasAsync(appDist, version, cancellationToken) is not { } schemas)
        {
            logger.LogWarning("app-dist {Version} unreachable and not cached; schema pass disabled", version);
            return SchemaSet.Empty;
        }
        return _byVersion.GetOrAdd(version, schemas);
    }

    public void Dispose()
    {
        if (_appDist.IsValueCreated)
            _appDist.Value?.Dispose();
    }
}
