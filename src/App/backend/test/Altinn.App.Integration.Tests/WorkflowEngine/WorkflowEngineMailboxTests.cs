using System.Diagnostics;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using Altinn.App.Api.Models;
using Altinn.Platform.Storage.Interface.Models;
using Json.Patch;
using Json.Pointer;
using Xunit.Abstractions;

namespace Altinn.App.Integration.Tests.WorkflowEngine;

/// <summary>
/// The first end-to-end pass through a mailbox exchange: a service task whose stage opens a mailbox,
/// two messages forwarded into it from outside, and the task concluding on the second one — through a
/// real engine, a real mint, real receive workflows and the real integrity envelope.
/// </summary>
/// <remarks>
/// <para>
/// The unit tests own the pieces (mint outcomes, the relay's verdicts, the receipt-block guards); the
/// composition they cannot span is this: the mint really is its own engine step sitting immediately
/// before its declaring stage, the transition-into-the-task workflow really ends by enqueueing the
/// first receiver instead of a concluding step, and a multi-message exchange really walks
/// <c>AwaitNextReply</c> → successor receiver → conclusion → auto-advance.
/// </para>
/// <para>
/// Deliberately assertion-based rather than snapshot-based: this suite auto-accepts new and changed
/// snapshots locally, so a first-run snapshot would pin whatever the code happened to produce.
/// </para>
/// </remarks>
[Trait("Category", "Integration")]
[Collection(WorkflowEngineTestCollection.Name)]
public class WorkflowEngineMailboxTests(ITestOutputHelper output, AppFixtureClassFixture classFixture)
    : IClassFixture<AppFixtureClassFixture>
{
    private const string PrepareStageName = "PrepareDocuments";
    private const string SendStageName = "SendToArchive";
    private const string RecordStageName = "RecordDispatch";
    private const string MainOperationIdPrefix = "Process next:";
    private const string MailboxReceiveOperationIdPrefix = "Mailbox receive:";

    private const string AckPayload = """{"kind":"ack","reference":"ark-1"}""";
    private const string ReceiptPayload = """{"kind":"receipt","reference":"ark-1"}""";

    // Keep in sync with StudioctlEnvironment.WaitForEngineReady - the engine's host-exposed address.
    private static readonly Uri _engineBaseAddress = new("http://workflow-engine.local.altinn.cloud:8000");
    private static readonly TimeSpan _exchangeTimeout = TimeSpan.FromSeconds(90);

    [Fact]
    public async Task MailboxExchange_TwoMessages_MintsItsOwnStepAndConcludesOnTheSecondMessage()
    {
        await using var fixtureScope = await classFixture.Get(
            output,
            TestApps.Basic,
            scenario: "workflow-engine-mailbox"
        );
        var fixture = fixtureScope.Fixture;
        await ResetScenario(fixture);

        string token = await fixture.Auth.GetUserToken(userId: 1337);

        using var instantiationResponse = await fixture.Instances.PostSimplified(
            token,
            new InstansiationInstance { InstanceOwner = new InstanceOwner { PartyId = "501337" } }
        );
        using var instance = await instantiationResponse.Read<Instance>();
        Assert.Equal(HttpStatusCode.Created, instance.Response.StatusCode);
        Assert.Equal("Task_1", instance.Data.Model!.Process.CurrentTask!.ElementId);

        await PatchValidFormData(fixture, token, instance);

        // The task does not conclude here: its stages run, the first receiver is enqueued, and the
        // instance stays committed on Task_Service until a message answers.
        using var processNextResponse = await fixture.Instances.ProcessNext(token, instance);
        using var processState = await processNextResponse.Read<AppProcessState>();
        Assert.Equal(HttpStatusCode.OK, processState.Response.StatusCode);
        Assert.Equal("Task_Service", processState.Data.Model!.CurrentTask!.ElementId);

        using var engineClient = new HttpClient { BaseAddress = _engineBaseAddress };
        string ns = Uri.EscapeDataString(instance.Data.Model.AppId);
        string collectionKey = instance.Data.Model.Id.Split('/')[1];

        // ---- The mint is its own step, and it hugs the stage that sends ----
        EngineWorkflow main = await WaitForCompletedMainWorkflow(engineClient, ns, collectionKey, "Task_Service");
        List<string> mainOperationIds = main.Steps.Select(s => s.OperationId).ToList();

        int mintIndex = mainOperationIds.IndexOf("MintMailbox: 1");
        Assert.True(
            mintIndex >= 0,
            $"No mint step in the transition's step list: [{string.Join(", ", mainOperationIds)}]"
        );
        Assert.Equal("Completed", main.Steps[mintIndex].Status);

        // The mint hugs its declaring stage on both sides, which is why the scenario surrounds that stage
        // with plain ones. Behind: the deadline clock starts at the mint, so hoisting it to the front of
        // the stage list would let pre-send work erode the exchange's budget. Ahead: the stage must never
        // send without an address, so the mint cannot be deferred past it.
        Assert.Equal("ExecuteServiceTask: 0", mainOperationIds[mintIndex - 1]);
        Assert.Equal("ExecuteServiceTask: 1", mainOperationIds[mintIndex + 1]);
        Assert.Single(mainOperationIds, id => id.StartsWith("MintMailbox", StringComparison.Ordinal));
        Assert.Contains("ExecuteServiceTask: 2", mainOperationIds);

        // A mailbox-opening task expands to no concluding Main step - the reply handler runs on the
        // receive workflows - and Main ends by enqueueing the first receiver, so the frontier is never
        // empty while the exchange is open.
        //
        // Exact-match, not substring: this is the collection overload of DoesNotContain, and the bare
        // concluding step's OperationId is literally "ExecuteServiceTask" (the stage steps carry a
        // ": {index}" suffix). Rewriting it as a StartsWith predicate would invert the assertion into one
        // that can never hold.
        Assert.DoesNotContain("ExecuteServiceTask", mainOperationIds);
        Assert.Equal("EnqueueReceiveWorkflow", mainOperationIds[^1]);

        // ---- The address reached the declaring stage, once ----
        ExchangeState afterSend = await WaitForExchangeState(fixture, state => state.MailboxId is not null);
        Guid mailboxId = afterSend.MailboxId!.Value;
        Assert.NotEqual(Guid.Empty, mailboxId);
        Assert.NotNull(afterSend.Deadline);
        Assert.True(
            afterSend.Deadline > DateTimeOffset.UtcNow,
            $"The mailbox deadline {afterSend.Deadline} had already passed when the address was read."
        );
        Assert.Empty(afterSend.Messages);

        // ---- Message 1: handled, exchange stays open ----
        await ForwardReply(fixture, mailboxId, idempotencyKey: "archive-ack-1", payload: AckPayload);
        ExchangeState afterAck = await WaitForExchangeState(fixture, state => state.Messages.Count >= 1);
        RecordedMessage ack = afterAck.Messages[0];
        Assert.Equal(AckPayload, ack.Payload);
        Assert.Equal("archive-ack-1", ack.IdempotencyKey);
        Assert.Equal(0, ack.Position);

        // ---- Message 2: concludes the task, which auto-advances the process ----
        await ForwardReply(fixture, mailboxId, idempotencyKey: "archive-receipt-1", payload: ReceiptPayload);
        await WaitForProcessEnd(fixture, token, instance);

        ExchangeState finalState = await GetExchangeState(fixture);
        Assert.Equal(2, finalState.Messages.Count);
        RecordedMessage receipt = finalState.Messages[1];
        Assert.Equal(ReceiptPayload, receipt.Payload);
        Assert.Equal("archive-receipt-1", receipt.IdempotencyKey);
        Assert.Equal(1, receipt.Position);

        // The closure handler is the scenario's tripwire: reaching it would mean the engine dispatched
        // to the wrong half of the exchange, and it concludes permanently failed on purpose.
        Assert.Null(finalState.ClosedReason);

        // Neither stage ever ran twice - the conclusion lives on the receive workflows, not on a
        // re-entry into the pipeline.
        Assert.Equal(1, Assert.Contains(PrepareStageName, finalState.Runs));
        Assert.Equal(1, Assert.Contains(SendStageName, finalState.Runs));
        Assert.Equal(1, Assert.Contains(RecordStageName, finalState.Runs));

        // ---- Invariant 2, from the engine's own books: the conclusion closed the mailbox ----
        // Neither ClosedReason nor the end event can see this: Conclude closes the mailbox and *then*
        // enqueues the after-workflow, so a conclusion that skipped the close would still auto-advance and
        // still leave this app's onClosed unrun. Read after WaitForProcessEnd, so ordered after the close
        // rather than racing it; the engine's retention period is 60 days, so the row is still there.
        EngineMailbox mailbox = await GetMailbox(engineClient, ns, mailboxId);
        Assert.Equal("Disposed", mailbox.Status);
        // "Request" and not "Deadline": the closure came from this task concluding, not from the engine's
        // deadline sweep - the other half of the tripwire, in the engine's words rather than the app's.
        Assert.Equal("Request", mailbox.DisposedReason);

        // Two deliveries accepted, two receivers enqueued, nothing left unread - the two-messages/
        // two-receivers correspondence as the engine counted it, independent of the scenario's own
        // recorder.
        Assert.Equal(2, mailbox.NextIdx);
        Assert.Equal(2, mailbox.NextSeq);
        Assert.Equal(0, mailbox.UnconsumedDeliveries);

        // The declaration's Timeout reached the mint, and the mint keyed the mailbox on the executing
        // step id under the instance's collection key - so a replayed attempt of that step is handed this
        // same mailbox instead of minting an orphan.
        Assert.Equal(TimeSpan.FromMinutes(20), mailbox.Timeout);
        Assert.Equal(collectionKey, mailbox.CollectionKey);

        // Bridges two halves that never meet in one process: MintMailbox keys the mint on the stepId the
        // engine sent it on this callback, and the workflow read reports each step's own databaseId. The
        // assertion holds only because those are the same id - the app's stated contract for
        // AppCallbackPayload.StepId ("the engine's identity for the step being executed"). Should it go
        // red, suspect that bridge before suspecting the mint: an engine reporting a different id here is
        // breaking the callback contract, which is worth knowing either way.
        Assert.Equal(main.Steps[mintIndex].DatabaseId.ToString(), mailbox.IdempotencyKey);

        // ---- One receive workflow per message: the first one's AwaitNextReply enqueued the second ----
        List<EngineWorkflow> workflows = await ListWorkflows(engineClient, ns, collectionKey);
        List<EngineWorkflow> receivers = workflows
            .Where(w => w.OperationId.StartsWith(MailboxReceiveOperationIdPrefix, StringComparison.Ordinal))
            .ToList();
        Assert.Equal(2, receivers.Count);
        Assert.All(
            receivers,
            receiver =>
            {
                Assert.Equal("Completed", receiver.OverallStatus);
                EngineStep step = Assert.Single(receiver.Steps);
                Assert.Equal("ExecuteServiceTask", step.OperationId);
            }
        );

        // ---- And the journey the log tells ----
        string logs = await fixture.GetSnapshotAppLogs();
        AssertInOrder(
            logs,
            "Mailbox.PrepareDocuments.Run1.Completed",
            "Mailbox.SendToArchive.Run1.Published",
            "Mailbox.RecordDispatch.Run1.Completed",
            "Mailbox.Forward.archive-ack-1.Accepted",
            "Mailbox.OnMessage.Position0.Ack.AwaitNextReply",
            "Mailbox.Forward.archive-receipt-1.Accepted",
            "Mailbox.OnMessage.Position1.Receipt.Success"
        );
        Assert.DoesNotContain("Mailbox.OnClosed.", logs);
        Assert.DoesNotContain("Tripwire", logs);
        Assert.DoesNotContain("Mailbox.SendToArchive.Run2", logs);
        Assert.DoesNotContain("Mailbox.OnMessage.Position2", logs);
    }

    private static async Task ResetScenario(AppFixture fixture)
    {
        using var response = await fixture.GetDirectAppClient().PostAsync("/test/workflow-engine-mailbox/reset", null);
        response.EnsureSuccessStatusCode();
    }

    private static async Task ForwardReply(AppFixture fixture, Guid mailboxId, string idempotencyKey, string payload)
    {
        using var content = new StringContent(payload, Encoding.UTF8, "application/json");
        using var response = await fixture
            .GetDirectAppClient()
            .PostAsync(
                $"/test/workflow-engine-mailbox/reply?mailboxId={mailboxId}"
                    + $"&idempotencyKey={Uri.EscapeDataString(idempotencyKey)}",
                content
            );
        if (!response.IsSuccessStatusCode)
        {
            Assert.Fail(
                $"Forwarding '{idempotencyKey}' into mailbox {mailboxId} failed with {(int)response.StatusCode}: "
                    + await response.Content.ReadAsStringAsync()
            );
        }
    }

    private static async Task<ExchangeState> GetExchangeState(AppFixture fixture)
    {
        using var response = await fixture.GetDirectAppClient().GetAsync("/test/workflow-engine-mailbox/state");
        response.EnsureSuccessStatusCode();
        string body = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<ExchangeState>(body, _stateSerializerOptions)!;
    }

    private static async Task<ExchangeState> WaitForExchangeState(
        AppFixture fixture,
        Func<ExchangeState, bool> predicate
    )
    {
        DateTimeOffset deadline = DateTimeOffset.UtcNow + _exchangeTimeout;
        ExchangeState state = await GetExchangeState(fixture);
        while (!predicate(state))
        {
            if (DateTimeOffset.UtcNow >= deadline)
            {
                Assert.Fail(
                    $"The exchange did not reach the expected state within {_exchangeTimeout.TotalSeconds:0}s. "
                        + $"Last seen: {JsonSerializer.Serialize(state, _stateSerializerOptions)}\n"
                        + $"----- APP LOGS -----\n{await fixture.GetAppLogs()}"
                );
            }

            await Task.Delay(TimeSpan.FromMilliseconds(500));
            state = await GetExchangeState(fixture);
        }

        return state;
    }

    private static async Task<EngineWorkflow> WaitForCompletedMainWorkflow(
        HttpClient engineClient,
        string ns,
        string collectionKey,
        string targetTask
    )
    {
        DateTimeOffset deadline = DateTimeOffset.UtcNow + _exchangeTimeout;
        string seen = "(nothing)";
        while (DateTimeOffset.UtcNow < deadline)
        {
            List<EngineWorkflow> workflows = await ListWorkflows(engineClient, ns, collectionKey);
            List<EngineWorkflow> candidates = workflows
                .Where(w =>
                    w.OperationId.StartsWith(MainOperationIdPrefix, StringComparison.Ordinal)
                    && w.OperationId.EndsWith($"-> {targetTask}", StringComparison.Ordinal)
                )
                .ToList();
            if (candidates.SingleOrDefault(w => w.OverallStatus == "Completed") is { } completed)
                return completed;

            seen = string.Join(", ", workflows.Select(w => $"{w.OperationId}: {w.OverallStatus}"));
            await Task.Delay(TimeSpan.FromMilliseconds(500));
        }

        Assert.Fail(
            $"No completed '{MainOperationIdPrefix} ... -> {targetTask}' workflow within "
                + $"{_exchangeTimeout.TotalSeconds:0}s. Saw: [{seen}]"
        );
        throw new UnreachableException();
    }

    private static async Task<EngineMailbox> GetMailbox(HttpClient engineClient, string ns, Guid mailboxId)
    {
        using var response = await engineClient.GetAsync($"/api/v1/{ns}/mailboxes/{mailboxId}");
        if (!response.IsSuccessStatusCode)
        {
            Assert.Fail(
                $"Reading mailbox {mailboxId} back from the engine failed with {(int)response.StatusCode}: "
                    + await response.Content.ReadAsStringAsync()
            );
        }

        return JsonSerializer.Deserialize<EngineMailbox>(await response.Content.ReadAsStringAsync())!;
    }

    private static async Task<List<EngineWorkflow>> ListWorkflows(
        HttpClient engineClient,
        string ns,
        string collectionKey
    )
    {
        using var response = await engineClient.GetAsync(
            $"/api/v1/{ns}/workflows?collectionKey={Uri.EscapeDataString(collectionKey)}&pageSize=100"
        );
        if (response.StatusCode == HttpStatusCode.NoContent)
            return [];
        response.EnsureSuccessStatusCode();

        string body = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<EnginePage>(body)!.Data;
    }

    private static async Task WaitForProcessEnd(
        AppFixture fixture,
        string token,
        AppFixture.ReadApiResponse<Instance> instance
    )
    {
        DateTimeOffset deadline = DateTimeOffset.UtcNow + _exchangeTimeout;
        string? lastSeenTask = null;
        while (DateTimeOffset.UtcNow < deadline)
        {
            using var refreshedResponse = await fixture.Instances.Get(token, instance);
            using var refreshed = await refreshedResponse.Read<Instance>();
            if (refreshed.Data.Model?.Process?.EndEvent == "EndEvent_1")
                return;

            lastSeenTask = refreshed.Data.Model?.Process?.CurrentTask?.ElementId;
            await Task.Delay(TimeSpan.FromMilliseconds(500));
        }

        Assert.Fail(
            $"The exchange did not conclude: the process never reached EndEvent_1 within "
                + $"{_exchangeTimeout.TotalSeconds:0}s (last seen task: {lastSeenTask}).\n"
                + $"----- APP LOGS -----\n{await fixture.GetAppLogs()}"
        );
    }

    private static async Task PatchValidFormData(
        AppFixture fixture,
        string token,
        AppFixture.ReadApiResponse<Instance> instance
    )
    {
        Guid dataElementId = Guid.Parse(instance.Data.Model!.Data.Single(d => d.DataType == "model").Id);
        using var patchResponse = await fixture.Instances.PatchFormData(
            token,
            instance,
            new DataPatchRequestMultiple
            {
                Patches =
                [
                    new(
                        dataElementId,
                        new JsonPatch(
                            PatchOperation.Replace(JsonPointer.Create("property1"), JsonNode.Parse("\"2\"")),
                            PatchOperation.Replace(JsonPointer.Create("property2"), JsonNode.Parse("\"2\""))
                        )
                    ),
                ],
                IgnoredValidators = null,
            }
        );
        using var readPatchResponse = await patchResponse.Read<DataPatchResponseMultiple>();
        Assert.Equal(HttpStatusCode.OK, readPatchResponse.Response.StatusCode);
    }

    private static void AssertInOrder(string logs, params string[] messages)
    {
        int previousIndex = -1;
        foreach (string message in messages)
        {
            int index = logs.IndexOf(message, previousIndex + 1, StringComparison.Ordinal);
            Assert.True(index >= 0, $"Could not find '{message}' after index {previousIndex} in logs:\n{logs}");
            previousIndex = index;
        }
    }

    private static readonly JsonSerializerOptions _stateSerializerOptions = new(JsonSerializerDefaults.Web);

    private sealed record ExchangeState(
        Guid? MailboxId,
        DateTimeOffset? Deadline,
        List<RecordedMessage> Messages,
        string? ClosedReason,
        Dictionary<string, int> Runs
    );

    private sealed record RecordedMessage(string Payload, string IdempotencyKey, long Position);

    private sealed record EnginePage([property: JsonPropertyName("data")] List<EngineWorkflow> Data);

    private sealed record EngineWorkflow(
        [property: JsonPropertyName("operationId")] string OperationId,
        [property: JsonPropertyName("overallStatus")] string OverallStatus,
        [property: JsonPropertyName("steps")] List<EngineStep> Steps
    );

    private sealed record EngineStep(
        [property: JsonPropertyName("databaseId")] Guid DatabaseId,
        [property: JsonPropertyName("operationId")] string OperationId,
        [property: JsonPropertyName("status")] string Status
    );

    private sealed record EngineMailbox(
        [property: JsonPropertyName("idempotencyKey")] string IdempotencyKey,
        [property: JsonPropertyName("collectionKey")] string? CollectionKey,
        [property: JsonPropertyName("timeout")] TimeSpan Timeout,
        [property: JsonPropertyName("status")] string Status,
        [property: JsonPropertyName("disposedReason")] string? DisposedReason,
        [property: JsonPropertyName("nextIdx")] long NextIdx,
        [property: JsonPropertyName("nextSeq")] long NextSeq,
        [property: JsonPropertyName("unconsumedDeliveries")] long UnconsumedDeliveries
    );
}
