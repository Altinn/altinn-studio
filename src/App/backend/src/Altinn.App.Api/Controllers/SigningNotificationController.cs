using System.Net;
using Altinn.App.Api.Infrastructure.Filters;
using Altinn.App.Api.Models;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.InstanceLocking;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Controllers;

/// <summary>Service-owner inspection and recovery of independent signing notification workflows.</summary>
[ApiController]
[AutoValidateAntiforgeryTokenIfAuthCookie]
[ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
[Route("{org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/signing/notifications")]
public sealed class SigningNotificationController : ControllerBase
{
    private readonly IServiceProvider _services;
    private readonly IInstanceClient _instanceClient;
    private readonly IAuthenticationContext _authenticationContext;
    private readonly IProcessReader _processReader;

    /// <summary>Initializes the notification operations controller.</summary>
    public SigningNotificationController(
        IServiceProvider services,
        IInstanceClient instanceClient,
        IAuthenticationContext authenticationContext,
        IProcessReader processReader
    )
    {
        _services = services;
        _instanceClient = instanceClient;
        _authenticationContext = authenticationContext;
        _processReader = processReader;
    }

    /// <summary>Lists notification jobs belonging to the current signing task entry.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<SigningNotificationWorkflowResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Get(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        CancellationToken ct
    )
    {
        if (!IsServiceOwner(org))
        {
            return Forbid();
        }

        var jobs = await List(org, app, instanceOwnerPartyId, instanceGuid, ct);
        return Ok(jobs.Select(ToResponse).ToArray());
    }

    /// <summary>Resumes one failed notification without restarting delegation or other notifications.</summary>
    [HttpPost("{workflowId:guid}/resume")]
    [ProducesResponseType(StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Resume(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromRoute] Guid workflowId,
        CancellationToken ct
    )
    {
        if (!IsServiceOwner(org))
        {
            return Forbid();
        }

        // Serialize the current-entry check with task exit/re-entry. The resumed callback obtains its own
        // lease and checks again before sending, because it may execute after this request has completed.
        var locker = _services.GetRequiredService<IInstanceLocker>();
        await using var instanceLock = locker.InitLock(instanceOwnerPartyId, instanceGuid);
        await instanceLock.Lock();

        var jobs = await List(org, app, instanceOwnerPartyId, instanceGuid, ct);
        var job = jobs.SingleOrDefault(job => job.WorkflowId == workflowId);
        if (job is null)
        {
            return NotFound();
        }

        if (!job.CanResume)
        {
            return Conflict();
        }

        try
        {
            await _services
                .GetRequiredService<SigningNotificationWorkflowService>()
                .Resume($"{org}/{app}", workflowId, ct);
        }
        catch (HttpRequestException exception) when (exception.StatusCode == HttpStatusCode.Conflict)
        {
            return Conflict();
        }

        return Accepted();
    }

    private bool IsServiceOwner(string org) =>
        _authenticationContext.Current is Authenticated.ServiceOwner serviceOwner
        && string.Equals(serviceOwner.Name, org, StringComparison.Ordinal);

    private async Task<IReadOnlyList<SigningNotificationWorkflow>> List(
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        CancellationToken ct
    )
    {
        // Preserve the caller's Storage authorization in addition to checking the service-owner identity.
        var instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid, null, ct);
        string? taskId = instance.Process?.CurrentTask?.ElementId;
        if (
            taskId is null
            || instance.Process?.CurrentTask?.AltinnTaskType != "signing"
            || _processReader.GetAltinnTaskExtension(taskId)?.SignatureConfiguration
                is not AltinnSignatureConfiguration configuration
        )
        {
            return [];
        }

        var accessor = await _services
            .GetRequiredService<InstanceDataUnitOfWorkInitializer>()
            .Init(instance, taskId, null);
        return await _services
            .GetRequiredService<SigningNotificationWorkflowService>()
            .List(accessor, configuration, taskId, ct);
    }

    private static SigningNotificationWorkflowResponse ToResponse(SigningNotificationWorkflow job) =>
        new()
        {
            WorkflowId = job.WorkflowId,
            SigneeId = job.SigneeId,
            PartyId = job.PartyId,
            Status = job.Status.ToString(),
            RetryCount = job.RetryCount,
            ErrorCode = job.ErrorCode,
        };
}
