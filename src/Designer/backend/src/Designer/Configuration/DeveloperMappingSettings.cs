using Altinn.Studio.Designer.Configuration.Marker;

namespace Altinn.Studio.Designer.Configuration;

public class DeveloperMappingSettings : ISettingsMarker
{
    public string PidHashSalt { get; set; } = string.Empty;
}
