#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Events;
using Altinn.App.Models.TransitionControl;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Options;

namespace Altinn.App.Logic;

/// <summary>
/// Post-commit lever for the Task_1 → Task_2 transition (<c>path == "postCommit"</c>).
///
/// This overrides the default <see cref="IEventsClient"/>. The workflow engine runs
/// <c>MovedToAltinnEvent</c> POST-COMMIT (after the transition to Task_2 has been persisted to
/// Storage), and that command calls <see cref="AddEvent"/>. At that point the committed
/// <c>currentTask</c> is already Task_2 (non-null), so a delay/failure here is surfaced by the live
/// workflow-status as <c>processing</c> on the committed Task_2 — i.e. it IS frontend-observable,
/// unlike the legacy <c>IProcessEnd</c> which runs on the process-END transition (committed = ended
/// → status short-circuits to idle → receipt).
///
/// Scenario shape: inject <c>delayMs</c> on every attempt, fail retryably <c>retries</c> times, then
/// settle on <c>endState</c> — either <c>success</c> (dummy event id returned) or <c>failure</c>
/// (terminal failure).
///
/// TERMINAL FAILURE: <c>MovedToAltinnEvent.Execute</c> wraps any thrown exception as a RETRYABLE
/// engine failure, so a plain throw can only ever produce processing/retrying — never a terminal
/// state. To honour <c>endState == "failure"</c> here we cheat: once the retries are spent, before
/// the final throw we POST a cancellation request straight to the workflow engine for the in-flight
/// transition workflow. A requested cancellation "wins" over the imminent retryable failure — the
/// engine converts it to a terminal <c>Canceled</c> state, which the live workflow-status renders as
/// <c>failed</c> (no auto-retry, manual-refresh recovery).
///
/// This is a test double: it never calls the real Events API. Non-postCommit transitions return a
/// dummy event id immediately.
/// </summary>
public sealed class EventsClient(
    IDataClient dataClient,
    IHttpClientFactory httpClientFactory,
    IOptions<PlatformSettings> platformSettings
) : IEventsClient
{
    private readonly string _engineBaseUrl =
        platformSettings.Value.ApiWorkflowEngineEndpoint.TrimEnd('/');

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

        var levers = (TransitionControl)await dataClient.GetFormData(instance, dataElement);

        if (levers.path != "postCommit")
        {
            return Guid.NewGuid().ToString();
        }

        int delayMs = levers.delayMs ?? 0;
        int retries = levers.retries ?? 0;
        bool endInFailure = levers.endState == "failure";

        if (delayMs > 0)
        {
            await Task.Delay(delayMs);
        }

        Guid instanceGuid = Guid.Parse(instance.Id.Split('/').Last());
        int attempt = AttemptTracker.Next(instanceGuid, "postCommit");
        if (attempt <= retries)
        {
            // Transient failure: a thrown exception becomes a RETRYABLE failure (see
            // MovedToAltinnEvent), so the engine will re-invoke this hook on the next attempt.
            throw new Exception(
                $"TransitionControl forced a transient postCommit failure (attempt {attempt} of {retries})."
            );
        }

        // Retries spent: settle on the configured end state. Reset first so replaying the scenario
        // (e.g. after navigating back from Task_2) starts again from attempt 1.
        AttemptTracker.Reset(instanceGuid, "postCommit");
        if (endInFailure)
        {
            // Every throw here is RETRYABLE, so a plain throw would retry forever. Cancel the
            // in-flight transition workflow first — the requested cancellation wins over the
            // imminent retryable failure and the engine resolves to a terminal Canceled state
            // (frontend: failed) instead of retrying.
            await RequestWorkflowCancellation(instance, instanceGuid);
            throw new Exception(
                $"TransitionControl forced a terminal postCommit failure after {retries} retr{(retries == 1 ? "y" : "ies")}."
            );
        }

        return Guid.NewGuid().ToString();
    }

    /// <summary>
    /// Test-only shortcut: reach past the app runtime and POST a cancellation straight to the
    /// workflow engine. The engine has no cancel-by-collection endpoint, so we resolve the
    /// instance's workflows by collection key (= the instance guid, matching the app's own
    /// <c>ProcessNextRequestFactory.CreateCollectionKey</c>) and cancel every one we find.
    /// Cancelling an already-terminal workflow is a harmless 409, so we don't filter by status.
    /// Best-effort: any transport failure just falls back to the plain retryable throw.
    /// </summary>
    private async Task RequestWorkflowCancellation(Instance instance, Guid instanceGuid)
    {
        // Namespace is "{org}/{app}" encoded as a SINGLE path segment (org%2Fapp), exactly as the
        // app's WorkflowEngineClient formats it. instance.AppId is already "{org}/{app}".
        string ns = Uri.EscapeDataString(instance.AppId);
        string collectionKey = Uri.EscapeDataString(instanceGuid.ToString());

        using HttpClient http = httpClientFactory.CreateClient();

        List<Guid> workflowIds;
        try
        {
            using HttpResponseMessage listResponse = await http.GetAsync(
                $"{_engineBaseUrl}/{ns}/workflows?collectionKey={collectionKey}"
            );
            if (
                listResponse.StatusCode == HttpStatusCode.NoContent
                || !listResponse.IsSuccessStatusCode
            )
            {
                return;
            }

            WorkflowListPage? page =
                await listResponse.Content.ReadFromJsonAsync<WorkflowListPage>();
            workflowIds = page?.Data?.Select(w => w.DatabaseId).ToList() ?? [];
        }
        catch (HttpRequestException)
        {
            return;
        }

        foreach (Guid workflowId in workflowIds)
        {
            try
            {
                using HttpResponseMessage _ = await http.PostAsync(
                    $"{_engineBaseUrl}/{ns}/workflows/{workflowId}/cancel",
                    content: null
                );
                // 202/200 = cancellation (already) requested; 409 = already terminal. Either is fine.
            }
            catch (HttpRequestException)
            {
                // Best-effort: nothing to recover, the throw below still surfaces the failure.
            }
        }
    }

    // Minimal projections of the engine's PaginatedResponse<WorkflowStatusResponse>; we only need the
    // database ids to target the cancel endpoint.
    private sealed record WorkflowListPage
    {
        [JsonPropertyName("data")]
        public List<WorkflowSummary>? Data { get; init; }
    }

    private sealed record WorkflowSummary
    {
        [JsonPropertyName("databaseId")]
        public Guid DatabaseId { get; init; }
    }
}
