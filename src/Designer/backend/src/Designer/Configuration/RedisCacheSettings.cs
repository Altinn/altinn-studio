#nullable disable
using Altinn.Studio.Designer.Configuration.Marker;

namespace Altinn.Studio.Designer.Configuration;

public class RedisCacheSettings : ISettingsMarker
{
    public string ConnectionString { get; set; }
    public string InstanceName { get; set; }
}
