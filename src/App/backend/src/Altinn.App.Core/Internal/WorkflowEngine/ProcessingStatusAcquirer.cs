using System.Net;
using System.Text.Json;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// Claims processing ownership and enqueues the transition from the workflow's signed snapshot.
/// </summary>
internal sealed class ProcessingStatusAcquirer
{
    internal const string Key = "AcquireProcessingStatus";

    private static readonly IReadOnlyDictionary<string, StorageInstanceMutationContent> _noContentParts =
        new Dictionary<string, StorageInstanceMutationContent>(StringComparer.Ordinal);

    private readonly WorkflowCallbackStateService _stateService;
    private readonly IInstanceMutationClient _mutationClient;
    private readonly IWorkflowEngineService _workflowEngineService;

    public ProcessingStatusAcquirer(
        WorkflowCallbackStateService stateService,
        IInstanceMutationClient mutationClient,
        IWorkflowEngineService workflowEngineService
    )
    {
        _stateService = stateService;
        _mutationClient = mutationClient;
        _workflowEngineService = workflowEngineService;
    }

    /// <summary>
    /// Attempts the idle-to-processing transition for the snapshot carried in <paramref name="state"/>.
    /// </summary>
    public async Task<ProcessingStatusAcquisition> Acquire(
        InstanceIdentifier instanceId,
        AppCallbackPayload payload,
        string state,
        string? collectionKey,
        CancellationToken cancellationToken
    )
    {
        if (!TryReadPayload(payload.Payload, out AcquireProcessingStatusPayload? acquirePayload))
        {
            return new ProcessingStatusAcquisition.Rejected(
                "AcquireProcessingStatus payload is invalid",
                "InvalidPayloadException"
            );
        }

        if (acquirePayload is not null)
        {
            ArgumentException.ThrowIfNullOrWhiteSpace(collectionKey);
        }

        WorkflowCallbackState callbackState = _stateService.ReadState(instanceId, state);
        if (callbackState.Instance.Process is not { } process)
        {
            return new ProcessingStatusAcquisition.Rejected(
                "Workflow process status acquisition requires an initialized process state.",
                nameof(InvalidOperationException)
            );
        }

        ProcessStateChange? transition = acquirePayload?.ProcessStateChange;
        if (transition is not null)
        {
            ProcessEngine.ApplyExecutionContext(transition, payload.Actor, payload.ExecutionReferenceTime);
        }

        // Storage replaces the whole process; version fences protect this snapshot copy.
        ProcessState processingState = process.Copy();
        processingState.Status = ProcessStatus.Processing;
        var mutation = new StorageInstanceMutationRequest
        {
            ExpectedProcessStatus = ProcessStatus.Idle,
            ProcessState = new StorageInstanceMutationProcessStateUpdate { State = processingState, Events = [] },
        };

        InstanceMutationWithStorageMetadata result;
        try
        {
            result = await _mutationClient.CommitInstanceMutationWithStorageMetadata(
                instanceId.InstanceOwnerPartyId,
                instanceId.InstanceGuid,
                mutation,
                _noContentParts,
                StorageAuthenticationMethod.ServiceOwner(),
                // StepId is stable across retries and prevents duplicate Storage mutations.
                new StorageWritePreconditions(
                    ProcessStateVersion: callbackState.ProcessStateVersion,
                    InstanceVersion: callbackState.InstanceVersion,
                    IdempotencyKey: payload.StepId.ToString()
                ),
                cancellationToken
            );
        }
        catch (PlatformHttpException exception) when (IsLostRace(exception))
        {
            return acquirePayload is null
                ? new ProcessingStatusAcquisition.Rejected(
                    "The instance changed before its initial process could claim it.",
                    exception.GetType().Name
                )
                : new ProcessingStatusAcquisition.Superseded(exception);
        }

        if (
            result.Metadata.InstanceVersion is not { } instanceVersion
            || result.Metadata.ProcessStateVersion is not { } processStateVersion
        )
        {
            throw new InvalidOperationException(
                $"Storage did not return complete versions after acquiring processing status for instance '{instanceId}'."
            );
        }

        // Acquisition changes only process status, so captured forms must still describe the returned snapshot.
        foreach (FormDataEntry entry in callbackState.FormData)
        {
            DataElement? original = callbackState.Instance.Data?.FirstOrDefault(element => element.Id == entry.Id);
            DataElement? acquired = result.Instance.Data?.FirstOrDefault(element => element.Id == entry.Id);
            if (
                original is null
                || acquired is null
                || !StringComparer.Ordinal.Equals(original.BlobVersionId, acquired.BlobVersionId)
            )
            {
                throw new InvalidOperationException(
                    $"Captured form data element '{entry.Id}' does not match the acquired Storage snapshot for instance '{instanceId}'."
                );
            }
        }

        string acquiredState = _stateService.SealState(
            callbackState with
            {
                Instance = result.Instance,
                InstanceVersion = instanceVersion,
                ProcessStateVersion = processStateVersion,
            }
        );

        if (transition is not null)
        {
            await _workflowEngineService.EnqueueDependentProcessNext(
                result.Instance,
                transition,
                payload.WorkflowId,
                collectionKey
                    ?? throw new InvalidOperationException("A process-next continuation requires a collection key."),
                acquiredState,
                payload.Actor,
                cancellationToken: cancellationToken
            );
        }

        return new ProcessingStatusAcquisition.Acquired(acquiredState);
    }

    private static bool TryReadPayload(string? payload, out AcquireProcessingStatusPayload? acquirePayload)
    {
        acquirePayload = null;
        if (payload is null)
        {
            return true;
        }

        try
        {
            acquirePayload =
                CommandPayloadSerializer.Deserialize<CommandRequestPayload>(payload) as AcquireProcessingStatusPayload;
        }
        catch (Exception exception) when (exception is JsonException or NotSupportedException)
        {
            return false;
        }

        return acquirePayload?.ProcessStateChange
                is {
                    OldProcessState.CurrentTask.ElementId.Length: > 0,
                    NewProcessState: { } nextState,
                    Events.Count: > 0
                } transition
            && nextState
                is { CurrentTask.ElementId.Length: > 0, EndEvent: null }
                    or { CurrentTask: null, EndEvent.Length: > 0 }
            && transition.Events.All(instanceEvent =>
                instanceEvent is { EventType.Length: > 0, ProcessInfo: not null }
            );
    }

    private static bool IsLostRace(PlatformHttpException exception) =>
        exception is StorageProcessStatusConflictException
        || exception.Response.StatusCode == HttpStatusCode.PreconditionFailed;
}

internal abstract record ProcessingStatusAcquisition
{
    private ProcessingStatusAcquisition() { }

    internal sealed record Acquired(string State) : ProcessingStatusAcquisition;

    /// <summary>
    /// A lost process/next acquire completes without a continuation.
    /// </summary>
    internal sealed record Superseded(PlatformHttpException Exception) : ProcessingStatusAcquisition;

    /// <summary>
    /// A permanent callback failure.
    /// </summary>
    internal sealed record Rejected(string Message, string ExceptionType) : ProcessingStatusAcquisition;
}
