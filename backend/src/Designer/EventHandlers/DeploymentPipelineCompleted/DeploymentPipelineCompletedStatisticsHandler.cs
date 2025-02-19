using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.ViewModels.Request;
using Altinn.Studio.Designer.ViewModels.Request.Enums;
using MediatR;
using Microsoft.AspNetCore.Hosting;

namespace Altinn.Studio.Designer.EventHandlers.DeploymentPipelineCompleted;

public class DeploymentPipelineCompletedStatisticsHandler : INotificationHandler<Events.DeploymentPipelineCompleted>
{
    private readonly IDeploymentRepository _deploymentRepository;
    private readonly IKafkaProducer _kafkaProducer;
    private readonly IWebHostEnvironment _hostingEnvironment;

    public DeploymentPipelineCompletedStatisticsHandler(IDeploymentRepository deploymentRepository, IWebHostEnvironment hostingEnvironment, IKafkaProducer kafkaProducer)
    {
        _deploymentRepository = deploymentRepository;
        _hostingEnvironment = hostingEnvironment;
        _kafkaProducer = kafkaProducer;
    }

    public async Task Handle(Events.DeploymentPipelineCompleted notification, CancellationToken cancellationToken)
    {
        var studioStatistics = await CalculateStudioStatistics(notification);
        await _kafkaProducer.ProduceAsync(studioStatistics, cancellationToken);
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
            AdditionalData = new Dictionary<string, string>
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

        bool isUpdate = await IsAppUpdated(notification);

        if (isUpdate)
        {
            return notification.Succeeded ? StudioStatisticsEvent.AppUpdated : StudioStatisticsEvent.AppUpdateFailed;
        }

        return notification.Succeeded ? StudioStatisticsEvent.AppDeployed : StudioStatisticsEvent.AppDeployFailed;
    }

    /// <summary>
    /// Calculates if the app is updated based on the deployment history
    /// Current deploy is also stored in the database.
    /// If the current deploy is successful we're checking if there is one more successful deploy in the environment other than the current one.
    /// If the current deploy is unsuccessful we're checking if there was one successful deploy in the environment.
    /// </summary>
    private async Task<bool> IsAppUpdated(Events.DeploymentPipelineCompleted notification)
    {
        // if the current deployment is successful it will be contained in the list of successful deployments
        var deploymentsInEnvironment = (await _deploymentRepository.GetSucceeded(
            notification.EditingContext.Org,
            notification.EditingContext.Repo,
            notification.Environment,
            new DocumentQueryModel { SortDirection = SortDirection.Descending }
        )).ToList();

        return (notification.Succeeded && deploymentsInEnvironment.Count > 1) ||
                        (!notification.Succeeded && deploymentsInEnvironment.Count > 0);
    }

}
