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
/// Handles the callback for the <see cref="Key"/> step: claims the instance for a workflow by moving its
/// process status from idle to processing in Storage.
/// </summary>
/// <remarks>
/// <para>
/// This is deliberately not an <see cref="IWorkflowEngineCommand"/>. A command stages its changes for the callback
/// controller to commit after it returns; acquiring <em>is</em> the commit, and its outcome decides what happens
/// next. It is one compare-and-set against the snapshot the request validated: expected status idle, plus that
/// snapshot's instance and process-state versions. Any change Storage has accepted since then makes the snapshot
/// stale, and the acquire loses.
/// </para>
/// <para>
/// A process/next acquire also builds the transition its continuation carries out, to the element the request
/// decided. It builds before claiming: building runs no app code, so only a process definition without that element
/// can make it fail, as when the request and this callback reach different versions of the app during a deploy. The
/// engine then retries the step with nothing claimed.
/// </para>
/// <para>
/// A lost process/next acquire is an expected outcome rather than a failure. Nothing was claimed and nothing needs
/// undoing, so its workflow completes without a continuation, and a process/next queued behind it runs next. A
/// lost initial-process acquire fails its workflow permanently instead, because the remaining steps of that
/// workflow need ownership. Nothing else should reach a new instance before its first workflow runs, so it is not
/// expected to happen.
/// </para>
/// </remarks>
internal sealed class ProcessingStatusAcquirer
{
    /// <summary>
    /// The engine step key the acquire callback arrives under.
    /// </summary>
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
    /// <exception cref="WorkflowCallbackStateException">The state blob cannot be verified or does not target
    /// <paramref name="instanceId"/>.</exception>
    /// <exception cref="ProcessException">The process definition has no element with the id the request decided the
    /// process goes to.</exception>
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

        // Built from the snapshot: if the claim below wins, the acquired instance is that snapshot apart from its
        // status.
        ProcessStateChange? transition = acquirePayload is { NextElementId: { } nextElementId }
            ? _transitionBuilder.Build(
                callbackState.Instance,
                nextElementId,
                acquirePayload.Action,
                payload.Actor,
                payload.ExecutionReferenceTime
            )
            : null;

        // Storage carries the status inside the process payload, so the transition is sent as the snapshot's
        // whole process with the new status. The version preconditions make replacing the process safe.
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
                // The engine's step id is stable across every attempt of this step, so a retried callback
                // presents Storage the same key and cannot apply the transition twice.
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

        // A replay means an earlier attempt of this step acquired, and this attempt continues from what it left.
        // Nothing can have written since: the instance is processing, and its continuation cannot run before this
        // step completes.
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

        // The transition changes neither data elements nor their content, so the snapshot's form data still holds.
        RestoredWorkflowCallbackState restored = await _stateService.RestoreState(
            callbackState with
            {
                Instance = acquired.Instance,
                InstanceVersion = instanceVersion,
                ProcessStateVersion = processStateVersion,
            },
            payload.Actor.Language
        );

        return new ProcessingStatusAcquisition.Acquired(restored.UnitOfWork, restored.Carry, transition);
    }

    /// <summary>
    /// Reads the step payload. An absent payload is the initial-process acquire; a supplied one must be valid and
    /// name the element the process goes to.
    /// </summary>
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

    /// <summary>
    /// Storage refuses the compare-and-set when the status is no longer idle (a 409 typed
    /// <c>process_status_conflict</c>) or when the snapshot's versions are stale (412). Both mean another change
    /// got there first. Every other error is left to propagate, so the engine retries the step.
    /// </summary>
    private static bool IsLostRace(PlatformHttpException exception) =>
        exception is StorageProcessStatusConflictException
        || exception.Response.StatusCode == HttpStatusCode.PreconditionFailed;
}

/// <summary>
/// The outcome of <see cref="ProcessingStatusAcquirer.Acquire"/>, as a closed set of cases.
/// </summary>
internal abstract record ProcessingStatusAcquisition
{
    private ProcessingStatusAcquisition() { }

    /// <summary>
    /// The instance is now processing. The unit of work holds the acquired snapshot, and a process/next acquire
    /// carries the transition its continuation carries out.
    /// </summary>
    internal sealed record Acquired(
        InstanceDataUnitOfWork UnitOfWork,
        WorkflowCallbackStateCarry Carry,
        ProcessStateChange? Transition
    ) : ProcessingStatusAcquisition;

    /// <summary>
    /// A process/next acquire lost to a change Storage accepted after the request's snapshot. The workflow completes
    /// without a continuation.
    /// </summary>
    internal sealed record Superseded(PlatformHttpException Exception) : ProcessingStatusAcquisition;

    /// <summary>
    /// The callback cannot be acted on, and retrying would not change that.
    /// </summary>
    internal sealed record Rejected(string Message, string ExceptionType) : ProcessingStatusAcquisition;
}
