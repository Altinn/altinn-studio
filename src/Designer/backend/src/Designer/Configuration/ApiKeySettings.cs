using Altinn.Studio.Designer.Configuration.Marker;

namespace Altinn.Studio.Designer.Configuration;

public class ApiKeySettings : ISettingsMarker
{
    public string HashSalt { get; set; } = string.Empty;
    public int MaxExpiryDays { get; set; } = 365;
}
