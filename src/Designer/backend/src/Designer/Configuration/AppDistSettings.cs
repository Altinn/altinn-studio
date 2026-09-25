using System;
using System.IO;
using Altinn.Studio.AppDist;
using Altinn.Studio.Designer.Configuration.Marker;

namespace Altinn.Studio.Designer.Configuration;

public class AppDistSettings : ISettingsMarker
{
    public string Repository { get; set; } = OciRegistrySource.DefaultRepository;

    public string CacheDirectory { get; set; } = ".app-dist-cache";

    /// <summary>
    /// How long the list of published versions, or a failure to list them, is reused before the registry is asked
    /// again. Requests for versions outside the list are answered as unpublished without contacting the registry.
    /// </summary>
    public TimeSpan VersionListCacheDuration { get; set; } = TimeSpan.FromMinutes(1);

    /// <summary>
    /// Requests per minute an unauthenticated client address may make to the app-dist endpoints.
    /// </summary>
    public int AnonymousRequestLimitPerMinute { get; set; } = 300;

    public string ResolveCacheDirectory(string repositoryLocation) =>
        Path.IsPathRooted(CacheDirectory) ? CacheDirectory : Path.Combine(repositoryLocation, CacheDirectory);
}
