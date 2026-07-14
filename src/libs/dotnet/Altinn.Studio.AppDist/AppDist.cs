using System.Collections.Concurrent;

namespace Altinn.Studio.AppDist;

public enum AppDistLayer
{
    Schemas,
    Bundle,
}

internal static class AppDistLayers
{
    internal static readonly AppDistLayer[] All = Enum.GetValues<AppDistLayer>();
}

public interface IAppDistProvider
{
    Task<IAppDistContent?> GetVersionAsync(string version, CancellationToken cancellationToken = default);

    Task<IAppDistContent?> GetLayerAsync(
        string version,
        AppDistLayer layer,
        CancellationToken cancellationToken = default
    );

    Task<IReadOnlyList<string>?> ListVersionsAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<string>> ListCachedVersionsAsync(
        AppDistLayer layer,
        CancellationToken cancellationToken = default
    );
}

public sealed class AppDist : IAppDistProvider
{
    public static class JsonSchemas
    {
        public const string ApplicationMetadata = "schemas/json/application/application-metadata.schema.v1.json";
        public const string Expression = "schemas/json/layout/expression.schema.v1.json";
        public const string Footer = "schemas/json/layout/footer.schema.v1.json";
        public const string Layout = "schemas/json/layout/layout.schema.v1.json";
        public const string LayoutSettings = "schemas/json/layout/layoutSettings.schema.v1.json";
        public const string NumberFormat = "schemas/json/component/number-format.schema.v1.json";
        public const string TextResources = "schemas/json/text-resources/text-resources.schema.v1.json";
        public const string Validation = "schemas/json/validation/validation.schema.v1.json";
    }

    public static class Bundles
    {
        public const string AltinnAppFrontendJavascript = "altinn-app-frontend.js";
        public const string AltinnAppFrontendStyles = "altinn-app-frontend.css";
    }

    private readonly IAppDistSource _source;
    private readonly IAppDistStore _store;
    private readonly ConcurrentDictionary<(string Version, AppDistLayer Layer), SemaphoreSlim> _fetchGates = new();

    public AppDist(IAppDistSource source, IAppDistStore store)
    {
        ArgumentNullException.ThrowIfNull(source);
        ArgumentNullException.ThrowIfNull(store);
        _source = source;
        _store = store;
    }

    public async Task<IAppDistContent?> GetVersionAsync(string version, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrEmpty(version);
        foreach (var layer in AppDistLayers.All)
        {
            if (!await EnsureLayerAsync(version, layer, cancellationToken))
                return null;
        }
        return new VersionContent(_store, version);
    }

    public async Task<IAppDistContent?> GetLayerAsync(
        string version,
        AppDistLayer layer,
        CancellationToken cancellationToken = default
    )
    {
        ArgumentException.ThrowIfNullOrEmpty(version);
        if (!await EnsureLayerAsync(version, layer, cancellationToken))
            return null;
        return new LayerContent(_store, version, layer);
    }

    public async Task<IReadOnlyList<string>?> ListVersionsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            return await _source.ListVersionsAsync(cancellationToken);
        }
        catch (AppDistSourceUnavailableException)
        {
            return null;
        }
    }

    public Task<IReadOnlyList<string>> ListCachedVersionsAsync(
        AppDistLayer layer,
        CancellationToken cancellationToken = default
    ) => _store.ListVersionsAsync(layer, cancellationToken);

    private async Task<bool> EnsureLayerAsync(string version, AppDistLayer layer, CancellationToken ct)
    {
        if (await _store.ContainsAsync(version, layer, ct))
            return true;

        var gate = _fetchGates.GetOrAdd((version, layer), static _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(ct);
        try
        {
            if (await _store.ContainsAsync(version, layer, ct))
                return true;

            IReadOnlyList<AppDistFileEntry> files;
            try
            {
                files = await _source.FetchLayerAsync(version, layer, ct);
            }
            catch (AppDistSourceUnavailableException)
            {
                return false;
            }

            await _store.WriteAsync(version, layer, files, ct);
            _fetchGates.TryRemove((version, layer), out _);
            return true;
        }
        finally
        {
            gate.Release();
        }
    }
}
