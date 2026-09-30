using System.IO;
using Altinn.Studio.AppDist;
using Altinn.Studio.Designer.Configuration.Marker;

namespace Altinn.Studio.Designer.Configuration;

public class AppDistSettings : ISettingsMarker
{
    public string Repository { get; set; } = OciRegistrySource.DefaultRepository;

    public string CacheDirectory { get; set; } = ".app-dist-cache";

    public string ResolveCacheDirectory(string repositoryLocation) =>
        Path.IsPathRooted(CacheDirectory) ? CacheDirectory : Path.Combine(repositoryLocation, CacheDirectory);
}
