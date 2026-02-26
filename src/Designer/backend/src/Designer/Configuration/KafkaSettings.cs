#nullable disable
namespace Altinn.Studio.Designer.Configuration;

public class KafkaSettings
{
    public string BootstrapServers { get; set; }
    public string KafkaUserName { get; set; }
    public string KafkaPassword { get; set; }
    public string SchemaRegistryUrl { get; set; }
    public string SchemaRegistryUserName { get; set; }
    public string SchemaRegistryPassword { get; set; }
    public bool UseSaslSsl { get; set; }
    public string StatisticsTopic { get; set; }
}
