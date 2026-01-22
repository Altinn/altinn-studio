#nullable disable
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Hubs.EntityUpdate;
using Altinn.Studio.Designer.Infrastructure.Maskinporten;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.FeatureManagement.Mvc;

namespace Altinn.Studio.Designer.Controllers;

/// <summary>
/// Controller for receiving deployment webhook events from external systems
/// </summary>
[ApiController]
[Authorize(MaskinportenConstants.AuthorizationPolicy)]
[Route("/designer/api/v1/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/deployments/webhooks")]
public class DeploymentWebhooksController : ControllerBase
{
    private readonly IDeployEventRepository _deployEventRepository;
    private readonly IHubContext<EntityUpdatedHub, IEntityUpdateClient> _entityUpdatedHubContext;
    private readonly IDeploymentService _deploymentService;
    private readonly IDeploymentRepository _deploymentRepository;

    public DeploymentWebhooksController(
        IDeployEventRepository deployEventRepository,
        IHubContext<EntityUpdatedHub, IEntityUpdateClient> entityUpdatedHubContext,
        IDeploymentService deploymentService,
        IDeploymentRepository deploymentRepository)
    {
        _deployEventRepository = deployEventRepository;
        _entityUpdatedHubContext = entityUpdatedHubContext;
        _deploymentService = deploymentService;
        _deploymentRepository = deploymentRepository;
    }

    /// <summary>
    /// Webhook endpoint for receiving deploy events
    /// </summary>
    /// <param name="org">Organisation name</param>
    /// <param name="app">Application name</param>
    /// <param name="request">Deploy event details</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Ok response</returns>
    [HttpPost("events")]
    [FeatureGate(StudioFeatureFlags.GitOpsDeploy)]
    public async Task<IActionResult> ReceiveDeployEvent(string org, string app, [FromBody] DeployEventRequest request, CancellationToken cancellationToken)
    {
        if (!TryParseEventType(request.EventType, out var eventType))
        {
            return BadRequest($"Invalid event type: {request.EventType}");
        }

        var resolveResult = await TryResolveDeploymentAsync(org, app, request, eventType);
        if (resolveResult.ErrorResult != null)
        {
            return resolveResult.ErrorResult;
        }

        var deployment = resolveResult.Deployment!;
        var buildId = resolveResult.BuildId!;

        if (deployment.HasFinalEvent)
        {
            return Ok();
        }

        await _deploymentService.SendToSlackAsync(org, AltinnEnvironment.FromName(request.Environment), app, eventType, buildId, deployment.Events.FirstOrDefault()?.Created, deployment.Events.LastOrDefault()?.Created, cancellationToken);

        var deployEvent = CreateDeployEvent(eventType, request);

        await _deployEventRepository.AddAsync(org, buildId, deployEvent, cancellationToken);

        await PublishEntityUpdatedAsync(deployment);

        return Ok();
    }

    private static bool TryParseEventType(string eventTypeString, out DeployEventType eventType)
    {
        return Enum.TryParse(eventTypeString, out eventType);
    }

    private record DeploymentResolveResult(
        DeploymentEntity Deployment,
        string BuildId,
        IActionResult ErrorResult);

    private async Task<DeploymentResolveResult> TryResolveDeploymentAsync(
        string org,
        string app,
        DeployEventRequest request,
        DeployEventType eventType)
    {
        bool isUninstallEvent = eventType is DeployEventType.UninstallSucceeded or DeployEventType.UninstallFailed;

        if (isUninstallEvent)
        {
            // Gateway currently gets the environment set to prod when in the production environment
            var environment = request.Environment.Equals("prod", StringComparison.OrdinalIgnoreCase) ? "production" : request.Environment;
            var deployment = await _deploymentRepository.GetPendingDecommission(org, app, environment);
            if (deployment == null)
            {
                return new DeploymentResolveResult(null, null, NotFound($"No pending decommission deployment found for {org}/{app} in {environment}"));
            }

            return new DeploymentResolveResult(deployment, deployment.Build.Id, null);
        }
        else
        {
            if (string.IsNullOrWhiteSpace(request.BuildId))
            {
                return new DeploymentResolveResult(null, null, BadRequest("BuildId is required for non-uninstall events"));
            }

            var deployment = await _deploymentRepository.Get(org, request.BuildId);
            if (deployment == null)
            {
                return new DeploymentResolveResult(null, null, NotFound($"Deployment with build ID {request.BuildId} not found"));
            }

            return new DeploymentResolveResult(deployment, request.BuildId, null);
        }
    }

    private static DeployEvent CreateDeployEvent(DeployEventType eventType, DeployEventRequest request)
    {
        return new DeployEvent
        {
            EventType = eventType,
            Message = request.Message,
            Timestamp = request.Timestamp,
            Origin = DeployEventOrigin.Webhook
        };
    }

    private async Task PublishEntityUpdatedAsync(DeploymentEntity deployment)
    {
        await _entityUpdatedHubContext.Clients.Group(deployment.CreatedBy)
            .EntityUpdated(new EntityUpdated(EntityConstants.Deployment));
    }
}
