using System.Collections.Concurrent;
using Altinn.Studio.AppConfig.Validation.Schemas;
using Altinn.Studio.AppDist;

namespace Altinn.Studio.StudioctlServer.Studioctl;

internal sealed class AppDistSchemasService : IDisposable
{
    private const string SchemaDirectory = "schemas/json";

    private readonly ILogger<AppDistSchemasService> _logger;
    private readonly Lazy<IAppDistProvider?> _appDist;
    private readonly ConcurrentDictionary<string, SchemaSet> _byVersion = new(StringComparer.Ordinal);

    public AppDistSchemasService(ILogger<AppDistSchemasService> logger)
        : this(logger, AppDistEnvironment.CreateFromEnvironment) { }

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

        if (await appDist.GetLayer(version, AppDistLayer.Schemas, cancellationToken) is not { } content)
        {
            _logger.LogWarning("app-dist {Version} unreachable and not cached; schema validation skipped", version);
            return SchemaSetResult.Skipped($"app-dist {version} is unreachable and not cached", version);
        }
        var schemas = SchemaSet.FromFiles(await content.GetFiles(SchemaDirectory, cancellationToken));
        return SchemaSetResult.Loaded(version, _byVersion.GetOrAdd(version, schemas));
    }

    public void Dispose()
    {
        if (_appDist.IsValueCreated)
            (_appDist.Value as IDisposable)?.Dispose();
    }
}
