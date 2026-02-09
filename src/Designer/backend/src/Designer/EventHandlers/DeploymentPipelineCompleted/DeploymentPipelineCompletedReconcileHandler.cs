using System;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using MediatR;
using Microsoft.Extensions.Logging;
using Microsoft.FeatureManagement;

namespace Altinn.Studio.Designer.EventHandlers.DeploymentPipelineCompleted;

public class DeploymentPipelineCompletedReconcileHandler : INotificationHandler<Events.DeploymentPipelineCompleted>
{
    private readonly IRuntimeGatewayClient _runtimeGatewayClient;
    private readonly IFeatureManager _featureManager;
    private readonly ILogger<DeploymentPipelineCompletedReconcileHandler> _logger;

    public DeploymentPipelineCompletedReconcileHandler(
        IRuntimeGatewayClient runtimeGatewayClient,
        IFeatureManager featureManager,
        ILogger<DeploymentPipelineCompletedReconcileHandler> logger)
    {
        _runtimeGatewayClient = runtimeGatewayClient;
        _featureManager = featureManager;
        _logger = logger;
    }

    public async Task Handle(Events.DeploymentPipelineCompleted notification, CancellationToken cancellationToken)
    {
        if (!notification.Succeeded)
        {
            return;
        }

        if (!await _featureManager.IsEnabledAsync(StudioFeatureFlags.GitOpsDeploy))
        {
            return;
        }

        var environment = AltinnEnvironment.FromName(notification.Environment);

        try
        {
            await _runtimeGatewayClient.TriggerReconcileAsync(
                notification.EditingContext.Org,
                notification.EditingContext.Repo,
                environment,
                isUndeploy: notification.PipelineType == PipelineType.Undeploy,
                cancellationToken);

            _logger.LogInformation(
                "Triggered reconciliation for {Org}/{App} in {Env}",
                notification.EditingContext.Org,
                notification.EditingContext.Repo,
                notification.Environment);
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
}
