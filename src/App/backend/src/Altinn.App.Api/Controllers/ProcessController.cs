using System.Globalization;
using System.Net;
using Altinn.App.Api.Extensions;
using Altinn.App.Api.Infrastructure.Filters;
using Altinn.App.Api.Models;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AppProcessState = Altinn.App.Core.Internal.Process.Elements.AppProcessState;

namespace Altinn.App.Api.Controllers;

/// <summary>
/// Controller for setting and moving process flow of an instance.
/// </summary>
[Route("{org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/process")]
[ApiController]
[Authorize]
[AutoValidateAntiforgeryTokenIfAuthCookie]
public class ProcessController : ControllerBase
{
    private const int MaxIterationsAllowed = 100;

    private readonly ILogger<ProcessController> _logger;
    private readonly IInstanceClient _instanceClient;
    private readonly IInstanceClientWithStorageMetadata _instanceClientWithStorageMetadata;
    private readonly IProcessClient _processClient;
    private readonly IProcessEngine _processEngine;
    private readonly ProcessStateEnricher _processStateEnricher;
    private readonly IRegisterClient _registerClient;
    private readonly IDataElementAccessChecker _dataElementAccessChecker;

    /// <summary>
    /// Initializes a new instance of the <see cref="ProcessController"/>
    /// </summary>
    public ProcessController(
        ILogger<ProcessController> logger,
        IInstanceClient instanceClient,
        IProcessClient processClient,
        IServiceProvider serviceProvider,
        ProcessStateEnricher processStateEnricher
    )
    {
        _logger = logger;
        _instanceClient = instanceClient;
        _processClient = processClient;
        _instanceClientWithStorageMetadata = serviceProvider.GetRequiredService<IInstanceClientWithStorageMetadata>();
        _processEngine = serviceProvider.GetRequiredService<IProcessEngine>();
        _processStateEnricher = processStateEnricher;
        _registerClient = serviceProvider.GetRequiredService<IRegisterClient>();
        _dataElementAccessChecker = serviceProvider.GetRequiredService<IDataElementAccessChecker>();
    }

    /// <summary>
    /// Get the process state of an instance.
    /// </summary>
    /// <param name="org">unique identifier of the organization responsible for the app</param>
    /// <param name="app">application identifier which is unique within an organization</param>
    /// <param name="instanceOwnerPartyId">unique id of the party that is the owner of the instance</param>
    /// <param name="instanceGuid">unique id to identify the instance</param>
    /// <param name="includeWorkflowStatus">
    /// When false, the live <c>workflow</c> annotation is omitted from the response and the read
    /// does not consult the workflow engine. Opt-out for bulk/machine-to-machine consumers that
    /// don't need liveness.
    /// </param>
    /// <param name="cancellationToken">cancellation token</param>
    /// <returns>the instance's process state</returns>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_READ)]
    public async Task<ActionResult<AppProcessState>> GetProcessState(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromQuery] bool includeWorkflowStatus = true,
        CancellationToken cancellationToken = default
    )
    {
        try
        {
            Instance instance = await _instanceClient.GetInstance(
                app,
                org,
                instanceOwnerPartyId,
                instanceGuid,
                authenticationMethod: null,
                cancellationToken
            );
            AppProcessState appProcessState = await _processStateEnricher.Enrich(
                instance,
                instance.Process,
                User,
                includeWorkflowStatus,
                cancellationToken
            );

            return Ok(appProcessState);
        }
        catch (PlatformHttpException e)
        {
            return HandlePlatformHttpException(
                e,
                $"Failed to access process for {instanceOwnerPartyId}/{instanceGuid}"
            );
        }
        catch (Exception exception)
        {
            _logger.LogError($"Failed to access process for {instanceOwnerPartyId}/{instanceGuid}");
            return ExceptionResponse(exception, $"Failed to access process for {instanceOwnerPartyId}/{instanceGuid}");
        }
    }

    /// <summary>
    /// Change the instance's process state to next process element in accordance with process definition.
    /// </summary>
    /// <returns>new process state, or the full enriched instance when <paramref name="returnInstance"/> is true</returns>
    /// <param name="org">unique identifier of the organization responsible for the app</param>
    /// <param name="app">application identifier which is unique within an organization</param>
    /// <param name="instanceOwnerPartyId">unique id of the party that is the owner of the instance</param>
    /// <param name="instanceGuid">unique id to identify the instance</param>
    /// <param name="cancellationToken">Cancellation token, populated by the framework</param>
    /// <param name="elementId">obsolete: alias for action</param>
    /// <param name="language">Signal the language to use for pdf generation, error messages...</param>
    /// <param name="returnInstance">When true, the response body is <see cref="EnrichedInstanceResponse"/> reflecting the post-transition instance state. Defaults to false for backward compatibility.</param>
    /// <param name="processNext">The body of the request containing possible actions to perform before advancing the process</param>
    [HttpPut("next")]
    [ProducesResponseType(typeof(AppProcessState), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(EnrichedInstanceResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(
        typeof(ProblemDetails),
        StatusCodes.Status409Conflict,
        ProcessStatusProblemResult.ContentType,
        "application/json"
    )]
    public async Task<ActionResult> NextElement(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        CancellationToken cancellationToken,
        [FromQuery] string? elementId = null,
        [FromQuery] string? language = null,
        [FromQuery] bool returnInstance = false,
        [FromBody] ProcessNext? processNext = null
    )
    {
        try
        {
            var fetchedInstance = await _instanceClientWithStorageMetadata.GetInstanceWithStorageMetadata(
                app,
                org,
                instanceOwnerPartyId,
                instanceGuid,
                null,
                cancellationToken
            );
            Instance instance = fetchedInstance.Instance;

            var processNextRequest = new ProcessNextRequest
            {
                User = User,
                Instance = instance,
                InstanceVersions = fetchedInstance.Metadata,
                Action = processNext?.Action,
                ActionOnBehalfOf = processNext?.ActionOnBehalfOf,
                Language = language,
            };

            ProcessChangeResult result = await _processEngine.Next(processNextRequest, cancellationToken);

            if (!result.Success)
            {
                return GetResultForError(result);
            }

            if (returnInstance)
            {
                // Reload the instance so data elements, dataValues, presentationTexts etc.
                // reflect any mutations the process engine made (e.g. generated PDF, locked elements).
                instance = await _instanceClient.GetInstance(
                    app,
                    org,
                    instanceOwnerPartyId,
                    instanceGuid,
                    authenticationMethod: null,
                    cancellationToken
                );
                SelfLinkHelper.SetInstanceAppSelfLinks(instance, Request);

                var instanceOwnerPartyTask = _registerClient.GetPartyUnchecked(
                    instanceOwnerPartyId,
                    cancellationToken: cancellationToken
                );
                var processStateTask = _processStateEnricher.Enrich(
                    instance,
                    result.ProcessStateChange.NewProcessState,
                    User,
                    cancellationToken: cancellationToken
                );
                await Task.WhenAll(instanceOwnerPartyTask, processStateTask);

                var dto = EnrichedInstanceResponse.From(
                    await instance.WithOnlyAccessibleDataElements(_dataElementAccessChecker),
                    await instanceOwnerPartyTask,
                    await processStateTask
                );

                return Ok(dto);
            }

            AppProcessState appProcessState = await _processStateEnricher.Enrich(
                instance,
                result.ProcessStateChange.NewProcessState,
                User,
                cancellationToken: cancellationToken
            );

            return Ok(appProcessState);
        }
        catch (WorkflowSubmissionFailedException exception) when (exception.StatusCode == HttpStatusCode.Conflict)
        {
            return ConcurrentTransitionConflict(exception);
        }
        catch (PlatformHttpException e)
        {
            _logger.LogError("Platform exception when processing next. {Message}", e.Message);
            return HandlePlatformHttpException(e, "Process next failed.");
        }
        catch (Exception exception) when (exception is not InstanceStateConflictException)
        {
            return ExceptionResponse(exception, "Process next failed.");
        }
    }

    /// <summary>
    /// Resumes the workflow that established the instance's current task.
    /// </summary>
    [HttpPost("resume")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AppProcessState>> ResumeCurrentTask(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        CancellationToken cancellationToken
    )
    {
        try
        {
            var fetchedInstance = await _instanceClientWithStorageMetadata.GetInstanceWithStorageMetadata(
                app,
                org,
                instanceOwnerPartyId,
                instanceGuid,
                null,
                cancellationToken
            );
            Instance instance = fetchedInstance.Instance;

            ProcessChangeResult result = await _processEngine.ResumeCurrentTask(
                new ProcessNextRequest
                {
                    User = User,
                    Instance = instance,
                    InstanceVersions = fetchedInstance.Metadata,
                    Action = null,
                    Language = null,
                },
                cancellationToken
            );

            if (!result.Success)
            {
                return GetResultForError(result);
            }

            Instance freshInstance = result.MutatedInstance ?? instance;
            AppProcessState appProcessState = await _processStateEnricher.Enrich(
                freshInstance,
                freshInstance.Process,
                User,
                cancellationToken: cancellationToken
            );

            return Ok(appProcessState);
        }
        catch (PlatformHttpException e)
        {
            _logger.LogError("Platform exception when resuming current task. {Message}", e.Message);
            return HandlePlatformHttpException(e, "Resume current task failed.");
        }
        catch (Exception exception) when (exception is not InstanceStateConflictException)
        {
            return ExceptionResponse(exception, "Resume current task failed.");
        }
    }

    /// <summary>
    /// Attempts to end the process by running next until an end event is reached.
    /// Notice that process must have been started.
    /// </summary>
    /// <param name="org">unique identifier of the organization responsible for the app</param>
    /// <param name="app">application identifier which is unique within an organization</param>
    /// <param name="instanceOwnerPartyId">unique id of the party that is the owner of the instance</param>
    /// <param name="instanceGuid">unique id to identify the instance</param>
    /// <param name="language">The currently used language by the user (or null if not available)</param>
    /// <returns>current process status</returns>
    [HttpPut("completeProcess")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(
        typeof(ProblemDetails),
        StatusCodes.Status409Conflict,
        ProcessStatusProblemResult.ContentType,
        "application/json"
    )]
    public async Task<ActionResult<AppProcessState>> CompleteProcess(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromQuery] string? language = null
    )
    {
        Instance instance;
        StorageVersionMetadata versions;

        try
        {
            var fetchedInstance = await _instanceClientWithStorageMetadata.GetInstanceWithStorageMetadata(
                app,
                org,
                instanceOwnerPartyId,
                instanceGuid,
                authenticationMethod: null,
                CancellationToken.None
            );
            instance = fetchedInstance.Instance;
            versions = fetchedInstance.Metadata;
        }
        catch (PlatformHttpException e)
        {
            return HandlePlatformHttpException(e, "Could not complete process.");
        }

        if (instance.Process == null)
        {
            return Conflict(
                new ProblemDetails()
                {
                    Status = StatusCodes.Status409Conflict,
                    Title = "Process is not started. Use start!",
                }
            );
        }
        else
        {
            if (instance.Process.Ended.HasValue)
            {
                return Conflict($"Process is ended. It cannot be restarted.");
            }
        }

        string currentTaskId = instance.Process.CurrentTask?.ElementId ?? instance.Process.StartEvent;

        if (currentTaskId == null)
        {
            return Conflict($"Instance does not have valid currentTask");
        }

        // do next until end event is reached or task cannot be completed.
        int counter = 0;

        while (
            instance.Process.EndEvent is null
            && instance.Process.CurrentTask is not null
            && counter++ < MaxIterationsAllowed
        )
        {
            try
            {
                ProcessNextRequest request = new()
                {
                    Instance = instance,
                    InstanceVersions = versions,
                    User = User,
                    Action = Altinn.App.Core.Internal.Process.ProcessEngine.ConvertTaskTypeToAction(
                        instance.Process.CurrentTask.AltinnTaskType
                    ),
                    Language = language,
                    Mode = ProcessNextMode.CompleteProcess,
                };
                ProcessChangeResult result = await _processEngine.Next(request);

                if (!result.Success)
                {
                    if (result.CompleteProcessAuthorizationFailed)
                    {
                        return Forbid();
                    }

                    return GetResultForError(result);
                }

                if (result.MutatedInstance is { } mutatedInstance)
                {
                    instance = mutatedInstance;
                    versions = result.MutatedInstanceVersions;
                }
            }
            catch (WorkflowSubmissionFailedException exception) when (exception.StatusCode == HttpStatusCode.Conflict)
            {
                return ConcurrentTransitionConflict(exception);
            }
            catch (Exception ex) when (ex is not InstanceStateConflictException)
            {
                return ExceptionResponse(ex, "Complete process failed.");
            }
        }

        if (counter >= MaxIterationsAllowed)
        {
            _logger.LogError(
                $"More than {MaxIterationsAllowed} iterations detected in process. Possible loop. Fix app's process definition!"
            );
            return StatusCode(
                500,
                $"More than {counter} iterations detected in process. Possible loop. Fix app process definition!"
            );
        }

        AppProcessState appProcessState = await _processStateEnricher.Enrich(instance, instance.Process, User);
        return Ok(appProcessState);
    }

    /// <summary>
    /// Get the process history for an instance.
    /// </summary>
    /// <returns>Returns a list of the process events.</returns>
    [HttpGet("history")]
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_READ)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<ProcessHistoryList>> GetProcessHistory(
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        CancellationToken cancellationToken
    )
    {
        try
        {
            return Ok(
                await _processClient.GetProcessHistory(
                    instanceGuid.ToString(),
                    instanceOwnerPartyId.ToString(CultureInfo.InvariantCulture),
                    cancellationToken: cancellationToken
                )
            );
        }
        catch (PlatformHttpException e)
        {
            return HandlePlatformHttpException(
                e,
                $"Unable to find retrieve process history for instance {instanceOwnerPartyId}/{instanceGuid}. Exception: {e}"
            );
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception processException)
        {
            _logger.LogError(
                $"Unable to find retrieve process history for instance {instanceOwnerPartyId}/{instanceGuid}. Exception: {processException}"
            );
            return ExceptionResponse(
                processException,
                $"Unable to find retrieve process history for instance {instanceOwnerPartyId}/{instanceGuid}. Exception: {processException}"
            );
        }
    }

    private ActionResult GetResultForError(ProcessChangeResult result)
    {
        if (result.BlockingProcessStatus is { } blockingProcessStatus)
        {
            return ProcessStatusProblemResult.Create(blockingProcessStatus);
        }

        if (result.WorkflowFailure is not null)
        {
            int statusCode = result.WorkflowFailure.Kind switch
            {
                WorkflowFailureKind.AcquireConflict => StatusCodes.Status409Conflict,
                WorkflowFailureKind.Timeout => StatusCodes.Status504GatewayTimeout,
                _ => StatusCodes.Status500InternalServerError,
            };

            // The raw failure detail originates from exception/callback messages and can carry
            // internal infrastructure text, so it is logged server-side and never serialized to
            // clients - the response ships a stable generic message plus the sanitized structured
            // failure, mirroring the read-path annotation rule (see AppProcessWorkflowFailure).
            _logger.LogError(
                "Process action failed with a workflow failure ({WorkflowFailureKind}): {WorkflowFailureDetail}",
                result.WorkflowFailure.Kind,
                result.ErrorMessage
            );

            var problemDetails = new ProblemDetails
            {
                Detail = CreateClientWorkflowFailureDetail(result.WorkflowFailure.Kind),
                Status = statusCode,
                Title =
                    result.WorkflowFailure.Kind == WorkflowFailureKind.AcquireConflict
                        ? "The instance changed before the transition started."
                        : "Something went wrong while moving to the next task.",
            };
            problemDetails.Extensions["workflowFailure"] = SanitizeWorkflowFailureForClient(result.WorkflowFailure);
            if (result.ProcessStateOnFailure is not null)
            {
                problemDetails.Extensions["processStateChanged"] = true;
                problemDetails.Extensions["processState"] = result.ProcessStateOnFailure;
            }

            return StatusCode(statusCode, problemDetails);
        }

        switch (result.ErrorType)
        {
            case ProcessErrorType.Conflict:
                Dictionary<string, object?> extensions = new() { { "validationIssues", result.ValidationIssues } };
                if (result.ProcessNextState is { } processNextState)
                {
                    extensions["processNextState"] = ToProcessNextStateValue(processNextState);
                }

                return Conflict(
                    new ProblemDetails()
                    {
                        Detail = result.ErrorMessage,
                        Status = StatusCodes.Status409Conflict,
                        Title = result.ErrorTitle,
                        Extensions = extensions,
                    }
                );
            case ProcessErrorType.Internal:
                return StatusCode(
                    500,
                    new ProblemDetails()
                    {
                        Detail = result.ErrorMessage,
                        Status = StatusCodes.Status500InternalServerError,
                        Title = result.ErrorTitle ?? "Internal server error",
                    }
                );
            case ProcessErrorType.Unauthorized:
                return StatusCode(
                    403,
                    new ProblemDetails()
                    {
                        Detail = result.ErrorMessage,
                        Status = StatusCodes.Status403Forbidden,
                        Title = result.ErrorTitle ?? "Unauthorized",
                    }
                );
            default:
                return StatusCode(
                    500,
                    new ProblemDetails()
                    {
                        Detail = $"Unknown ProcessErrorType {result.ErrorType}",
                        Status = StatusCodes.Status500InternalServerError,
                        Title = result.ErrorTitle ?? "Internal server error",
                    }
                );
        }
    }

    private ObjectResult ConcurrentTransitionConflict(WorkflowSubmissionFailedException exception)
    {
        _logger.LogWarning(
            exception,
            "Workflow engine rejected a process transition because the enqueue idempotency key was already used with different transition content."
        );
        return Conflict(
            new ProblemDetails
            {
                Title = "Concurrent process transition attempt.",
                Detail =
                    "Another process transition was submitted from the same instance version. Refresh the instance and try again.",
                Status = StatusCodes.Status409Conflict,
            }
        );
    }

    private ObjectResult ExceptionResponse(Exception exception, string message)
    {
        _logger.LogError(exception, message);

        if (exception is PlatformHttpException phe)
        {
            return StatusCode(
                (int)phe.StatusCode,
                new ProblemDetails()
                {
                    Detail = phe.Message,
                    Status = (int)phe.StatusCode,
                    Title = message,
                }
            );
        }

        if (exception is ServiceException se)
        {
            return StatusCode(
                (int)se.StatusCode,
                new ProblemDetails()
                {
                    Detail = se.Message,
                    Status = (int)se.StatusCode,
                    Title = message,
                }
            );
        }

        return StatusCode(
            500,
            new ProblemDetails()
            {
                Detail = exception.Message,
                Status = 500,
                Title = message,
            }
        );
    }

    private ActionResult HandlePlatformHttpException(PlatformHttpException e, string defaultMessage)
    {
        if (e.Response.StatusCode == HttpStatusCode.Forbidden)
        {
            return Forbid();
        }

        if (e.Response.StatusCode == HttpStatusCode.NotFound)
        {
            return NotFound();
        }

        if (e.Response.StatusCode == HttpStatusCode.Conflict)
        {
            return Conflict();
        }

        return ExceptionResponse(e, defaultMessage);
    }

    private static string ToProcessNextStateValue(ProcessNextState processNextState) =>
        processNextState switch
        {
            ProcessNextState.Retrying => "retrying",
            ProcessNextState.ResumeRequired => "resumeRequired",
            _ => throw new ArgumentOutOfRangeException(nameof(processNextState), processNextState, null),
        };

    /// <summary>
    /// A stable, generic <c>detail</c> for a failed process action, derived only from the coarse
    /// failure classification. The underlying error message is deliberately not used: it can carry
    /// internal infrastructure text and is logged server-side instead.
    /// </summary>
    private static string CreateClientWorkflowFailureDetail(WorkflowFailureKind kind) =>
        kind switch
        {
            WorkflowFailureKind.AcquireConflict =>
                "The instance changed before the process transition could start. Refresh the instance and try again.",
            WorkflowFailureKind.Timeout => "Timeout while waiting for workflows to complete.",
            WorkflowFailureKind.DependencyFailed => "A workflow failed because a workflow it depends on failed.",
            WorkflowFailureKind.EngineFault => "The workflow engine failed while performing the process action.",
            _ => "A workflow step failed while performing the process action.",
        };

    /// <summary>
    /// Projects a workflow failure for client serialization: the recorded error
    /// (<see cref="WorkflowFailure.LastError"/>) is stripped because its message originates from
    /// exception/callback text that can carry internal detail - clients get only the coarse
    /// classification and the structured retry metadata. Full detail stays server-side (the log
    /// entry above and the engine's step error history).
    /// </summary>
    private static WorkflowFailure SanitizeWorkflowFailureForClient(WorkflowFailure workflowFailure) =>
        new()
        {
            Kind = workflowFailure.Kind,
            WorkflowId = workflowFailure.WorkflowId,
            WorkflowOperationId = workflowFailure.WorkflowOperationId,
            StepOperationId = workflowFailure.StepOperationId,
            CommandType = workflowFailure.CommandType,
            RetryCount = workflowFailure.RetryCount,
            LastError = null,
            RetryAction = workflowFailure.RetryAction,
            RetryTargetWorkflowId = workflowFailure.RetryTargetWorkflowId,
        };
}
