#nullable enable
using System;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Events;
using Altinn.App.Models.TransitionControl;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Code;

/// <summary>
/// Post-commit lever for the Task_1 → Task_2 transition.
///
/// This overrides the default <see cref="IEventsClient"/>. The workflow engine runs
/// <c>MovedToAltinnEvent</c> POST-COMMIT (after the transition to Task_2 has been persisted to
/// Storage), and that command calls <see cref="AddEvent"/>. At that point the committed
/// <c>currentTask</c> is already Task_2 (non-null), so a delay/failure here is surfaced by the live
/// workflow-status as <c>processing</c> on the committed Task_2 — i.e. it IS frontend-observable,
/// unlike the legacy <c>IProcessEnd</c> which runs on the process-END transition (committed = ended
/// → status short-circuits to idle → receipt).
///
/// NOTE: <c>MovedToAltinnEvent.Execute</c> wraps any thrown exception as a RETRYABLE engine failure,
/// so the <c>failKind</c> lever is NOT honoured here — a post-commit failure always produces
/// processing/retrying (engine auto-retries), never a terminal failed/Retry-button state.
///
/// This is a test double: it never calls the real Events API. Normal transitions
/// (<c>phase != "postCommit"</c>) return a dummy event id immediately.
/// </summary>
public sealed class ControlEventsClient : IEventsClient
{
    private readonly IDataClient _dataClient;

    public ControlEventsClient(IDataClient dataClient)
    {
        _dataClient = dataClient;
    }

    public async Task<string> AddEvent(
        string eventType,
        Instance instance,
        StorageAuthenticationMethod? authenticationMethod = null
    )
    {
        // Only the forward Task_1 -> Task_2 transition is lever-controlled. MovedToAltinnEvent also
        // fires on the backwards (reject) Task_2 -> Task_1 transition, which must stay instant.
        if (eventType != "app.instance.process.movedTo.Task_2")
        {
            return Guid.NewGuid().ToString();
        }

        DataElement? dataElement = instance.Data.Find(x => x.DataType == "TransitionControl");
        if (dataElement is null)
        {
            return Guid.NewGuid().ToString();
        }

        var levers = (TransitionControl)await _dataClient.GetFormData(instance, dataElement);

        if (levers.phase != "postCommit")
        {
            return Guid.NewGuid().ToString();
        }

        int delayMs = levers.delayMs ?? 0;
        int failCount = levers.failCount ?? 0;

        if (delayMs > 0)
        {
            await Task.Delay(delayMs);
        }

        Guid instanceGuid = Guid.Parse(instance.Id.Split('/').Last());
        int attempt = AttemptTracker.Next(instanceGuid, "postCommit");
        if (attempt <= failCount)
        {
            // Thrown exceptions become a RETRYABLE failure (see MovedToAltinnEvent), so this drives
            // the engine into processing/retrying, not a terminal failed state.
            throw new Exception(
                $"TransitionControl forced a postCommit failure (attempt {attempt} of {failCount})."
            );
        }

        AttemptTracker.Reset(instanceGuid, "postCommit");
        return Guid.NewGuid().ToString();
    }
}
