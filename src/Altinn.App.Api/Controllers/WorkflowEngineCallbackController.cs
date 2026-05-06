using System.Diagnostics;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.InstanceLocking;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Controllers;

/// <summary>
/// Controller for handling process engine callbacks.
/// </summary>
[ApiController]
[AllowAnonymous]
[Route("{org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/workflow-engine-callbacks")]
public class WorkflowEngineCallbackController : ControllerBase
{
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
        CancellationToken cancellationToken
    )
    {
        using Activity? activity = _telemetry?.StartProcessEngineCallbackActivity(instanceGuid, commandKey);

        // Set the lock token from the workflow engine payload so all Storage clients include it
        var instanceLocker = _serviceProvider.GetRequiredService<IInstanceLocker>();
        instanceLocker.UseExternalLockToken(payload.LockToken);

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
                $"Workflow app command not found.",
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

        InstanceDataUnitOfWork instanceDataUnitOfWork = await _workflowCallbackStateService.RestoreState(
            payload.State,
            payload.Actor.Language
        );

        string? currentTaskId = instanceDataUnitOfWork.Instance.Process?.CurrentTask?.ElementId;

        ProcessEngineCommandResult result = await command.Execute(
            new ProcessEngineCommandContext
            {
                AppId = appId,
                InstanceId = instanceId,
                InstanceDataMutator = instanceDataUnitOfWork,
                CancellationToken = cancellationToken,
                Payload = payload,
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

                // Capture updated state (includes Storage-assigned IDs for newly created data elements)
                string updatedState = await _workflowCallbackStateService.CaptureState(instanceDataUnitOfWork);

                // If the command signals auto-advance, enqueue a dependent process-next workflow.
                // This happens AFTER save so the state blob includes Storage-assigned IDs.
                // If this fails, we return 500 — the engine retries the whole callback (at-least-once).
                // The enqueue uses an idempotency key, so duplicates are safe.
                if (success.AutoAdvanceProcess)
                {
                    var processEngine = _serviceProvider.GetRequiredService<IProcessEngine>();
                    await processEngine.EnqueueProcessNext(
                        instanceDataUnitOfWork.Instance,
                        payload.Actor,
                        payload.LockToken,
                        payload.WorkflowId,
                        updatedState,
                        success.AutoAdvanceAction,
                        cancellationToken
                    );
                }

                activity?.SetStatus(ActivityStatusCode.Ok);
                return Ok(new AppCallbackResponse { State = updatedState });

            case FailedProcessEngineCommandResult failed:
                _logger.LogError(
                    "Callback handler failed. CommandKey: {CommandKey}, Instance: {InstanceId}, Task: {TaskId}, Error: {ErrorMessage}, ExceptionType: {ExceptionType}",
                    commandKey,
                    instanceId,
                    currentTaskId,
                    failed.ErrorMessage,
                    failed.ExceptionType
                );
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
