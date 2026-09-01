#nullable disable
using Altinn.Studio.Designer.Configuration.Marker;

namespace Altinn.Studio.Designer.Configuration;

public class DistributedCacheSettings : ISettingsMarker
{
    public DistributedCacheType Type { get; set; } = DistributedCacheType.Unknown;
}

public enum DistributedCacheType
{
    Unknown,
    None,
    Memory,
    Redis,
}
