using Altinn.Studio.Designer.Configuration.Marker;

namespace Altinn.Studio.Designer.Configuration;

public class RedisCacheSettings : ISettingsMarker
{
    public bool UseRedisCache { get; set; } = false;
    public string ConnectionString { get; set; }
    public string InstanceName { get; set; }
}
