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
/// Two external stages in one task, one after the other: "SendToArchive" publishes the first reply address, and
/// once its reply handler is done with the archive's replies, "SendToJournal" publishes the second, whose reply
/// handler ends the task.
/// </summary>
/// <remarks>
/// <para>
/// The archive answers twice (ack, then receipt) so its reply handler returns both results that keep the task
/// going: <see cref="ServiceTaskReplyResult.AwaitNextReply"/> onto a successor receiver, then
/// <see cref="ServiceTaskReplyResult.Completed"/> onto the next item's workflow. The journal answers once, and its
/// <see cref="ServiceTaskReplyResult.Completed"/>, from the last item, ends the task with no action.
/// </para>
/// <para>
/// The journal's send rides the workflow the archive's completion starts, so its reply address is minted there and
/// its deadline clock starts then, a whole exchange after the archive's.
/// </para>
/// <para>
/// The timeout handlers are tripwires: on the happy path nothing may reach them, so each records that it ran, logs
/// a marker the test asserts the absence of, and fails permanently, which alone would keep the process off its end
/// event.
/// </para>
/// </remarks>
public sealed class SequentialExchangesServiceTask : IServiceTask
{
    /// <summary>
    /// The <c>altinn:taskType</c> of Task_Sequential in this scenario's BPMN.
    /// </summary>
    public const string ServiceTaskType = "mailbox-sequential";

    /// <summary>
    /// The recorder key of the first external stage. Steps are dispatched by item index; this label only names the
    /// stage in the scenario's records and logs.
    /// </summary>
    public const string ArchiveStageLabel = "SendToArchive";

    /// <summary>
    /// The recorder key of the second external stage, which starts once the first is done with its replies.
    /// </summary>
    public const string JournalStageLabel = "SendToJournal";

    /// <summary>
    /// Comfortably clear of the sum of the test's own waits, so a slow run fails on a test deadline that
    /// blames the clock rather than tripping <c>onTimeout</c> and blaming the app. Both external stages get the
    /// same budget, which is what makes the difference between their two deadlines equal to the time
    /// between their two mints — a comparison of two values stamped by the same clock.
    /// </summary>
    public static readonly TimeSpan ExchangeTimeout = TimeSpan.FromMinutes(20);

    public string Type => ServiceTaskType;

    public void DefineExecute(PipelineBuilder.ServiceTask pipeline) =>
        pipeline
            .ExternalStage(SendToArchive, HandleArchiveReply, timeout: ExchangeTimeout, onTimeout: HandleArchiveTimeout)
            .ExternalStage(
                SendToJournal,
                HandleJournalReply,
                timeout: ExchangeTimeout,
                onTimeout: HandleJournalTimeout
            );

    private Task<ServiceTaskResult> SendToArchive(StageContext context, ReplyAddress replyAddress)
    {
        int run = MultiExchangeRecorder.NextRun(ArchiveStageLabel);
        MultiExchangeRecorder.PublishAddress(
            ArchiveStageLabel,
            ServiceTaskType,
            replyAddress.Id,
            replyAddress.Deadline
        );
        SnapshotLogger.LogInfo($"Multi.SendToArchive.Run{run}.Published");
        return Task.FromResult(ServiceTaskResult.Completed());
    }

    private Task<ServiceTaskResult> SendToJournal(StageContext context, ReplyAddress replyAddress)
    {
        int run = MultiExchangeRecorder.NextRun(JournalStageLabel);
        MultiExchangeRecorder.PublishAddress(
            JournalStageLabel,
            ServiceTaskType,
            replyAddress.Id,
            replyAddress.Deadline
        );
        SnapshotLogger.LogInfo($"Multi.SendToJournal.Run{run}.Published");
        return Task.FromResult(ServiceTaskResult.Completed());
    }

    /// <summary>
    /// Not the last item, so <see cref="ServiceTaskReplyResult.Completed"/> here closes the archive's reply address
    /// and starts the journal's external stage.
    /// </summary>
    private Task<ServiceTaskReplyResult> HandleArchiveReply(StageContext context, ServiceTaskReply reply)
    {
        MultiExchangeRecorder.RecordMessage(ArchiveStageLabel, reply);
        string kind = ReadKind(reply.Payload);
        switch (kind)
        {
            case "ack":
                SnapshotLogger.LogInfo($"Multi.Archive.OnReply.Position{reply.Position}.Ack.AwaitNextReply");
                return Task.FromResult(ServiceTaskReplyResult.AwaitNextReply());

            case "receipt":
                SnapshotLogger.LogInfo($"Multi.Archive.OnReply.Position{reply.Position}.Receipt.Completed");
                return Task.FromResult(ServiceTaskReplyResult.Completed());

            default:
                SnapshotLogger.LogError($"Multi.Archive.OnReply.Position{reply.Position}.Tripwire");
                return Task.FromResult(
                    ServiceTaskReplyResult.FailedPermanent(
                        $"The archive sent a message this task cannot read: '{kind}'."
                    )
                );
        }
    }

    /// <summary>
    /// The last item, so <see cref="ServiceTaskReplyResult.Completed"/> here closes the journal's reply address and
    /// ends the task with no action.
    /// </summary>
    private Task<ServiceTaskReplyResult> HandleJournalReply(StageContext context, ServiceTaskReply reply)
    {
        MultiExchangeRecorder.RecordMessage(JournalStageLabel, reply);
        string kind = ReadKind(reply.Payload);
        if (kind == "receipt")
        {
            SnapshotLogger.LogInfo($"Multi.Journal.OnReply.Position{reply.Position}.Receipt.Completed");
            return Task.FromResult(ServiceTaskReplyResult.Completed());
        }

        SnapshotLogger.LogError($"Multi.Journal.OnReply.Position{reply.Position}.Tripwire");
        return Task.FromResult(
            ServiceTaskReplyResult.FailedPermanent($"The journal sent a message this task cannot read: '{kind}'.")
        );
    }

    private Task<ServiceTaskResult> HandleArchiveTimeout(StageContext context)
    {
        MultiExchangeRecorder.RecordTimeout(ArchiveStageLabel);
        SnapshotLogger.LogError("Multi.Archive.OnTimeout.Tripwire");
        return Task.FromResult(
            ServiceTaskResult.FailedPermanent("The archive never answered before its reply address closed.")
        );
    }

    private Task<ServiceTaskResult> HandleJournalTimeout(StageContext context)
    {
        MultiExchangeRecorder.RecordTimeout(JournalStageLabel);
        SnapshotLogger.LogError("Multi.Journal.OnTimeout.Tripwire");
        return Task.FromResult(
            ServiceTaskResult.FailedPermanent("The journal never answered before its reply address closed.")
        );
    }

    private static string ReadKind(string payload)
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
/// One reply address as its send was handed it.
/// </summary>
public sealed record RecordedMailbox(Guid Id, DateTimeOffset Deadline, string ServiceTaskType);

/// <summary>
/// One reply as the reply handler of the stage named <paramref name="Exchange"/> was handed it.
/// </summary>
public sealed record RecordedMessage(string Exchange, string Payload, string IdempotencyKey, long Position);

/// <summary>
/// Everything the scenario has observed, as served by the state endpoint. <paramref name="Timeouts"/> names the
/// stages whose timeout handler ran.
/// </summary>
public sealed record MultiExchangeState(
    IReadOnlyDictionary<string, RecordedMailbox> Mailboxes,
    IReadOnlyList<RecordedMessage> Messages,
    IReadOnlyList<string> Timeouts,
    IReadOnlyDictionary<string, int> Runs
);

/// <summary>
/// What the scenario saw, surviving across callbacks (each callback resolves a fresh transient task
/// instance). Keyed by each external stage's label. Reset between tests via the scenario endpoint.
/// </summary>
internal static class MultiExchangeRecorder
{
    private static readonly object _lock = new();
    private static readonly Dictionary<string, int> _runs = new(StringComparer.Ordinal);
    private static readonly Dictionary<string, RecordedMailbox> _mailboxes = new(StringComparer.Ordinal);
    private static readonly List<RecordedMessage> _messages = new();
    private static readonly List<string> _timeouts = new();

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

    public static void RecordTimeout(string stage)
    {
        lock (_lock)
        {
            _timeouts.Add(stage);
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
                new List<string>(_timeouts),
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
            _timeouts.Clear();
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
        services.AddTransient<IServiceTask, SequentialExchangesServiceTask>();
        services.AddSingleton<IEndpointConfigurator, WorkflowEngineMailboxMultiEndpoints>();
    }
}
