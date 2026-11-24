using System.Diagnostics;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Api.Models;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.Platform.Storage.Interface.Models;
using Xunit.Abstractions;

namespace Altinn.App.Integration.Tests.WorkflowEngine;

/// <summary>
/// Two external stages in one task, in one relay chain: transition → the archive's receivers → close →
/// <em>continuation</em> → the journal's receiver → close → process-next. This is the composition no unit test
/// can span, because the continuation is a real engine workflow enqueued from inside a receiver that has not
/// settled yet, and because "the frontier is never empty" is a property of what the collection looks like
/// *between* two hops.
/// </summary>
/// <remarks>
/// <para>
/// The scenario's <c>Task_Sequential</c> composes <c>ExternalStage(SendToArchive, HandleArchiveReply) →
/// ExternalStage(SendToJournal, HandleJournalReply)</c>. The archive answers twice (ack, then receipt) and the
/// journal once; the journal's send rides the continuation the archive's completion starts, so this is where the
/// continuation's identity, steps and deadline clock are pinned.
/// </para>
/// <para>
/// Deliberately assertion-based rather than snapshot-based, for the reason
/// <see cref="WorkflowEngineMailboxTests"/> gives: this suite auto-accepts new and changed snapshots
/// locally, so a first-run snapshot would pin whatever the code happened to produce. Nothing here shares state
/// with the single-exchange suite.
/// </para>
/// </remarks>
[Trait("Category", "Integration")]
[Collection(WorkflowEngineTestCollection.Name)]
public class WorkflowEngineMailboxMultiExchangeTests(ITestOutputHelper output, AppFixtureClassFixture classFixture)
    : IClassFixture<AppFixtureClassFixture>
{
    private const string DataTaskId = "Task_1";
    private const string SequentialTaskId = "Task_Sequential";

    private const string ArchiveStage = "SendToArchive";
    private const string JournalStage = "SendToJournal";

    private const string PrimaryOperationIdPrefix = "Process next:";
    private const string MailboxReceiveOperationIdPrefix = "Mailbox receive:";
    private const string MailboxContinueOperationIdPrefix = "Mailbox continue:";

    private const string AckPayload = """{"kind":"ack","reference":"ark-1"}""";
    private const string ReceiptPayload = """{"kind":"receipt","reference":"ark-1"}""";

    /// <summary>
    /// Both external stages declare this; kept in sync with the scenario's <c>ExchangeTimeout</c>.
    /// </summary>
    private static readonly TimeSpan _declaredTimeout = TimeSpan.FromMinutes(20);

    // Keep in sync with StudioctlEnvironment.WaitForEngineReady - the engine's host-exposed address.
    private static readonly Uri _engineBaseAddress = new("http://workflow-engine.local.altinn.cloud:8000");
    private static readonly TimeSpan _exchangeTimeout = TimeSpan.FromSeconds(90);

    /// <summary>
    /// A deliberate pause inside the first exchange, so the gap between the two mailboxes' deadlines is
    /// larger than any plausible scheduling jitter. The two deadlines are stamped by the same clock on the
    /// same code path, so their difference <em>is</em> the time between the two mints — which is the whole
    /// content of "each deadline runs from its own send".
    /// </summary>
    private static readonly TimeSpan _mintSeparation = TimeSpan.FromSeconds(5);

    /// <summary>
    /// The statuses a workflow never leaves. Everything else — including <c>Held</c> and <c>Waiting</c> —
    /// is active, and the engine's own doctrine is that consumers must never read those as settled.
    /// </summary>
    private static readonly string[] _terminalStatuses =
    [
        "Completed",
        "Failed",
        "Canceled",
        "DependencyFailed",
        "Abandoned",
    ];

    [Fact]
    public async Task ExternalStages_TwoInSequence_ChainThroughAContinuationToTheEndEvent()
    {
        await using var fixtureScope = await classFixture.Get(
            output,
            TestApps.Basic,
            scenario: "workflow-engine-mailbox-multi"
        );
        var fixture = fixtureScope.Fixture;
        await ResetScenario(fixture);

        string token = await fixture.Auth.GetUserToken(userId: 1337);

        using var instantiationResponse = await fixture.Instances.PostSimplified(
            token,
            new InstantiationInstance { InstanceOwner = new InstanceOwner { PartyId = "501337" } }
        );
        using var instance = await instantiationResponse.Read<Instance>();
        Assert.Equal(HttpStatusCode.Created, instance.Response.StatusCode);
        Assert.Equal(DataTaskId, instance.Data.Model!.Process.CurrentTask!.ElementId);

        await PatchValidFormData(fixture, token, instance);

        // The transition only opens the first mailbox, so the call is accepted while it waits for a message.
        using var processNextResponse = await fixture.Instances.ProcessNext(token, instance);
        using var processState = await processNextResponse.Read<AppProcessState>();
        Assert.Equal(HttpStatusCode.Accepted, processState.Response.StatusCode);
        Assert.Equal(SequentialTaskId, processState.Data.Model!.CurrentTask!.ElementId);

        using var engineClient = new HttpClient { BaseAddress = _engineBaseAddress };
        string ns = Uri.EscapeDataString(instance.Data.Model.AppId);
        string collectionKey = instance.Data.Model.Id.Split('/')[1];

        // ================= The archive: the transition only opens the first mailbox =================

        EngineWorkflow sequentialPrimary = await WaitForCompletedPrimaryWorkflow(
            engineClient,
            ns,
            collectionKey,
            SequentialTaskId
        );

        // The mint hugs its send, so the transition carries the archive's mint and send and nothing of the
        // journal's: the journal's external stage starts only once the archive's is done with its replies. If
        // SendToJournal's mint appeared here, the journal's deadline would start burning during the archive's
        // exchange.
        Assert.Equal(new List<string> { "MintMailbox: 0", "ExecuteServiceTask: 0" }, PipelineSteps(sequentialPrimary));

        // The primary workflow ends with the send, whose completion enqueues the first receiver from
        // inside the still-unsettled step, so the frontier is never empty while the exchange is open. Read off the full
        // step list, not the pipeline subset: a transition step appended after the hand-over would break this and be
        // invisible to the assertion above.
        Assert.Equal("ExecuteServiceTask: 0", OperationIds(sequentialPrimary)[^1]);
        EngineStep archiveSendStep = sequentialPrimary.Steps.Single(step =>
            step.OperationId == "ExecuteServiceTask: 0"
        );

        MultiExchangeState afterSend = await WaitForState(fixture, state => state.Mailboxes.ContainsKey(ArchiveStage));
        Guid archiveId = afterSend.Mailboxes[ArchiveStage].Id;
        Assert.Empty(afterSend.Messages);

        // ---- Reply 1: the archive's reply handler awaits the next one ----
        await ForwardReply(fixture, archiveId, idempotencyKey: "archive-ack-1", payload: AckPayload);
        MultiExchangeState afterAck = await WaitForState(fixture, state => state.Messages.Count >= 1);
        RecordedMessage ack = afterAck.Messages[0];
        Assert.Equal(ArchiveStage, ack.Exchange);
        Assert.Equal(AckPayload, ack.Payload);
        Assert.Equal("archive-ack-1", ack.IdempotencyKey);
        Assert.Equal(0, ack.Position);

        // The margin the deadline assertion below leans on. Nothing about the exchange needs it.
        await Task.Delay(_mintSeparation);

        // ================= The hand-over: the archive's stage is done, the journal's starts =================

        // Sampled because there is no other way to see it: "the collection never reads all-settled" is a
        // statement about every instant between two hops, and nothing the engine records afterwards can
        // testify to it. The ordering invariants are *not* sampled - they are read off the engine's own
        // timestamps further down, which is both exact and free of jitter.
        //
        // The sampler stops on the event that bounds its window - the journal's receiver appearing -
        // rather than on a cancel the test issues once it has seen that receiver itself. Cancelling from
        // outside made the window's end a race the sampler usually lost: its last completed read could
        // predate the receiver by a whole iteration, leaving the window unbounded on that side.
        using var samplerDeadline = new CancellationTokenSource(_exchangeTimeout);
        // A receive workflow is named for its external stage's item index: the journal's is item 1.
        string journalReceiverOperationId = $"{MailboxReceiveOperationIdPrefix} {SequentialTaskId} · 1";
        Task<List<HandoverSample>> sampler = SampleHandover(
            engineClient,
            ns,
            collectionKey,
            archiveId,
            journalReceiverOperationId,
            samplerDeadline.Token
        );

        // ---- Reply 2: the archive's reply handler completes its stage, and the pipeline carries on ----
        await ForwardReply(fixture, archiveId, idempotencyKey: "archive-receipt-1", payload: ReceiptPayload);
        MultiExchangeState afterContinuation = await WaitForState(
            fixture,
            state => state.Mailboxes.ContainsKey(JournalStage)
        );

        List<HandoverSample> samples = await sampler;

        string trace = string.Join("\n  ", samples);

        // The two samples that carry the window's meaning must be real reads. An intermediate failure is
        // tolerated: this is ~40 requests racing the app's own callbacks, and failing the run over one of
        // them would report a transient read as a broken invariant. The trace is printed either way, and the
        // frontier assertions below simply skip what could not be read.
        Assert.Null(samples[0].Error);
        Assert.Null(samples[^1].Error);

        // The window has to straddle the hand-over from both sides, or the frontier claim below is a
        // statement about an interval in which nothing happened. Before: the mailbox still open and no
        // receiver for the journal. After: that receiver seen, which is what stopped the sampler.
        Assert.False(
            samples[0].NextReceiverExists,
            $"The sampler started after the journal's receiver already existed:\n  {trace}"
        );
        Assert.Equal("Open", samples[0].MailboxStatus);
        Assert.True(
            samples[^1].NextReceiverExists,
            $"The sampler ran out its {_exchangeTimeout.TotalSeconds:0}s deadline without ever seeing the journal's "
                + $"receiver, so the continuation never enqueued it:\n  {trace}"
        );

        // The only claim here that genuinely needs sampling: a head set that has gone empty, or whose every
        // head is terminal, is a frontier a downstream consumer would read as "this instance is done" while the
        // task is still mid-exchange. Close-before-continue is *not* checked here - see the timestamp assertion
        // further down, which pins the real ordering without jitter.
        foreach (HandoverSample sample in samples.Where(sample => sample.Error is null))
        {
            Assert.False(
                sample.HeadStatuses.Count == 0,
                $"The collection had no heads at {sample.At:O} - the frontier went empty mid-exchange.\n  {trace}"
            );
            Assert.False(
                sample.HeadStatuses.All(status => _terminalStatuses.Contains(status)),
                $"The collection read all-settled at {sample.At:O} while the task was mid-exchange.\n  {trace}"
            );
        }

        // ================= The continuation, as the engine recorded it =================

        List<EngineWorkflow> workflows = await ListWorkflows(engineClient, ns, collectionKey);

        // The archive's two receivers, each the one step that runs the archive's reply handler: the first keyed
        // on the send that enqueued it, the second on the first receiver, whose AwaitNextReply enqueued it.
        EngineWorkflow firstArchiveReceiver = Single(
            workflows,
            $"{MailboxReceiveOperationIdPrefix} {SequentialTaskId} · 0"
        );
        Assert.Equal(new List<string> { "ExecuteServiceTask: 0" }, OperationIds(firstArchiveReceiver));
        Assert.Equal(archiveSendStep.DatabaseId.ToString(), firstArchiveReceiver.IdempotencyKey);

        EngineWorkflow completingReceiver = Single(
            workflows,
            $"{MailboxReceiveOperationIdPrefix} {SequentialTaskId} · after message 0"
        );
        EngineStep completingStep = Assert.Single(completingReceiver.Steps);
        Assert.Equal("ExecuteServiceTask: 0", completingStep.OperationId);
        Assert.Equal(
            Assert.Single(firstArchiveReceiver.Steps).DatabaseId.ToString(),
            completingReceiver.IdempotencyKey
        );

        // Polled, not read once. The sampler returns the instant the journal's receiver appears, and that receiver
        // exists because the continuation's last step's callback *returned* - the engine's write of the step
        // and workflow completion lands milliseconds later, so reading the status straight off the sighting
        // sees Processing on a contended runner.
        EngineWorkflow continuation = await WaitForCompletedWorkflow(
            engineClient,
            ns,
            collectionKey,
            // Named for the item it follows: the archive's external stage, item 0.
            $"{MailboxContinueOperationIdPrefix} {SequentialTaskId} · after 0"
        );

        // Each step performs at most one keyed enqueue, so the bare executing step id is the whole key -
        // here the step of the receiver whose reply handler completed the archive's stage, so a retried attempt of
        // that step continues onto the same workflow instead of starting a second one.
        Assert.Equal(completingStep.DatabaseId.ToString(), continuation.IdempotencyKey);

        // The workflow planned from the pipeline at this hop: the journal's external stage, its mint hugging its
        // send. The send is the workflow's last step, so completing it is what enqueues the journal's receiver -
        // from inside the still-unsettled step, so the continuation cannot settle before that receiver exists.
        Assert.Equal(new List<string> { "MintMailbox: 1", "ExecuteServiceTask: 1" }, OperationIds(continuation));
        EngineStep journalSendStep = continuation.Steps.Single(step => step.OperationId == "ExecuteServiceTask: 1");

        EngineWorkflow journalReceiver = Single(workflows, journalReceiverOperationId);
        Assert.Equal(new List<string> { "ExecuteServiceTask: 1" }, OperationIds(journalReceiver));
        Assert.Equal(journalSendStep.DatabaseId.ToString(), journalReceiver.IdempotencyKey);

        // A continuation runs a send; it is not a receiver, and declaring a mailbox would have parked it as
        // one. The receive-workflow marker is only on the dashboard projection, which is why this reads it
        // there; the mailbox counters asserted at the end pin the same thing from the public API's side.
        //
        // Read as a *differential* against a known receiver in the same payload, because the dashboard
        // serializes with WhenWritingNull and the DTO carries no [JsonPropertyName]: on a continuation the
        // field is simply absent, so a bare null-check would hold just as well if mailboxId were renamed or
        // dropped from the projection entirely. The receiver's non-null value is what proves the field is
        // still there and still populated for the workflows that do declare a mailbox.
        List<DashboardWorkflow> dashboard = await GetDashboardWorkflows(engineClient, collectionKey);
        Assert.Null(SingleDashboard(dashboard, continuation.DatabaseId).MailboxId);
        Assert.NotNull(SingleDashboard(dashboard, completingReceiver.DatabaseId).MailboxId);

        // The continuation is enqueued from inside the completing receiver — still running, still the
        // head — so the injected head dependency is exactly that receiver.
        Assert.True(continuation.IsHead);
        EngineWorkflow continuationDetail = await GetWorkflow(engineClient, ns, continuation.DatabaseId);
        Assert.NotNull(continuationDetail.Dependencies);
        Assert.Equal(completingReceiver.DatabaseId, Guid.Parse(Assert.Single(continuationDetail.Dependencies).Key));

        // The transition's labels are re-derived onto the continuation, so the collection lookup that gates
        // downstream work still finds this workflow once retention has purged the earlier ones. A
        // continuation invisible to that filter would let the next task start on an open exchange.
        Assert.NotNull(continuation.Labels);
        Assert.Equal(
            Guid.Parse(collectionKey).ToString("N"),
            Assert.Contains("processNextInstanceGuid", continuation.Labels)
        );
        Assert.Equal(SequentialTaskId, Assert.Contains("processNextTargetTask", continuation.Labels));

        // ================= The journal's clock started at the continuation =================

        Guid journalId = afterContinuation.Mailboxes[JournalStage].Id;
        EngineMailbox archiveMailbox = await GetMailbox(engineClient, ns, archiveId);
        EngineMailbox journalMailbox = await GetMailbox(engineClient, ns, journalId);
        Assert.Equal(_declaredTimeout, archiveMailbox.Timeout);
        Assert.Equal(_declaredTimeout, journalMailbox.Timeout);

        // ---- Close-before-continue, exactly ----
        // Both instants are stamped by the engine on the two hops' own rows, so this is the ordering itself
        // rather than an inference from when a poller happened to look: the mailbox stopped accepting
        // messages before the workflow that runs the next item existed at all. Reversing the two calls
        // in the relay's ConcludeAndContinue arm fails here, and *only* here - the receiver the hand-over
        // sampler watches for is enqueued by the continuation's last step, a whole engine hop later, so a
        // swapped close and enqueue is invisible to any amount of sampling.
        Assert.NotNull(archiveMailbox.DisposedAt);
        Assert.Equal("Request", archiveMailbox.DisposedReason);
        Assert.True(
            archiveMailbox.DisposedAt < continuation.CreatedAt,
            $"The archive's mailbox was closed at {archiveMailbox.DisposedAt:O}, which is not before the "
                + $"continuation it hands over to was created ({continuation.CreatedAt:O}). A message could have "
                + "landed in an external stage the pipeline had already moved past."
        );

        // Same timeout on both, so the difference between the deadlines is exactly the time between the two
        // mints - two values from one clock, no cross-clock comparison to be wrong about. The transition's
        // mint and the continuation's mint are a whole exchange apart, because the journal's external stage
        // starts only once the archive's is done.
        Assert.True(
            journalMailbox.Deadline - archiveMailbox.Deadline >= _mintSeparation,
            $"The journal's mailbox deadline ({journalMailbox.Deadline:O}) is not at least {_mintSeparation} later "
                + $"than the archive's ({archiveMailbox.Deadline:O}), so its clock did not start at the continuation."
        );

        // And the same claim anchored to the continuation itself: the mint cannot have run before the
        // workflow it rides existed. Tolerant in the permissive direction only - the assertion above is what
        // carries the weight.
        DateTimeOffset journalMintedAt = journalMailbox.Deadline - journalMailbox.Timeout;
        Assert.True(
            journalMintedAt >= continuation.CreatedAt - TimeSpan.FromSeconds(5),
            $"The journal's mailbox was minted at {journalMintedAt:O}, before the continuation that carries its "
                + $"mint step was even created ({continuation.CreatedAt:O})."
        );

        // The bridging trick, on the continuation's own mint step: MintMailbox keys the mailbox on the step id
        // the engine sent it, and the workflow read reports each step's databaseId. Should this go red, suspect
        // the callback contract before suspecting the mint.
        EngineStep journalMintStep = continuation.Steps.Single(step => step.OperationId == "MintMailbox: 1");
        Assert.Equal(journalMintStep.DatabaseId.ToString(), journalMailbox.IdempotencyKey);
        Assert.Equal(collectionKey, journalMailbox.CollectionKey);

        // The app saw the deadline the engine recorded - the address the send published is the real one.
        Assert.Equal(journalMailbox.Deadline, afterContinuation.Mailboxes[JournalStage].Deadline);

        // ================= The journal's reply completes the last item, and the task ends =================

        await ForwardReply(fixture, journalId, idempotencyKey: "journal-receipt-1", payload: ReceiptPayload);
        await WaitForProcessEnd(fixture, token, instance);

        // "Request" and not "Deadline": both closures came from this task, not from the engine's deadline sweep.
        EngineMailbox archiveAfterTask = await GetMailbox(engineClient, ns, archiveId);
        EngineMailbox journalAfterTask = await GetMailbox(engineClient, ns, journalId);
        Assert.Equal("Disposed", archiveAfterTask.Status);
        Assert.Equal("Request", archiveAfterTask.DisposedReason);
        Assert.Equal("Disposed", journalAfterTask.Status);
        Assert.Equal("Request", journalAfterTask.DisposedReason);

        // Two messages and two receivers on the archive's mailbox, one and one on the journal's, nothing left
        // unread. NextSeq counts the positions receivers consumed, so a continuation that had declared
        // either mailbox would show up here as a third (or second) consumer.
        Assert.Equal(2, archiveAfterTask.NextIdx);
        Assert.Equal(2, archiveAfterTask.NextSeq);
        Assert.Equal(0, archiveAfterTask.UnpairedDeliveries);
        Assert.Equal(1, journalAfterTask.NextIdx);
        Assert.Equal(1, journalAfterTask.NextSeq);
        Assert.Equal(0, journalAfterTask.UnpairedDeliveries);

        // One receive workflow per reply, all settled, and one continuation only: the journal's Completed comes
        // from the last item, so it ends the task without starting another workflow of the pipeline's. Read after
        // WaitForProcessEnd: the process continuation depends on the journal's receiver, so EndEvent_1 is
        // unreachable until that receiver has settled.
        List<EngineWorkflow> finalWorkflows = await ListWorkflows(engineClient, ns, collectionKey);
        List<EngineWorkflow> receivers = finalWorkflows
            .Where(w => w.OperationId.StartsWith(MailboxReceiveOperationIdPrefix, StringComparison.Ordinal))
            .ToList();
        Assert.Equal(3, receivers.Count);
        Assert.All(receivers, receiver => Assert.Equal("Completed", receiver.OverallStatus));
        Assert.Equal(
            new List<string> { $"{MailboxContinueOperationIdPrefix} {SequentialTaskId} · after 0" },
            finalWorkflows
                .Where(w => w.OperationId.StartsWith(MailboxContinueOperationIdPrefix, StringComparison.Ordinal))
                .Select(w => w.OperationId)
                .ToList()
        );

        // ================= What the app itself saw =================

        MultiExchangeState finalState = await GetState(fixture);

        // Both timeout handlers are tripwires: reaching one would mean a stage was never answered, or that the
        // engine handed a stage the closed signal instead of a reply. Both stay silent.
        Assert.Empty(finalState.Timeouts);

        Assert.Equal(2, finalState.Mailboxes.Count);
        Assert.Equal(
            new List<string> { $"{ArchiveStage}:0", $"{ArchiveStage}:1", $"{JournalStage}:0" },
            finalState.Messages.Select(message => $"{message.Exchange}:{message.Position}").ToList()
        );

        // No send re-ran: completing a stage never re-enters an earlier part of the pipeline.
        Assert.Equal(1, Assert.Contains(ArchiveStage, finalState.Runs));
        Assert.Equal(1, Assert.Contains(JournalStage, finalState.Runs));

        // ================= And the journey the log tells =================

        string logs = await fixture.GetSnapshotAppLogs();
        AssertInOrder(
            logs,
            "Multi.SendToArchive.Run1.Published",
            "Multi.Forward.archive-ack-1.Accepted",
            "Multi.Archive.OnReply.Position0.Ack.AwaitNextReply",
            "Multi.Forward.archive-receipt-1.Accepted",
            "Multi.Archive.OnReply.Position1.Receipt.Completed",
            "Multi.SendToJournal.Run1.Published",
            "Multi.Forward.journal-receipt-1.Accepted",
            "Multi.Journal.OnReply.Position0.Receipt.Completed"
        );
        Assert.DoesNotContain("Tripwire", logs);
        Assert.DoesNotContain("OnTimeout.", logs);
        Assert.DoesNotContain(".Run2.", logs);
    }

    /// <summary>
    /// One reading of the three things that have to hold together across the hand-over from the archive's stage
    /// to the journal's. The order inside a sample is load-bearing: the mailbox is read <em>before</em> the
    /// workflow list, so a sample that saw the next receiver while the mailbox was still open proves the close
    /// came too late rather than proving the sampler was slow.
    /// </summary>
    private sealed record HandoverSample(
        DateTimeOffset At,
        string? MailboxStatus,
        string? MailboxDisposedReason,
        bool NextReceiverExists,
        List<string> HeadStatuses,
        string? Error
    )
    {
        public override string ToString() =>
            Error is not null
                ? $"{At:HH:mm:ss.fff} ERROR {Error}"
                : $"{At:HH:mm:ss.fff} mailbox={MailboxStatus}/{MailboxDisposedReason ?? "-"} "
                    + $"nextReceiver={NextReceiverExists} heads=[{string.Join("|", HeadStatuses)}]";
    }

    /// <summary>
    /// Samples the collection's head statuses until it sees <paramref name="nextReceiverOperationId"/> exist,
    /// or until the token trips. Stopping on that sighting is what bounds the window the caller reasons over:
    /// the last sample is guaranteed to be the one that saw the receiver, so "the frontier never read
    /// all-settled" is a claim about the whole hand-over rather than about however long the sampler happened
    /// to run.
    /// </summary>
    /// <remarks>
    /// A failed read is recorded as a sample carrying its error rather than dropped: a sampler that silently
    /// skipped iterations would make the assertions it feeds look satisfied when they were never evaluated,
    /// which is exactly the failure mode that hides an invariant breach.
    /// </remarks>
    private static async Task<List<HandoverSample>> SampleHandover(
        HttpClient engineClient,
        string ns,
        string collectionKey,
        Guid mailboxId,
        string nextReceiverOperationId,
        CancellationToken cancellationToken
    )
    {
        var samples = new List<HandoverSample>();
        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                EngineMailbox mailbox = await GetMailbox(engineClient, ns, mailboxId);
                List<EngineWorkflow> workflows = await ListWorkflows(engineClient, ns, collectionKey);
                EngineCollection collection = await GetCollection(engineClient, ns, collectionKey);

                bool nextReceiverExists = workflows.Any(workflow => workflow.OperationId == nextReceiverOperationId);
                samples.Add(
                    new HandoverSample(
                        DateTimeOffset.UtcNow,
                        mailbox.Status,
                        mailbox.DisposedReason,
                        nextReceiverExists,
                        collection.Heads.Select(head => head.Status).ToList(),
                        Error: null
                    )
                );

                if (nextReceiverExists)
                {
                    return samples;
                }
            }
            catch (Exception ex) when (!cancellationToken.IsCancellationRequested)
            {
                samples.Add(
                    new HandoverSample(
                        DateTimeOffset.UtcNow,
                        MailboxStatus: null,
                        MailboxDisposedReason: null,
                        NextReceiverExists: false,
                        HeadStatuses: [],
                        Error: $"{ex.GetType().Name}: {ex.Message}"
                    )
                );
            }

            // Short enough that the hand-over cannot slip between two samples unobserved (each hop needs at
            // least one engine fetch cycle), long enough that the sampler is not itself load on the run.
            await Task.Delay(TimeSpan.FromMilliseconds(25), CancellationToken.None);
        }

        return samples;
    }

    private static List<string> OperationIds(EngineWorkflow workflow) =>
        workflow.Steps.OrderBy(step => step.ProcessingOrder).Select(step => step.OperationId).ToList();

    /// <summary>
    /// The pipeline's own steps within a workflow, in order. The primary workflow also carries the transition's
    /// steps (task end/start hooks, the state commit, the auxiliary enqueue), which have nothing to do
    /// with the pipeline's expansion and would make an exact-list assertion a restatement of the whole
    /// transition. A continuation carries nothing else, so its full step list is asserted directly.
    /// </summary>
    private static List<string> PipelineSteps(EngineWorkflow workflow) =>
        OperationIds(workflow)
            .Where(id =>
                id.StartsWith("MintMailbox", StringComparison.Ordinal)
                || id.StartsWith("ExecuteServiceTask", StringComparison.Ordinal)
            )
            .ToList();

    private static EngineWorkflow Single(List<EngineWorkflow> workflows, string operationId)
    {
        List<EngineWorkflow> matches = workflows.Where(w => w.OperationId == operationId).ToList();
        if (matches.Count != 1)
        {
            Assert.Fail(
                $"Expected exactly one workflow with operation id '{operationId}', found {matches.Count}. "
                    + $"The collection holds: [{string.Join(", ", workflows.Select(w => w.OperationId))}]"
            );
        }

        return matches[0];
    }

    private static async Task ResetScenario(AppFixture fixture)
    {
        using var response = await fixture
            .GetDirectAppClient()
            .PostAsync("/test/workflow-engine-mailbox-multi/reset", null);
        response.EnsureSuccessStatusCode();
    }

    private static async Task ForwardReply(AppFixture fixture, Guid mailboxId, string idempotencyKey, string payload)
    {
        using var content = new StringContent(payload, Encoding.UTF8, "application/json");
        using var response = await fixture
            .GetDirectAppClient()
            .PostAsync(
                $"/test/workflow-engine-mailbox-multi/reply?mailboxId={mailboxId}"
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

    private static async Task<MultiExchangeState> GetState(AppFixture fixture)
    {
        using var response = await fixture.GetDirectAppClient().GetAsync("/test/workflow-engine-mailbox-multi/state");
        response.EnsureSuccessStatusCode();
        string body = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<MultiExchangeState>(body, _stateSerializerOptions)!;
    }

    private static async Task<MultiExchangeState> WaitForState(
        AppFixture fixture,
        Func<MultiExchangeState, bool> predicate
    )
    {
        DateTimeOffset deadline = DateTimeOffset.UtcNow + _exchangeTimeout;
        MultiExchangeState state = await GetState(fixture);
        while (!predicate(state))
        {
            if (DateTimeOffset.UtcNow >= deadline)
            {
                Assert.Fail(
                    $"The exchanges did not reach the expected state within {_exchangeTimeout.TotalSeconds:0}s. "
                        + $"Last seen: {JsonSerializer.Serialize(state, _stateSerializerOptions)}\n"
                        + $"----- APP LOGS -----\n{await fixture.GetAppLogs()}"
                );
            }

            await Task.Delay(TimeSpan.FromMilliseconds(500));
            state = await GetState(fixture);
        }

        return state;
    }

    private static async Task<EngineWorkflow> WaitForCompletedPrimaryWorkflow(
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
                    w.OperationId.StartsWith(PrimaryOperationIdPrefix, StringComparison.Ordinal)
                    && w.OperationId.EndsWith($"-> {targetTask}", StringComparison.Ordinal)
                )
                .ToList();
            if (candidates.SingleOrDefault(w => w.OverallStatus == "Completed") is { } completed)
                return completed;

            seen = string.Join(", ", workflows.Select(w => $"{w.OperationId}: {w.OverallStatus}"));
            await Task.Delay(TimeSpan.FromMilliseconds(500));
        }

        Assert.Fail(
            $"No completed '{PrimaryOperationIdPrefix} ... -> {targetTask}' workflow within "
                + $"{_exchangeTimeout.TotalSeconds:0}s. Saw: [{seen}]"
        );
        throw new UnreachableException();
    }

    /// <summary>
    /// Waits for a workflow to exist <em>and</em> report Completed, and hands it back. Existence alone is not
    /// enough for anything read off the workflow's own row: a workflow becomes visible the moment its first
    /// step is enqueued, and its last step's completion is written after that step's callback has returned.
    /// </summary>
    private static async Task<EngineWorkflow> WaitForCompletedWorkflow(
        HttpClient engineClient,
        string ns,
        string collectionKey,
        string operationId
    )
    {
        DateTimeOffset deadline = DateTimeOffset.UtcNow + _exchangeTimeout;
        string seen = "(nothing)";
        while (DateTimeOffset.UtcNow < deadline)
        {
            List<EngineWorkflow> workflows = await ListWorkflows(engineClient, ns, collectionKey);
            List<EngineWorkflow> matches = workflows.FindAll(w => w.OperationId == operationId);

            // One hop produces one workflow, so a second is a duplicate enqueue rather than something the
            // poll should wait out - keyed calls exist precisely so a retried hop reuses the first. Reported
            // through Single, so waiting for a workflow and looking one up fail with the same message.
            if (matches.Count > 1)
            {
                Single(workflows, operationId);
            }

            if (matches.Count == 1)
            {
                if (matches[0].OverallStatus == "Completed")
                    return matches[0];

                seen = matches[0].OverallStatus;
            }

            await Task.Delay(TimeSpan.FromMilliseconds(250));
        }

        Assert.Fail(
            $"'{operationId}' did not complete within {_exchangeTimeout.TotalSeconds:0}s (last status: {seen})."
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

    private static async Task<EngineWorkflow> GetWorkflow(HttpClient engineClient, string ns, Guid workflowId)
    {
        using var response = await engineClient.GetAsync($"/api/v1/{ns}/workflows/{workflowId}");
        response.EnsureSuccessStatusCode();
        return JsonSerializer.Deserialize<EngineWorkflow>(await response.Content.ReadAsStringAsync())!;
    }

    private static async Task<EngineCollection> GetCollection(HttpClient engineClient, string ns, string collectionKey)
    {
        using var response = await engineClient.GetAsync(
            $"/api/v1/{ns}/collections/{Uri.EscapeDataString(collectionKey)}"
        );
        response.EnsureSuccessStatusCode();
        return JsonSerializer.Deserialize<EngineCollection>(await response.Content.ReadAsStringAsync())!;
    }

    /// <summary>
    /// The dashboard projection, which is the only surface exposing a workflow's receive-workflow marker
    /// (<c>mailboxId</c>) - the public workflow read omits it. Filtered by collection key alone, since the
    /// namespace this engine stores is already URL-escaped and would need escaping twice as a query value.
    /// </summary>
    private static async Task<List<DashboardWorkflow>> GetDashboardWorkflows(
        HttpClient engineClient,
        string collectionKey
    )
    {
        using var response = await engineClient.GetAsync(
            $"/dashboard/query?collectionKey={Uri.EscapeDataString(collectionKey)}"
                + "&status=Completed,Failed,Requeued,Waiting,Held,Enqueued,Processing,Canceled&limit=200"
        );
        response.EnsureSuccessStatusCode();
        return JsonSerializer.Deserialize<DashboardPage>(await response.Content.ReadAsStringAsync())!.Workflows;
    }

    private static DashboardWorkflow SingleDashboard(List<DashboardWorkflow> dashboard, Guid workflowId)
    {
        DashboardWorkflow? match = dashboard.SingleOrDefault(workflow => workflow.DatabaseId == workflowId);
        Assert.NotNull(match);
        return match;
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
            $"The task did not end: the process never reached EndEvent_1 within "
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
                        JsonPatchOperation.ParseList(
                            """
                            [
                                { "op": "replace", "path": "/property1", "value": "2" },
                                { "op": "replace", "path": "/property2", "value": "2" }
                            ]
                            """
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

    private sealed record MultiExchangeState(
        Dictionary<string, RecordedMailbox> Mailboxes,
        List<RecordedMessage> Messages,
        List<string> Timeouts,
        Dictionary<string, int> Runs
    );

    private sealed record RecordedMailbox(Guid Id, DateTimeOffset Deadline, string ServiceTaskType);

    private sealed record RecordedMessage(string Exchange, string Payload, string IdempotencyKey, long Position);

    private sealed record EnginePage([property: JsonPropertyName("data")] List<EngineWorkflow> Data);

    private sealed record EngineWorkflow(
        [property: JsonPropertyName("databaseId")] Guid DatabaseId,
        [property: JsonPropertyName("idempotencyKey")] string IdempotencyKey,
        [property: JsonPropertyName("operationId")] string OperationId,
        [property: JsonPropertyName("overallStatus")] string OverallStatus,
        [property: JsonPropertyName("createdAt")] DateTimeOffset CreatedAt,
        [property: JsonPropertyName("isHead")] bool? IsHead,
        [property: JsonPropertyName("labels")] Dictionary<string, string>? Labels,
        [property: JsonPropertyName("dependencies")] Dictionary<string, string>? Dependencies,
        [property: JsonPropertyName("steps")] List<EngineStep> Steps
    );

    private sealed record EngineStep(
        [property: JsonPropertyName("databaseId")] Guid DatabaseId,
        [property: JsonPropertyName("operationId")] string OperationId,
        [property: JsonPropertyName("processingOrder")] int ProcessingOrder,
        [property: JsonPropertyName("status")] string Status
    );

    private sealed record EngineCollection(
        [property: JsonPropertyName("key")] string Key,
        [property: JsonPropertyName("heads")] List<EngineCollectionHead> Heads
    );

    private sealed record EngineCollectionHead(
        [property: JsonPropertyName("databaseId")] Guid DatabaseId,
        [property: JsonPropertyName("status")] string Status
    );

    private sealed record EngineMailbox(
        [property: JsonPropertyName("idempotencyKey")] string IdempotencyKey,
        [property: JsonPropertyName("collectionKey")] string? CollectionKey,
        [property: JsonPropertyName("timeout")] TimeSpan Timeout,
        [property: JsonPropertyName("deadline")] DateTimeOffset Deadline,
        [property: JsonPropertyName("status")] string Status,
        [property: JsonPropertyName("disposedReason")] string? DisposedReason,
        [property: JsonPropertyName("disposedAt")] DateTimeOffset? DisposedAt,
        [property: JsonPropertyName("nextIdx")] long NextIdx,
        [property: JsonPropertyName("nextSeq")] long NextSeq,
        [property: JsonPropertyName("unpairedDeliveries")] long UnpairedDeliveries
    );

    private sealed record DashboardPage([property: JsonPropertyName("workflows")] List<DashboardWorkflow> Workflows);

    private sealed record DashboardWorkflow(
        [property: JsonPropertyName("databaseId")] Guid DatabaseId,
        [property: JsonPropertyName("operationId")] string OperationId,
        [property: JsonPropertyName("mailboxId")] Guid? MailboxId,
        [property: JsonPropertyName("isHead")] bool? IsHead
    );
}
