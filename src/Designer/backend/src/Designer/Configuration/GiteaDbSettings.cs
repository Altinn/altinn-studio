using Altinn.Studio.Designer.Configuration.Marker;

namespace Altinn.Studio.Designer.Configuration;

public class GiteaDbSettings : ISettingsMarker
{
    public string ConnectionString { get; set; } = string.Empty;
}
