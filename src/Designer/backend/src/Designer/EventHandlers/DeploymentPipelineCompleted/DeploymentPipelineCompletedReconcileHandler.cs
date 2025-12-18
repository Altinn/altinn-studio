using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using Altinn.Studio.Designer.ViewModels.Request;
using MediatR;
using Microsoft.Extensions.Logging;
using Microsoft.FeatureManagement;

namespace Altinn.Studio.Designer.EventHandlers.DeploymentPipelineCompleted;

public class DeploymentPipelineCompletedReconcileHandler : INotificationHandler<Events.DeploymentPipelineCompleted>
{
    private readonly IRuntimeGatewayClient _runtimeGatewayClient;
    private readonly IDeploymentRepository _deploymentRepository;
    private readonly IFeatureManager _featureManager;
    private readonly ILogger<DeploymentPipelineCompletedReconcileHandler> _logger;

    public DeploymentPipelineCompletedReconcileHandler(
        IRuntimeGatewayClient runtimeGatewayClient,
        IDeploymentRepository deploymentRepository,
        IFeatureManager featureManager,
        ILogger<DeploymentPipelineCompletedReconcileHandler> logger)
    {
        _runtimeGatewayClient = runtimeGatewayClient;
        _deploymentRepository = deploymentRepository;
        _featureManager = featureManager;
        _logger = logger;
    }

    public async Task Handle(Events.DeploymentPipelineCompleted notification, CancellationToken cancellationToken)
    {
        if (!notification.Succeeded || notification.PipelineType != PipelineType.Deploy)
        {
            return;
        }

        if (!await _featureManager.IsEnabledAsync(StudioFeatureFlags.GitOpsDeploy))
        {
            return;
        }

        var environment = AltinnEnvironment.FromName(notification.Environment);
        var isNewApp = await IsFirstSuccessfulDeployment(notification, cancellationToken);

        try
        {
            await _runtimeGatewayClient.TriggerReconcileAsync(
                notification.EditingContext.Org,
                notification.EditingContext.Repo,
                environment,
                isNewApp,
                cancellationToken);

            _logger.LogInformation(
                "Triggered reconciliation for {Org}/{App} in {Env} (isNewApp: {IsNewApp})",
                notification.EditingContext.Org,
                notification.EditingContext.Repo,
                notification.Environment,
                isNewApp);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Failed to trigger reconciliation for {Org}/{App} in {Env}",
                notification.EditingContext.Org,
                notification.EditingContext.Repo,
                notification.Environment);
        }
    }

    private async Task<bool> IsFirstSuccessfulDeployment(
        Events.DeploymentPipelineCompleted notification,
        CancellationToken cancellationToken)
    {
        var succeededDeployments = await _deploymentRepository.GetSucceeded(
            notification.EditingContext.Org,
            notification.EditingContext.Repo,
            notification.Environment,
            new DocumentQueryModel { Top = 2 });

        return succeededDeployments.Count() == 1;
    }
}
