using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.EventHandlers.DeploymentPipelineCompleted;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Designer.Tests.Utils;
using Xunit;

namespace Designer.Tests.Kafka;

public class KafkaProducerTests : IDisposable
{
    private readonly string _kafkaCompooseFilePath;
    public KafkaProducerTests()
    {
        _kafkaCompooseFilePath = AltinnStudioRepositoryScanner.FindKafkaComposerFilePath();
        if (!CommandExecutor.TryExecute($"docker compose -f {_kafkaCompooseFilePath} up -d", out string _, out string error))
        {
            throw new Exception($"Failed to start kafka stack. Error: {error}");
        }
    }

    [Fact(Skip = "Can't run in pipeline")]
    public async Task KafkaPublisher_ProduceAsync_Successfully()
    {
        // Arrange
        var kafkaSettings = new KafkaSettings
        {
            BootstrapServers = LocalKafkaConstants.BootstrapServers,
            KafkaUserName = LocalKafkaConstants.KafkaUserName,
            KafkaPassword = LocalKafkaConstants.KafkaPassword,
            SchemaRegistryUrl = LocalKafkaConstants.SchemaRegistryUrl,
            SchemaRegistryUserName = LocalKafkaConstants.SchemaRegistryUserName,
            SchemaRegistryPassword = LocalKafkaConstants.SchemaRegistryPassword,
            StatisticsTopic = "altinn-app"
        };

        var kafkaProducer = new KafkaProducer(kafkaSettings);

        var studioStatistics = new StudioStatisticsModel
        {
            EventName = "AppDeployed",
            Environment = "local",
            Description = "Test",
            Org = "ttd",
            App = "app",
            AdditionalData = new Dictionary<string, string> { { "studioEnvironment", "local" } }
        };

        await kafkaProducer.ProduceAsync(studioStatistics);
    }

    public void Dispose()
    {
        // try to stop kafka stack
        CommandExecutor.TryExecute($"docker compose -f {_kafkaCompooseFilePath} down", out _, out _);
    }
}
