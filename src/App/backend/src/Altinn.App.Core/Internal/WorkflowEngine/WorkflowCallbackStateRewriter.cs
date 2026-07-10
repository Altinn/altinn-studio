using System.Text.Json;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// Derives a new signed workflow callback state blob from an existing one by replacing the
/// instance's process state. Used to give the side-effects workflow an initial state that
/// reflects the committed (NEW) process state: the side-effects workflow does not inherit the
/// Main workflow's evolved state, and its commands read the NEW <c>instance.Process</c>
/// (MovedToAltinnEvent reads <c>CurrentTask</c>, CompletedAltinnEvent reads <c>EndEvent</c>).
/// The rewrite mirrors what <see cref="Commands.MutateProcessState"/> does to the in-memory
/// instance, so the derived blob matches the state the Main workflow carries post-commit.
/// </summary>
internal sealed class WorkflowCallbackStateRewriter
{
    private readonly WorkflowStateSigner _stateSigner;

    public WorkflowCallbackStateRewriter(WorkflowStateSigner stateSigner)
    {
        _stateSigner = stateSigner;
    }

    /// <summary>
    /// Verifies <paramref name="signedState"/>, rewrites the embedded instance's process state to
    /// <paramref name="processState"/>, and re-signs. Form data is carried over unchanged (the
    /// side-effect commands never read form data).
    /// </summary>
    public string WithProcessState(string signedState, ProcessState processState)
    {
        string payload = _stateSigner.Verify(signedState);
        WorkflowCallbackState callbackState =
            JsonSerializer.Deserialize<WorkflowCallbackState>(payload)
            ?? throw new WorkflowCallbackStateException(
                "Failed to deserialize workflow callback state while deriving the side-effects state blob."
            );

        callbackState.Instance.Process = processState;
        return _stateSigner.Sign(JsonSerializer.Serialize(callbackState));
    }
}
