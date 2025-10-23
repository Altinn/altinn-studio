using Altinn.Studio.Designer.Configuration.Marker;

namespace Altinn.Studio.Designer.Configuration;

public class SharedContentClientSettings : ISettingsMarker
{
    public string StorageContainerName { get; set; }
    public string StorageAccountUrl { get; set; }
}
