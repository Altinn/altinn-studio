using Altinn.Studio.Designer.Configuration.Marker;

namespace Altinn.Studio.Designer.Configuration;

public class SharedContentClientSettings : ISettingsMarker
{
    public required string StorageContainerName { get; set; }
    public required string StorageAccountUrl { get; set; }
}
