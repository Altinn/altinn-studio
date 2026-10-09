using System.Net;
using System.Text.Json;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
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
/// Claims processing ownership against the workflow's signed snapshot.
/// </summary>
internal sealed class ProcessingStatusAcquirer
{
    internal const string Key = "AcquireProcessingStatus";

    private static readonly IReadOnlyDictionary<string, StorageInstanceMutationContent> _noContentParts =
        new Dictionary<string, StorageInstanceMutationContent>(StringComparer.Ordinal);

    private readonly WorkflowCallbackStateService _stateService;
    private readonly IInstanceMutationClient _mutationClient;
    private readonly IInstanceClientWithStorageMetadata _instanceClient;
    private readonly ProcessTransitionBuilder _transitionBuilder;

    public ProcessingStatusAcquirer(
        WorkflowCallbackStateService stateService,
        IInstanceMutationClient mutationClient,
        IInstanceClientWithStorageMetadata instanceClient,
        ProcessTransitionBuilder transitionBuilder
    )
    {
        _stateService = stateService;
        _mutationClient = mutationClient;
        _instanceClient = instanceClient;
        _transitionBuilder = transitionBuilder;
    }

    /// <summary>
    /// Attempts the idle-to-processing transition for the snapshot carried in <paramref name="state"/>.
    /// </summary>
    public async Task<ProcessingStatusAcquisition> Acquire(
        InstanceIdentifier instanceId,
        AppCallbackPayload payload,
        string state,
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

        WorkflowCallbackState callbackState = _stateService.ReadState(instanceId, state);
        if (callbackState.Instance.Process is not { } process)
        {
            return new ProcessingStatusAcquisition.Rejected(
                "Workflow process status acquisition requires an initialized process state.",
                nameof(InvalidOperationException)
            );
        }

        // Build before claiming so a missing BPMN element cannot strand processing ownership.
        ProcessStateChange? transition = acquirePayload is { NextElementId: { } nextElementId }
            ? _transitionBuilder.Build(
                callbackState.Instance,
                nextElementId,
                acquirePayload.Action,
                payload.Actor,
                payload.ExecutionReferenceTime
            )
            : null;

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

        // The continuation cannot run before this step completes, so a replay can refetch the claimed snapshot.
        InstanceWithStorageMetadata acquired = result.Replayed
            ? await _instanceClient.GetInstanceWithStorageMetadata(
                callbackState.Instance,
                StorageAuthenticationMethod.ServiceOwner(),
                cancellationToken
            )
            : new InstanceWithStorageMetadata(result.Instance, result.Metadata);
        if (
            acquired.Metadata.InstanceVersion is not { } instanceVersion
            || acquired.Metadata.ProcessStateVersion is not { } processStateVersion
        )
        {
            throw new InvalidOperationException(
                $"Storage did not return complete versions after acquiring processing status for instance '{instanceId}'."
            );
        }

        string acquiredState = _stateService.SealState(
            callbackState with
            {
                Instance = acquired.Instance,
                InstanceVersion = instanceVersion,
                ProcessStateVersion = processStateVersion,
            }
        );

        return new ProcessingStatusAcquisition.Acquired(acquiredState, acquired.Instance, transition);
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

        return acquirePayload is { NextElementId.Length: > 0 };
    }

    private static bool IsLostRace(PlatformHttpException exception) =>
        exception is StorageProcessStatusConflictException
        || exception.Response.StatusCode == HttpStatusCode.PreconditionFailed;
}

internal abstract record ProcessingStatusAcquisition
{
    private ProcessingStatusAcquisition() { }

    internal sealed record Acquired(string State, Instance Instance, ProcessStateChange? Transition)
        : ProcessingStatusAcquisition;

    /// <summary>
    /// A lost process/next acquire completes without a continuation.
    /// </summary>
    internal sealed record Superseded(PlatformHttpException Exception) : ProcessingStatusAcquisition;

    /// <summary>
    /// A permanent callback failure.
    /// </summary>
    internal sealed record Rejected(string Message, string ExceptionType) : ProcessingStatusAcquisition;
}
