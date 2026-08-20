using System.Diagnostics;
using Altinn.App.Api.Infrastructure.Authentication;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.InstanceLocking;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Controllers;

/// <summary>
/// Controller for handling process engine callbacks. Authenticated via the WorkflowEngineCallback scheme:
/// the engine replays the app-minted JWT (bound to this instance) in the Authorization: Bearer header.
/// </summary>
[ApiController]
[Authorize(AuthenticationSchemes = WorkflowEngineCallbackDefaults.AuthenticationScheme)]
[Route("{org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/workflow-engine-callbacks")]
public class WorkflowEngineCallbackController : ControllerBase
{
    private const string CollectionKeyHeader = "Collection-Key";

    private readonly IServiceProvider _serviceProvider;
    private readonly WorkflowCallbackStateService _workflowCallbackStateService;
    private readonly ILogger<WorkflowEngineCallbackController> _logger;
    private readonly Telemetry? _telemetry;

    /// <summary>
    /// Initializes a new instance of the <see cref="WorkflowEngineCallbackController"/> class.
    /// </summary>
    public WorkflowEngineCallbackController(
        IServiceProvider serviceProvider,
        ILogger<WorkflowEngineCallbackController> logger,
        Telemetry? telemetry = null
    )
    {
        _serviceProvider = serviceProvider;
        _workflowCallbackStateService = serviceProvider.GetRequiredService<WorkflowCallbackStateService>();
        _logger = logger;
        _telemetry = telemetry;
    }

    /// <summary>
    /// Executes a command based on the provided command key.
    /// </summary>
    [HttpPost("{commandKey}")]
    public async Task<IActionResult> ExecuteCommand(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromRoute] string commandKey,
        [FromBody] AppCallbackPayload payload,
        CancellationToken ct
    )
    {
        using Activity? activity = _telemetry?.StartProcessEngineCallbackActivity(instanceGuid, commandKey);

        var appId = new AppIdentifier(org, app);
        var instanceId = new InstanceIdentifier(instanceOwnerPartyId, instanceGuid);

        IWorkflowEngineCommand? command = _serviceProvider
            .GetServices<IWorkflowEngineCommand>()
            .FirstOrDefault(x => x.GetKey() == commandKey);

        if (command is null)
        {
            _logger.LogError(
                "Workflow app command '{CommandKey}' not found. Instance: {InstanceId}.",
                commandKey,
                instanceId
            );
            activity?.SetStatus(ActivityStatusCode.Error, "Command not found");
            return NonRetryableProblem(
                "Command Not Found",
                "Workflow app command not found.",
                StatusCodes.Status404NotFound
            );
        }

        // Restore instance and form data from the opaque state blob.
        // State must always be provided — every workflow is enqueued with a captured state blob.
        if (payload.State is null)
        {
            _logger.LogError(
                "State blob is missing from callback payload. CommandKey: {CommandKey}, Instance: {InstanceId}.",
                commandKey,
                instanceId
            );
            activity?.SetStatus(ActivityStatusCode.Error, "Missing state blob");
            return NonRetryableProblem(
                "Missing State",
                "State blob is missing from callback payload.",
                StatusCodes.Status422UnprocessableEntity
            );
        }

        // The blob restores into two halves: instance data, and the non-data carry threaded through the command
        // and back out below.
        InstanceDataUnitOfWork instanceDataUnitOfWork;
        WorkflowCallbackStateCarry stateCarry;
        try
        {
            (instanceDataUnitOfWork, stateCarry) = await _workflowCallbackStateService.RestoreState(
                instanceId,
                payload.State,
                payload.Actor.Language
            );
        }
        catch (WorkflowCallbackStateException e)
        {
            _logger.LogError(
                e,
                "Failed to restore workflow callback state. CommandKey: {CommandKey}, Instance: {InstanceId}.",
                commandKey,
                instanceId
            );
            activity?.SetStatus(ActivityStatusCode.Error, "Invalid callback state");
            return NonRetryableProblem(
                "Invalid State",
                "Workflow callback state could not be restored for this instance.",
                StatusCodes.Status422UnprocessableEntity
            );
        }

        // Set the lock token from the workflow engine payload so all Storage clients include it. Done after the
        // state blob has been validated against the route instance, so the token is only applied once we know
        // the callback targets the expected instance.
        var instanceLocker = _serviceProvider.GetRequiredService<IInstanceLocker>();
        instanceLocker.UseExternalLockToken(payload.LockToken);

        string? currentTaskId = instanceDataUnitOfWork.Instance.Process?.CurrentTask?.ElementId;

        ProcessEngineCommandResult result = await command.Execute(
            new ProcessEngineCommandContext
            {
                AppId = appId,
                InstanceId = instanceId,
                InstanceDataMutator = instanceDataUnitOfWork,
                CancellationToken = ct,
                Payload = payload,
                StateCarry = stateCarry,
            }
        );

        //TODO: Consider rewriting IInstanceDataMutator so that we can construct one that doesn't allow abandonment in this scenario. Don't think it makes sense when the process engine is the caller.
        if (instanceDataUnitOfWork.HasAbandonIssues)
        {
            _logger.LogError(
                "Data abandonment detected during callback. CommandKey: {CommandKey}, Instance: {InstanceId}, Task: {TaskId}.",
                commandKey,
                instanceId,
                currentTaskId
            );

            activity?.SetStatus(ActivityStatusCode.Error, "Data abandonment detected");

            return NonRetryableProblem(
                "Data Abandonment",
                "Data abandonment detected during callback.",
                StatusCodes.Status422UnprocessableEntity
            );
        }

        switch (result)
        {
            case SuccessfulProcessEngineCommandResult success:
                DataElementChanges changes = instanceDataUnitOfWork.GetDataElementChanges(false);

                await instanceDataUnitOfWork.UpdateInstanceData(changes);
                await instanceDataUnitOfWork.SaveChanges(changes);

                string updatedState = await _workflowCallbackStateService.CaptureState(
                    instanceDataUnitOfWork,
                    stateCarry
                );

                // The relay runs here, not in the command: whatever it starts must begin on the state the handler
                // *published* — saved, re-captured, re-signed above. On a relay throw the engine retries the whole
                // step; the relay's keyed calls deduplicate, the save does not (the ordinary at-least-once contract).
                if (success.MailboxContinuation is { } continuation)
                {
                    await RunMailboxRelay(
                        continuation,
                        appId,
                        instanceId,
                        payload,
                        instanceDataUnitOfWork.Instance,
                        updatedState,
                        success.AutoAdvanceProcess,
                        success.AutoAdvanceAction,
                        ct
                    );

                    activity?.SetStatus(ActivityStatusCode.Ok);
                    return Ok(new AppCallbackResponse { State = updatedState });
                }

                // If the command signals auto-advance, enqueue a dependent process-next workflow.
                // This happens AFTER save so the state blob includes Storage-assigned IDs.
                // If this fails, we return 500 — the engine retries the whole callback (at-least-once).
                // The enqueue uses an idempotency key, so duplicates are safe.
                if (success.AutoAdvanceProcess)
                {
                    string collectionKey = Request.Headers[CollectionKeyHeader].ToString();
                    if (string.IsNullOrWhiteSpace(collectionKey))
                    {
                        _logger.LogError(
                            "Workflow callback is missing the '{Header}' header required for auto-advance. CommandKey: {CommandKey}, Instance: {InstanceId}.",
                            CollectionKeyHeader,
                            commandKey,
                            instanceId
                        );
                        activity?.SetStatus(ActivityStatusCode.Error, "Missing Collection-Key header");
                        return NonRetryableProblem(
                            "Missing Collection-Key",
                            "Workflow callback is missing the Collection-Key header required for auto-advance process next.",
                            StatusCodes.Status422UnprocessableEntity
                        );
                    }

                    var processEngine = _serviceProvider.GetRequiredService<IProcessEngine>();
                    await processEngine.EnqueueProcessNext(
                        instanceDataUnitOfWork.Instance,
                        payload.Actor,
                        payload.LockToken,
                        payload.WorkflowId,
                        collectionKey,
                        updatedState,
                        success.AutoAdvanceAction,
                        ct: ct
                    );
                }

                activity?.SetStatus(ActivityStatusCode.Ok);
                return Ok(new AppCallbackResponse { State = updatedState });

            case DeferredProcessEngineCommandResult deferred:
                // A deferral is stateless by contract: nothing is saved and the incoming state is
                // echoed back unchanged, so the re-run starts exactly where this attempt did. A step
                // that checks-and-waits is not a step that records — work that produces something
                // durable belongs in its own pipeline step. Enforced rather than silently discarded:
                // a deferring handler that made data changes has broken the contract, and dropping
                // its writes quietly would be the one worse outcome.
                DataElementChanges deferredChanges = instanceDataUnitOfWork.GetDataElementChanges(false);
                if (deferredChanges.AllChanges.Count > 0)
                {
                    _logger.LogError(
                        "Callback handler deferred after modifying instance data ({ChangeCount} change(s)). "
                            + "A deferral is stateless: move the work that records data into its own step. "
                            + "CommandKey: {CommandKey}, Instance: {InstanceId}, Task: {TaskId}.",
                        deferredChanges.AllChanges.Count,
                        command.GetKey(),
                        instanceId,
                        currentTaskId
                    );
                    activity?.SetStatus(ActivityStatusCode.Error, "Deferring handler modified instance data");
                    return NonRetryableProblem(
                        "Deferral With Data Changes",
                        "A deferring handler must not modify instance data — a deferral is stateless. "
                            + "Move the work that records data into its own pipeline step.",
                        StatusCodes.Status422UnprocessableEntity
                    );
                }

                // The resolved command's own key rather than the route string it matched: same value,
                // but provably from the registered set, so nothing route-derived reaches the log.
                _logger.LogInformation(
                    "Callback handler deferred. CommandKey: {CommandKey}, Instance: {InstanceId}, Task: {TaskId}, Delay: {Delay}",
                    command.GetKey(),
                    instanceId,
                    currentTaskId,
                    deferred.Delay
                );
                activity?.SetStatus(ActivityStatusCode.Ok);

                return Ok(
                    new AppCallbackResponse
                    {
                        State = payload.State,
                        Defer = new AppCallbackDeferral { Delay = deferred.Delay, Reason = deferred.Reason },
                    }
                );

            case FailedProcessEngineCommandResult failed:
                // A permanent failure still concludes the exchange — the mailbox must stop accepting messages. Before
                // the response, so a retried step repeats it.
                if (failed.MailboxContinuation is { } failedContinuation)
                {
                    await RunMailboxRelay(
                        failedContinuation,
                        appId,
                        instanceId,
                        payload,
                        instanceDataUnitOfWork.Instance,
                        state: null,
                        autoAdvanceProcess: false,
                        autoAdvanceAction: null,
                        ct
                    );
                }

                // The resolved command's own key rather than the route string it matched - same value,
                // but provably from the registered set, as in the deferral branch above.
                _logger.LogError(
                    "Callback handler failed. CommandKey: {CommandKey}, Instance: {InstanceId}, Task: {TaskId}, Error: {ErrorMessage}, ExceptionType: {ExceptionType}",
                    command.GetKey(),
                    instanceId,
                    currentTaskId,
                    failed.ErrorMessage,
                    failed.ExceptionType
                );

                // A service-owner 403 reads as a platform failure but is a policy gap, and the bare
                // status code gives nobody a way to find that out. Logged separately so the reason is
                // spelled out where the app and task are known; the failure is classified and
                // answered exactly as before. The app's own metadata names the app, not the request's
                // route: this is a statement about this app's policy file either way, and the route
                // values are caller-supplied.
                if (failed.ServiceOwnerAuthorizationDenied)
                {
                    // Tagged as well as logged: the engine's failed-workflow metrics cannot tell a
                    // policy gap from a transient platform failure, and the two want different
                    // responses - a policy change for every instance of the app, versus a redrive.
                    activity?.SetTag(Telemetry.InternalLabels.ServiceOwnerAuthorizationDenied, true);

                    ApplicationMetadata appMetadata = await _serviceProvider
                        .GetRequiredService<IAppMetadata>()
                        .GetApplicationMetadata();

                    _logger.LogError(
                        "{ServiceOwnerAuthorizationDiagnosis} CommandKey: {CommandKey}, Instance: {InstanceId}.",
                        ServiceOwnerAuthorizationDiagnostics.Describe(
                            appMetadata,
                            currentTaskId,
                            instanceDataUnitOfWork.Instance.Process?.CurrentTask?.AltinnTaskType
                        ),
                        command.GetKey(),
                        instanceId
                    );
                }

                activity?.SetStatus(ActivityStatusCode.Error, failed.ErrorMessage);

                if (failed.NonRetryable)
                {
                    return NonRetryableProblem(
                        failed.ExceptionType,
                        failed.ErrorMessage,
                        StatusCodes.Status422UnprocessableEntity
                    );
                }

                return Problem(
                    title: failed.ExceptionType,
                    detail: failed.ErrorMessage,
                    statusCode: StatusCodes.Status500InternalServerError
                );

            default:
                _logger.LogError(
                    "Unexpected callback result type: {ResultType}. CommandKey: {CommandKey}, Instance: {InstanceId}",
                    result.GetType().Name,
                    commandKey,
                    instanceId
                );
                throw new InvalidOperationException($"Unexpected result type: {result.GetType().Name}");
        }
    }

    /// <summary>Hands one verdict to the relay. The controller decides only <em>when</em> it runs.</summary>
    private Task RunMailboxRelay(
        MailboxContinuation continuation,
        AppIdentifier appId,
        InstanceIdentifier instanceId,
        AppCallbackPayload payload,
        Instance instance,
        string? state,
        bool autoAdvanceProcess,
        string? autoAdvanceAction,
        CancellationToken ct
    )
    {
        var relay = _serviceProvider.GetRequiredService<MailboxRelay>();
        return relay.Continue(
            continuation,
            new MailboxRelayRequest
            {
                AppId = appId,
                InstanceId = instanceId,
                Payload = payload,
                Instance = instance,
                State = state,
                AutoAdvanceProcess = autoAdvanceProcess,
                AutoAdvanceAction = autoAdvanceAction,
            },
            ct
        );
    }

    private static ObjectResult NonRetryableProblem(string title, string detail, int statusCode)
    {
        var problemDetails = new ProblemDetails
        {
            Title = title,
            Detail = detail,
            Status = statusCode,
        };
        problemDetails.Extensions["nonRetryable"] = true;
        return new ObjectResult(problemDetails) { StatusCode = statusCode };
    }
}
