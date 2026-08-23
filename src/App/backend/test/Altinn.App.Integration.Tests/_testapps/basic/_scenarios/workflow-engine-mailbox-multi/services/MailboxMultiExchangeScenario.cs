using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.App.Core.Features.Process;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using TestApp.Shared;

#nullable enable

namespace Altinn.App.Integration.Tests.Scenarios.WorkflowEngineMailboxMulti;

/// <summary>
/// Two mailbox exchanges in one task, answered one after the other: "SendToArchive" opens the first,
/// a <see cref="ServiceTaskPipelineBuilder.HandleReplies"/> handler answers it <em>without</em>
/// concluding the task, and the segment that handler's conclusion starts opens the second
/// ("SendToJournal") which <see cref="ServiceTaskPipelineBuilder.ConcludeOnReplies"/> ends the task on.
/// </summary>
/// <remarks>
/// <para>
/// The archive answers twice (ack, then receipt) so the non-terminal handler exercises both of its
/// verdicts — <see cref="ServiceTaskStageExchangeResult.AwaitNextReply"/> onto a successor receiver, then
/// <see cref="ServiceTaskStageResult.Completed"/> onto the continuation. The journal answers once,
/// concluding.
/// </para>
/// <para>
/// The send that opens the second exchange sits <strong>after</strong> the first handler on purpose: that
/// is the placement decision 3 of the phase-2 plan leaves to the author, and it is what makes the second
/// mailbox's deadline clock start at the continuation rather than at the transition. The sibling task in
/// this scenario (<see cref="UpfrontExchangesServiceTask"/>) makes the same claim falsifiable from the
/// other side by putting both sends up front.
/// </para>
/// </remarks>
public sealed class SequentialExchangesServiceTask : IPipelineServiceTask
{
    /// <summary>The <c>altinn:taskType</c> of Task_Sequential in this scenario's BPMN.</summary>
    public const string ServiceTaskType = "mailbox-sequential";

    /// <summary>The stage that opens the first exchange — and that exchange's identity.</summary>
    public const string ArchiveStageName = "SendToArchive";

    /// <summary>The stage that opens the second exchange, composed after the first handler.</summary>
    public const string JournalStageName = "SendToJournal";

    /// <summary>
    /// Comfortably clear of the sum of the test's own waits, so a slow run fails on a test deadline that
    /// blames the clock rather than tripping <c>onClosed</c> and blaming the app. Both exchanges get the
    /// same budget, which is what makes the difference between their two deadlines equal to the time
    /// between their two mints — a comparison of two values stamped by the same clock.
    /// </summary>
    public static readonly TimeSpan ExchangeTimeout = TimeSpan.FromMinutes(20);

    public string Type => ServiceTaskType;

    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
        pipeline
            .Stage(
                ArchiveStageName,
                SendToArchive,
                new MailboxOptions { Timeout = ExchangeTimeout },
                out MailboxHandle archive
            )
            .HandleReplies(archive, onMessage: HandleArchiveMessage, onClosed: HandleArchiveClosed)
            .Stage(
                JournalStageName,
                SendToJournal,
                new MailboxOptions { Timeout = ExchangeTimeout },
                out MailboxHandle journal
            )
            .ConcludeOnReplies(journal, onMessage: HandleJournalMessage, onClosed: HandleJournalClosed);

    private Task<ServiceTaskStageResult> SendToArchive(ServiceTaskContext context, ServiceTaskMailbox mailbox)
    {
        int run = MultiExchangeRecorder.NextRun(ArchiveStageName);
        MultiExchangeRecorder.PublishAddress(ArchiveStageName, ServiceTaskType, mailbox.Id, mailbox.Deadline);
        SnapshotLogger.LogInfo($"Multi.SendToArchive.Run{run}.Published");
        return Task.FromResult(ServiceTaskStageResult.Completed());
    }

    private Task<ServiceTaskStageResult> SendToJournal(ServiceTaskContext context, ServiceTaskMailbox mailbox)
    {
        int run = MultiExchangeRecorder.NextRun(JournalStageName);
        MultiExchangeRecorder.PublishAddress(JournalStageName, ServiceTaskType, mailbox.Id, mailbox.Deadline);
        SnapshotLogger.LogInfo($"Multi.SendToJournal.Run{run}.Published");
        return Task.FromResult(ServiceTaskStageResult.Completed());
    }

    /// <summary>
    /// The non-terminal handler. <see cref="ServiceTaskStageResult.Completed"/> here means "this exchange
    /// is done, the pipeline carries on" — it cannot conclude the task and cannot ask the process to
    /// advance, because those live only on the vocabulary a terminal handler returns.
    /// </summary>
    private Task<ServiceTaskStageExchangeResult> HandleArchiveMessage(
        ServiceTaskContext context,
        ServiceTaskReply reply
    )
    {
        MultiExchangeRecorder.RecordMessage(ArchiveStageName, reply);
        string kind = ReadKind(reply.Payload);
        switch (kind)
        {
            case "ack":
                SnapshotLogger.LogInfo($"Multi.Archive.OnMessage.Position{reply.Position}.Ack.AwaitNextReply");
                return Task.FromResult<ServiceTaskStageExchangeResult>(ServiceTaskStageExchangeResult.AwaitNextReply());

            case "receipt":
                SnapshotLogger.LogInfo($"Multi.Archive.OnMessage.Position{reply.Position}.Receipt.Completed");
                return Task.FromResult<ServiceTaskStageExchangeResult>(ServiceTaskStageResult.Completed());

            default:
                SnapshotLogger.LogError($"Multi.Archive.OnMessage.Position{reply.Position}.Tripwire");
                return Task.FromResult<ServiceTaskStageExchangeResult>(
                    ServiceTaskStageResult.FailedPermanent(
                        $"The archive sent a message this task cannot read: '{kind}'."
                    )
                );
        }
    }

    /// <summary>The terminal handler: the one that concludes the task and lets the process advance.</summary>
    private Task<ServiceTaskExchangeResult> HandleJournalMessage(ServiceTaskContext context, ServiceTaskReply reply)
    {
        MultiExchangeRecorder.RecordMessage(JournalStageName, reply);
        string kind = ReadKind(reply.Payload);
        if (kind == "receipt")
        {
            SnapshotLogger.LogInfo($"Multi.Journal.OnMessage.Position{reply.Position}.Receipt.Success");
            return Task.FromResult<ServiceTaskExchangeResult>(ServiceTaskResult.Success());
        }

        SnapshotLogger.LogError($"Multi.Journal.OnMessage.Position{reply.Position}.Tripwire");
        return Task.FromResult<ServiceTaskExchangeResult>(
            ServiceTaskResult.FailedPermanent($"The journal sent a message this task cannot read: '{kind}'.")
        );
    }

    private Task<ServiceTaskStageResult> HandleArchiveClosed(ServiceTaskContext context, MailboxClosedReason reason)
    {
        MultiExchangeRecorder.RecordClosed(ArchiveStageName, reason);
        SnapshotLogger.LogError($"Multi.Archive.OnClosed.{reason}.Tripwire");
        return Task.FromResult(
            ServiceTaskStageResult.FailedPermanent($"The archive never answered before its mailbox closed ({reason}).")
        );
    }

    private Task<ServiceTaskResult> HandleJournalClosed(ServiceTaskContext context, MailboxClosedReason reason)
    {
        MultiExchangeRecorder.RecordClosed(JournalStageName, reason);
        SnapshotLogger.LogError($"Multi.Journal.OnClosed.{reason}.Tripwire");
        return Task.FromResult<ServiceTaskResult>(
            ServiceTaskResult.FailedPermanent($"The journal never answered before its mailbox closed ({reason}).")
        );
    }

    internal static string ReadKind(string payload)
    {
        try
        {
            using JsonDocument document = JsonDocument.Parse(payload);
            return document.RootElement.TryGetProperty("kind", out JsonElement kind)
                ? kind.GetString() ?? "<null>"
                : "<missing>";
        }
        catch (JsonException)
        {
            return "<unparseable>";
        }
    }
}

/// <summary>
/// The same two exchanges with <strong>both sends up front</strong> and neither handler concluding the
/// task: <c>Stage(Alpha) → Stage(Beta) → HandleReplies(Alpha) → HandleReplies(Beta) → Stage(RecordOutcome)
/// → Finally(...)</c>.
/// </summary>
/// <remarks>
/// <para>
/// This shape is here for the three things the sequential task above cannot show, each of which is only
/// observable end to end:
/// </para>
/// <list type="bullet">
/// <item>
/// <description>
/// <strong>A conclusion that closes one of two carried mailboxes.</strong> Because both mints ride the
/// transition, the blob carries Alpha <em>and</em> Beta when Alpha's handler concludes — so "close only
/// this exchange's mailbox" has something to get wrong. The sequential task drops each mailbox from the
/// carry before the next is minted, so it never carries two.
/// </description>
/// </item>
/// <item>
/// <description>
/// <strong>An empty segment.</strong> Nothing is composed between the two handlers, so the continuation
/// Alpha's conclusion starts consists of nothing but the step that enqueues Beta's first receiver.
/// </description>
/// </item>
/// <item>
/// <description>
/// <strong>A continuation that concludes the task itself.</strong> The last segment ends in
/// <see cref="ServiceTaskPipelineBuilder.Finally"/> rather than an exchange, so the concluding step runs
/// on a continuation workflow and the process advances from there — the path the plan expects to work
/// with no controller change.
/// </description>
/// </item>
/// </list>
/// <para>
/// It also makes the sequential task's deadline claim falsifiable: here the two mints are milliseconds
/// apart because both ride the transition, whereas there they are a whole exchange apart.
/// </para>
/// </remarks>
public sealed class UpfrontExchangesServiceTask : IPipelineServiceTask
{
    /// <summary>The <c>altinn:taskType</c> of Task_Upfront in this scenario's BPMN.</summary>
    public const string ServiceTaskType = "mailbox-upfront";

    /// <summary>The stage that opens the first exchange.</summary>
    public const string AlphaStageName = "SendAlpha";

    /// <summary>The stage that opens the second exchange — before either is answered.</summary>
    public const string BetaStageName = "SendBeta";

    /// <summary>A plain stage in the last segment, so that segment is not just its conclusion.</summary>
    public const string RecordStageName = "RecordOutcome";

    /// <summary>Same budget as the sequential task's, for the same reason.</summary>
    public static readonly TimeSpan ExchangeTimeout = TimeSpan.FromMinutes(20);

    public string Type => ServiceTaskType;

    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
        pipeline
            .Stage(AlphaStageName, SendAlpha, new MailboxOptions { Timeout = ExchangeTimeout }, out MailboxHandle alpha)
            .Stage(BetaStageName, SendBeta, new MailboxOptions { Timeout = ExchangeTimeout }, out MailboxHandle beta)
            .HandleReplies(alpha, onMessage: HandleAlphaMessage, onClosed: HandleAlphaClosed)
            .HandleReplies(beta, onMessage: HandleBetaMessage, onClosed: HandleBetaClosed)
            .Stage(RecordStageName, RecordOutcome)
            .Finally(ConfirmBoth);

    private Task<ServiceTaskStageResult> SendAlpha(ServiceTaskContext context, ServiceTaskMailbox mailbox)
    {
        int run = MultiExchangeRecorder.NextRun(AlphaStageName);
        MultiExchangeRecorder.PublishAddress(AlphaStageName, ServiceTaskType, mailbox.Id, mailbox.Deadline);
        SnapshotLogger.LogInfo($"Multi.SendAlpha.Run{run}.Published");
        return Task.FromResult(ServiceTaskStageResult.Completed());
    }

    private Task<ServiceTaskStageResult> SendBeta(ServiceTaskContext context, ServiceTaskMailbox mailbox)
    {
        int run = MultiExchangeRecorder.NextRun(BetaStageName);
        MultiExchangeRecorder.PublishAddress(BetaStageName, ServiceTaskType, mailbox.Id, mailbox.Deadline);
        SnapshotLogger.LogInfo($"Multi.SendBeta.Run{run}.Published");
        return Task.FromResult(ServiceTaskStageResult.Completed());
    }

    private Task<ServiceTaskStageResult> RecordOutcome(ServiceTaskContext context)
    {
        int run = MultiExchangeRecorder.NextRun(RecordStageName);
        SnapshotLogger.LogInfo($"Multi.RecordOutcome.Run{run}.Completed");
        return Task.FromResult(ServiceTaskStageResult.Completed());
    }

    /// <summary>
    /// The pipeline's conclusion, running on the continuation that Beta's conclusion started — no exchange
    /// is left to answer, so this is where the task succeeds and asks the process to advance.
    /// </summary>
    private Task<ServiceTaskResult> ConfirmBoth(ServiceTaskContext context)
    {
        int run = MultiExchangeRecorder.NextRun("ConfirmBoth");
        SnapshotLogger.LogInfo($"Multi.ConfirmBoth.Run{run}.Success");
        return Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());
    }

    private Task<ServiceTaskStageExchangeResult> HandleAlphaMessage(ServiceTaskContext context, ServiceTaskReply reply)
    {
        MultiExchangeRecorder.RecordMessage(AlphaStageName, reply);
        return Conclude(AlphaStageName, reply);
    }

    private Task<ServiceTaskStageExchangeResult> HandleBetaMessage(ServiceTaskContext context, ServiceTaskReply reply)
    {
        MultiExchangeRecorder.RecordMessage(BetaStageName, reply);
        return Conclude(BetaStageName, reply);
    }

    private static Task<ServiceTaskStageExchangeResult> Conclude(string exchange, ServiceTaskReply reply)
    {
        string kind = SequentialExchangesServiceTask.ReadKind(reply.Payload);
        if (kind == "receipt")
        {
            SnapshotLogger.LogInfo($"Multi.{exchange}.OnMessage.Position{reply.Position}.Receipt.Completed");
            return Task.FromResult<ServiceTaskStageExchangeResult>(ServiceTaskStageResult.Completed());
        }

        SnapshotLogger.LogError($"Multi.{exchange}.OnMessage.Position{reply.Position}.Tripwire");
        return Task.FromResult<ServiceTaskStageExchangeResult>(
            ServiceTaskStageResult.FailedPermanent($"Exchange '{exchange}' got a message it cannot read: '{kind}'.")
        );
    }

    private Task<ServiceTaskStageResult> HandleAlphaClosed(ServiceTaskContext context, MailboxClosedReason reason) =>
        Closed(AlphaStageName, reason);

    private Task<ServiceTaskStageResult> HandleBetaClosed(ServiceTaskContext context, MailboxClosedReason reason) =>
        Closed(BetaStageName, reason);

    private static Task<ServiceTaskStageResult> Closed(string exchange, MailboxClosedReason reason)
    {
        MultiExchangeRecorder.RecordClosed(exchange, reason);
        SnapshotLogger.LogError($"Multi.{exchange}.OnClosed.{reason}.Tripwire");
        return Task.FromResult(
            ServiceTaskStageResult.FailedPermanent($"Exchange '{exchange}' was never answered ({reason}).")
        );
    }
}

/// <summary>One mailbox as its declaring stage was handed it.</summary>
public sealed record RecordedMailbox(Guid Id, DateTimeOffset Deadline, string ServiceTaskType);

/// <summary>One message as the handler answering <paramref name="Exchange"/> was handed it.</summary>
public sealed record RecordedMessage(string Exchange, string Payload, string IdempotencyKey, long Position);

/// <summary>Everything the scenario has observed, as served by the state endpoint.</summary>
public sealed record MultiExchangeState(
    IReadOnlyDictionary<string, RecordedMailbox> Mailboxes,
    IReadOnlyList<RecordedMessage> Messages,
    IReadOnlyList<string> Closures,
    IReadOnlyDictionary<string, int> Runs
);

/// <summary>
/// What the scenario saw, surviving across callbacks (each callback resolves a fresh transient task
/// instance). Keyed by the stage that opened each exchange, which is the exchange's identity everywhere
/// else too. Reset between tests via the scenario endpoint.
/// </summary>
internal static class MultiExchangeRecorder
{
    private static readonly object _lock = new();
    private static readonly Dictionary<string, int> _runs = new(StringComparer.Ordinal);
    private static readonly Dictionary<string, RecordedMailbox> _mailboxes = new(StringComparer.Ordinal);
    private static readonly List<RecordedMessage> _messages = new();
    private static readonly List<string> _closures = new();

    public static int NextRun(string stage)
    {
        lock (_lock)
        {
            int run = _runs.TryGetValue(stage, out int previous) ? previous + 1 : 1;
            _runs[stage] = run;
            return run;
        }
    }

    public static void PublishAddress(string stage, string serviceTaskType, Guid mailboxId, DateTimeOffset deadline)
    {
        lock (_lock)
        {
            _mailboxes[stage] = new RecordedMailbox(mailboxId, deadline, serviceTaskType);
        }
    }

    public static void RecordMessage(string exchange, ServiceTaskReply reply)
    {
        lock (_lock)
        {
            _messages.Add(new RecordedMessage(exchange, reply.Payload, reply.IdempotencyKey, reply.Position));
        }
    }

    public static void RecordClosed(string exchange, MailboxClosedReason reason)
    {
        lock (_lock)
        {
            _closures.Add($"{exchange}:{reason}");
        }
    }

    /// <summary>
    /// Which task's reply handler reads messages for a mailbox, so the forwarding endpoint can name it the
    /// way <see cref="IServiceTaskReplyForwarder"/> requires without the test having to track it.
    /// </summary>
    public static string? FindServiceTaskType(Guid mailboxId)
    {
        lock (_lock)
        {
            foreach (KeyValuePair<string, RecordedMailbox> entry in _mailboxes)
            {
                if (entry.Value.Id == mailboxId)
                {
                    return entry.Value.ServiceTaskType;
                }
            }

            return null;
        }
    }

    public static MultiExchangeState Snapshot()
    {
        lock (_lock)
        {
            return new MultiExchangeState(
                new Dictionary<string, RecordedMailbox>(_mailboxes, StringComparer.Ordinal),
                new List<RecordedMessage>(_messages),
                new List<string>(_closures),
                new Dictionary<string, int>(_runs, StringComparer.Ordinal)
            );
        }
    }

    public static void Reset()
    {
        lock (_lock)
        {
            _runs.Clear();
            _mailboxes.Clear();
            _messages.Clear();
            _closures.Clear();
        }
    }
}

/// <summary>
/// The scenario's stand-in for the channels the archive and the journal would answer on: it reads the
/// echoed reply address off the request and hands the message to <see cref="IServiceTaskReplyForwarder"/>,
/// doing no work of its own — exactly the shape the forwarder's contract describes.
/// </summary>
public sealed class WorkflowEngineMailboxMultiEndpoints : IEndpointConfigurator
{
    public void ConfigureEndpoints(WebApplication app)
    {
        app.MapPost(
            "/test/workflow-engine-mailbox-multi/reset",
            () =>
            {
                MultiExchangeRecorder.Reset();
                return Results.Ok();
            }
        );

        app.MapGet("/test/workflow-engine-mailbox-multi/state", () => Results.Json(MultiExchangeRecorder.Snapshot()));

        app.MapPost(
            "/test/workflow-engine-mailbox-multi/reply",
            async (HttpContext http, Guid mailboxId, string idempotencyKey) =>
            {
                // The body is forwarded byte-for-byte, so the test can assert the round trip through the
                // integrity envelope rather than a re-encoding of its own request.
                using var reader = new StreamReader(http.Request.Body);
                string payload = await reader.ReadToEndAsync();

                string? serviceTaskType = MultiExchangeRecorder.FindServiceTaskType(mailboxId);
                if (serviceTaskType is null)
                {
                    SnapshotLogger.LogError($"Multi.Forward.{idempotencyKey}.UnknownMailbox");
                    return Results.Json(new { outcome = "UnknownMailbox", mailboxId }, statusCode: 404);
                }

                // Resolved per message from the request scope, as the forwarder's remarks require.
                var forwarder = http.RequestServices.GetRequiredService<IServiceTaskReplyForwarder>();
                try
                {
                    await forwarder.ForwardReply(
                        mailboxId,
                        serviceTaskType,
                        payload,
                        idempotencyKey,
                        http.RequestAborted
                    );
                    SnapshotLogger.LogInfo($"Multi.Forward.{idempotencyKey}.Accepted");
                    return Results.Ok();
                }
                catch (ServiceTaskReplyForwardException ex)
                {
                    SnapshotLogger.LogError($"Multi.Forward.{idempotencyKey}.{ex.Outcome}");
                    return Results.Json(new { outcome = ex.Outcome.ToString(), message = ex.Message }, statusCode: 502);
                }
            }
        );
    }
}

public static class ServiceRegistration
{
    public static void RegisterServices(IServiceCollection services)
    {
        services.AddTransient<IPipelineServiceTask, SequentialExchangesServiceTask>();
        services.AddTransient<IPipelineServiceTask, UpfrontExchangesServiceTask>();
        services.AddSingleton<IEndpointConfigurator, WorkflowEngineMailboxMultiEndpoints>();
    }
}
