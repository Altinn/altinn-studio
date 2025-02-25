using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Confluent.Kafka;
using Confluent.SchemaRegistry;
using Confluent.SchemaRegistry.Serdes;

namespace Altinn.Studio.Designer.Services.Implementation;

public class KafkaProducer : IKafkaProducer
{
    private readonly KafkaSettings _kafkaSettings;

    public KafkaProducer(KafkaSettings kafkaSettings)
    {
        _kafkaSettings = kafkaSettings;
    }

    public async Task<StudioStatisticsModel> ProduceAsync(StudioStatisticsModel studioStatisticsModel, CancellationToken cancellationToken = default)
    {
        using var producer = GetProducer();
        await producer.ProduceAsync(_kafkaSettings.StatisticsTopic, new Message<Null, StudioStatisticsModel>
        {
            Value = studioStatisticsModel
        }, cancellationToken);

        return studioStatisticsModel;
    }

    private IProducer<Null, StudioStatisticsModel> GetProducer()
    {
        var jsonSerializerConfig = new JsonSerializerConfig();

        return new ProducerBuilder<Null, StudioStatisticsModel>(GetProducerConfig())
            .SetValueSerializer(new JsonSerializer<StudioStatisticsModel>(GetSchemaRegistryClient(), jsonSerializerConfig))
            .Build();
    }

    private ProducerConfig GetProducerConfig()
    {
        var producerConfig = new ProducerConfig
        {
            BootstrapServers = _kafkaSettings.BootstrapServers,
            SaslUsername = _kafkaSettings.KafkaUserName,
            SaslPassword = _kafkaSettings.KafkaPassword
        };

        if (!_kafkaSettings.UseSaslSsl)
        {
            return producerConfig;
        }

        producerConfig.SecurityProtocol = SecurityProtocol.SaslSsl;
        producerConfig.SaslMechanism = SaslMechanism.ScramSha512;

        return producerConfig;
    }

    private CachedSchemaRegistryClient GetSchemaRegistryClient()
    {
        return new CachedSchemaRegistryClient(GetSchemaRegistryConfig());
    }

    private SchemaRegistryConfig GetSchemaRegistryConfig()
    {
        return new SchemaRegistryConfig
        {
            Url = _kafkaSettings.SchemaRegistryUrl,
            BasicAuthCredentialsSource = AuthCredentialsSource.UserInfo,
            BasicAuthUserInfo = $"{_kafkaSettings.SchemaRegistryUserName}:{_kafkaSettings.SchemaRegistryPassword}"
        };
    }
}
