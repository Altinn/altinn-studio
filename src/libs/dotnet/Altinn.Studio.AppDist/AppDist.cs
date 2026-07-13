namespace Altinn.Studio.AppDist;

public interface IAppDistProvider
{
    Task<Stream?> GetFileAsync(string version, string path, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<string>?> ListFilesAsync(string version, CancellationToken cancellationToken = default);
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

    public AppDist(IAppDistSource source, IAppDistStore store)
    {
        ArgumentNullException.ThrowIfNull(source);
        ArgumentNullException.ThrowIfNull(store);
        _source = source;
        _store = store;
    }

    public async Task<Stream?> GetFileAsync(string version, string path, CancellationToken cancellationToken = default)
    {
        if (!await EnsureStoredAsync(version, cancellationToken))
            return null;
        return await _store.OpenFileAsync(version, path, cancellationToken)
            ?? throw new FileNotFoundException($"app-dist {version} has no file \"{path}\"");
    }

    public async Task<IReadOnlyList<string>?> ListFilesAsync(
        string version,
        CancellationToken cancellationToken = default
    )
    {
        if (!await EnsureStoredAsync(version, cancellationToken))
            return null;
        return await _store.ListFilesAsync(version, cancellationToken);
    }

    private async Task<bool> EnsureStoredAsync(string version, CancellationToken ct)
    {
        if (await _store.ContainsAsync(version, ct))
            return true;

        IReadOnlyList<AppDistFileEntry> files;
        try
        {
            files = await _source.FetchAsync(version, ct);
        }
        catch (AppDistSourceUnavailableException)
        {
            return false;
        }

        await _store.WriteAsync(version, files, ct);
        return true;
    }
}
