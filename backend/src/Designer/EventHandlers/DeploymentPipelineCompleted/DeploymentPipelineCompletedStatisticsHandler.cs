using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.ViewModels.Request;
using Altinn.Studio.Designer.ViewModels.Request.Enums;
using Confluent.Kafka;
using Confluent.SchemaRegistry;
using Confluent.SchemaRegistry.Serdes;
using MediatR;
using Microsoft.AspNetCore.Hosting;

namespace Altinn.Studio.Designer.EventHandlers.DeploymentPipelineCompleted;

public class DeploymentPipelineCompletedStatisticsHandler : INotificationHandler<Events.DeploymentPipelineCompleted>
{
    private readonly KafkaSettings _kafkaSettings;
    private readonly IDeploymentRepository _deploymentRepository;
    private readonly IWebHostEnvironment _hostingEnvironment;

    public DeploymentPipelineCompletedStatisticsHandler(KafkaSettings kafkaSettings, IDeploymentRepository deploymentRepository, IWebHostEnvironment hostingEnvironment)
    {
        _kafkaSettings = kafkaSettings;
        _deploymentRepository = deploymentRepository;
        _hostingEnvironment = hostingEnvironment;
    }

    public async Task Handle(Events.DeploymentPipelineCompleted notification, CancellationToken cancellationToken)
    {
        var studioStatistics = await CalculateStudioStatistics(notification);
        using var producer = GetProducer();
        await producer.ProduceAsync(_kafkaSettings.StatisticsTopic, new Message<Null, StudioStatisticsModel>
        {
            Value = studioStatistics
        }, cancellationToken);
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
        return new ProducerConfig
        {
            BootstrapServers = _kafkaSettings.BootstrapServers,
            SaslUsername = _kafkaSettings.KafkaUserName,
            SaslPassword = _kafkaSettings.KafkaPassword
        };
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

    private async Task<StudioStatisticsModel> CalculateStudioStatistics(Events.DeploymentPipelineCompleted notification)
    {
        StudioStatisticsEvent studioEvent = await CalculateStudioStatisticsEvent(notification);
        return new StudioStatisticsModel
        {
            EventName = studioEvent.Name,
            Description = studioEvent.Description,
            Environment = notification.Environment,
            Org = notification.EditingContext.Org,
            App = notification.EditingContext.Repo,
            AppsEnvironment = notification.Environment,
            AdditionalData = new Dictionary<string, string>()
            {
                { "studioEnvironment", _hostingEnvironment.EnvironmentName }
            }
        };
    }

    private async Task<StudioStatisticsEvent> CalculateStudioStatisticsEvent(Events.DeploymentPipelineCompleted notification)
    {
        if (notification.PipelineType != PipelineType.Deploy && notification.PipelineType != PipelineType.Undeploy)
        {
            throw new ArgumentException("PipelineType must be Deploy or Undeploy");
        }

        if (notification.PipelineType == PipelineType.Undeploy)
        {
            return notification.Succeeded ? StudioStatisticsEvent.AppDecommissioned : StudioStatisticsEvent.AppDecommissionFailed;
        }

        var deploymentsInEnvironment = (await _deploymentRepository.GetSucceeded(
            notification.EditingContext.Org,
            notification.EditingContext.Repo,
            notification.Environment,
            new DocumentQueryModel { SortDirection = SortDirection.Descending }
        )).ToList();

        bool isUpdate = (notification.Succeeded && deploymentsInEnvironment.Count > 2) ||
                        (!notification.Succeeded && deploymentsInEnvironment.Count > 1);

        if (isUpdate)
        {
            return notification.Succeeded ? StudioStatisticsEvent.AppUpdated : StudioStatisticsEvent.AppUpdateFailed;
        }

        return notification.Succeeded ? StudioStatisticsEvent.AppDeployed : StudioStatisticsEvent.AppDeployFailed;
    }

}
