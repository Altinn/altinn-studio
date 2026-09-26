using System.Text;
using Altinn.App.Core.Features.ExternalApi;
using Altinn.App.Core.Models;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Internal.App;

/// <summary>
/// Serves the app's configuration files from the current <see cref="AppFiles"/> snapshot, with the runtime values
/// added to the application metadata.
/// </summary>
internal sealed class AppMetadata : IAppMetadata
{
    private readonly AppFilesAccessor _appFiles;
    private readonly IFrontendFeatures _frontendFeatures;
    private readonly IExternalApiFactory? _externalApiFactory;
    private volatile CachedApplicationMetadata? _cached;

    /// <param name="appFiles">The app resource files</param>
    /// <param name="frontendFeatures">The feature flags the frontend reads from the application metadata</param>
    /// <param name="serviceProvider">A way to resolve internal services</param>
    public AppMetadata(
        AppFilesAccessor appFiles,
        IFrontendFeatures frontendFeatures,
        IServiceProvider? serviceProvider = null
    )
    {
        _appFiles = appFiles;
        _frontendFeatures = frontendFeatures;
        _externalApiFactory = serviceProvider?.GetRequiredService<IExternalApiFactory>();
    }

    /// <inheritdoc />
    public ApplicationMetadata ApplicationMetadata
    {
        get
        {
            // Cached until the app files are reloaded or the feature flags change. The flags are compared by
            // reference first and by content when the reference differs, so an IFrontendFeatures that builds a new
            // dictionary on every read does not force a parse on every read.
            AppFiles files = _appFiles.Current;
            IReadOnlyDictionary<string, bool> features = _frontendFeatures.GetDictionary();
            CachedApplicationMetadata? cached = _cached;
            if (cached is not null && ReferenceEquals(cached.Source, files))
            {
                if (ReferenceEquals(cached.Features, features))
                {
                    return cached.Metadata;
                }

                if (cached.FeaturesHash == HashFeatures(features) && SameFeatures(cached.Metadata.Features, features))
                {
                    _cached = cached with { Features = features };
                    return cached.Metadata;
                }
            }

            // A copy of its own, since the runtime values are added to it
            ApplicationMetadata application = ApplicationMetadataParser.Parse(files);
            application.Features = new Dictionary<string, bool>(features, StringComparer.Ordinal);
            application.ExternalApiIds = _externalApiFactory?.GetAllExternalApiIds();
            application.OnEntry ??= new OnEntry { Show = "new-instance" };
            application.OnEntry.Show ??= "new-instance";

            _cached = new CachedApplicationMetadata(files, features, HashFeatures(features), application);
            return application;
        }
    }

    /// <inheritdoc />
    public string XacmlPolicy => Encoding.UTF8.GetString(_appFiles.Current.XacmlPolicy.Span);

    /// <inheritdoc />
    public string ProcessDefinition => Encoding.UTF8.GetString(_appFiles.Current.ProcessDefinition.Span);

    /// <summary>
    /// A hash of the flags that does not depend on their order.
    /// </summary>
    private static int HashFeatures(IReadOnlyDictionary<string, bool> features)
    {
        int hash = features.Count;
        foreach (var (name, enabled) in features)
        {
            hash ^= HashCode.Combine(name, enabled);
        }

        return hash;
    }

    private static bool SameFeatures(Dictionary<string, bool>? cached, IReadOnlyDictionary<string, bool> features)
    {
        if (cached is null || cached.Count != features.Count)
        {
            return false;
        }

        foreach (var (name, enabled) in features)
        {
            if (!cached.TryGetValue(name, out bool cachedEnabled) || cachedEnabled != enabled)
            {
                return false;
            }
        }

        return true;
    }

    private sealed record CachedApplicationMetadata(
        AppFiles Source,
        IReadOnlyDictionary<string, bool> Features,
        int FeaturesHash,
        ApplicationMetadata Metadata
    );
}
