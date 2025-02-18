using Altinn.Studio.Designer.Configuration.Marker;

namespace Altinn.Studio.Designer.Configuration;

public class KafkaSettings : ISettingsMarker
{
    public string BootstrapServers { get; set; }
    public string KafkaUserName { get; set; }
    public string KafkaPassword { get; set; }
    public string SchemaRegistryUrl { get; set; }
    public string SchemaRegistryUserName { get; set; }
    public string SchemaRegistryPassword { get; set; }
    public string StatisticsTopic { get; set; }
}
