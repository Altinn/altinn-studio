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

namespace Altinn.App.Integration.Tests.Scenarios.WorkflowEngineMailbox;

/// <summary>
/// A task answered by messages: "SendToArchive" opens the mailbox and publishes its address, and the
/// exchange is concluded by <see cref="ServiceTaskPipelineBuilder.ConcludeOnReplies"/> — two
/// messages, the first answered with <see cref="ServiceTaskExchangeResult.AwaitNextReply"/> and the
/// second concluding the task. The multi-message terminal is deliberate: it is the only shape that
/// exercises the relay's continuation path (enqueue a successor receiver) as well as its conclusion.
///
/// The declaring stage is deliberately <strong>surrounded</strong> by plain stages —
/// "PrepareDocuments" before it and "RecordDispatch" after — so that the test's claim about where the
/// mint step sits can fail in both directions: a mint hoisted to the front of the stage list (which
/// would start the deadline clock before the pre-send work, eroding the budget) breaks the
/// "immediately after PrepareDocuments" half, and a mint deferred to the end breaks the "immediately
/// before SendToArchive" half. A declaring stage that is first or last makes one of those
/// unfalsifiable.
/// </summary>
/// <remarks>
/// The closure handler is this scenario's tripwire, mirroring the throwing default handlers in the
/// controller-level unit tests: on the happy path nothing may reach it, so it logs an unmistakable
/// marker (the test asserts its absence) and concludes permanently failed, which alone would keep the
/// process off its end event. A run that dispatched to the wrong half of the exchange therefore
/// cannot pass.
/// </remarks>
public sealed class ArchivingServiceTask : IPipelineServiceTask
{
    /// <summary>The <c>altinn:taskType</c> of Task_Service in this scenario's BPMN.</summary>
    public const string ServiceTaskType = "mailbox";

    /// <summary>A plain stage before the send, so "the mint does not run before it" is falsifiable.</summary>
    public const string PrepareStageName = "PrepareDocuments";

    /// <summary>The declaring stage's name — the exchange's identity, and the mint step's suffix.</summary>
    public const string SendStageName = "SendToArchive";

    /// <summary>A plain stage after the send, so "the mint is not deferred past it" is falsifiable.</summary>
    public const string RecordStageName = "RecordDispatch";

    public string Type => ServiceTaskType;

    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
        pipeline
            .Stage(PrepareStageName, PrepareDocuments)
            .Stage(
                SendStageName,
                SendToArchive,
                // Comfortably clear of the sum of the test's own waits (three 90s polls plus the
                // synchronous process/next wait), so a slow run fails on a test deadline that blames the
                // clock rather than tripping onClosed and blaming the app. Nothing waits for closure, so
                // there is no reason to keep this tight.
                new MailboxOptions { Timeout = TimeSpan.FromMinutes(20) },
                out MailboxHandle archive
            )
            .Stage(RecordStageName, RecordDispatch)
            .ConcludeOnReplies(archive, onMessage: HandleArchiveMessage, onClosed: HandleArchiveClosed);

    private Task<ServiceTaskStageResult> PrepareDocuments(ServiceTaskContext context)
    {
        int run = MailboxExchangeRecorder.NextRun(PrepareStageName);
        SnapshotLogger.LogInfo($"Mailbox.PrepareDocuments.Run{run}.Completed");
        return Task.FromResult(ServiceTaskStageResult.Completed());
    }

    private Task<ServiceTaskStageResult> SendToArchive(ServiceTaskContext context, ServiceTaskMailbox mailbox)
    {
        int run = MailboxExchangeRecorder.NextRun(SendStageName);
        // Standing in for the outbound message that would carry the reply address to the archive.
        MailboxExchangeRecorder.PublishAddress(mailbox.Id, mailbox.Deadline);
        SnapshotLogger.LogInfo($"Mailbox.SendToArchive.Run{run}.Published");
        return Task.FromResult(ServiceTaskStageResult.Completed());
    }

    private Task<ServiceTaskStageResult> RecordDispatch(ServiceTaskContext context)
    {
        int run = MailboxExchangeRecorder.NextRun(RecordStageName);
        SnapshotLogger.LogInfo($"Mailbox.RecordDispatch.Run{run}.Completed");
        return Task.FromResult(ServiceTaskStageResult.Completed());
    }

    private Task<ServiceTaskExchangeResult> HandleArchiveMessage(ServiceTaskContext context, ServiceTaskReply reply)
    {
        MailboxExchangeRecorder.RecordMessage(reply);
        string kind = ReadKind(reply.Payload);
        switch (kind)
        {
            case "ack":
                SnapshotLogger.LogInfo($"Mailbox.OnMessage.Position{reply.Position}.Ack.AwaitNextReply");
                return Task.FromResult<ServiceTaskExchangeResult>(ServiceTaskExchangeResult.AwaitNextReply());

            case "receipt":
                SnapshotLogger.LogInfo($"Mailbox.OnMessage.Position{reply.Position}.Receipt.Success");
                return Task.FromResult<ServiceTaskExchangeResult>(ServiceTaskResult.Success());

            default:
                SnapshotLogger.LogError($"Mailbox.OnMessage.Position{reply.Position}.Tripwire");
                return Task.FromResult<ServiceTaskExchangeResult>(
                    ServiceTaskResult.FailedPermanent($"The archive sent a message this task cannot read: '{kind}'.")
                );
        }
    }

    private Task<ServiceTaskResult> HandleArchiveClosed(ServiceTaskContext context, MailboxClosedReason reason)
    {
        MailboxExchangeRecorder.RecordClosed(reason);
        SnapshotLogger.LogError($"Mailbox.OnClosed.{reason}.Tripwire");
        return Task.FromResult<ServiceTaskResult>(
            ServiceTaskResult.FailedPermanent($"The archive never answered before the mailbox closed ({reason}).")
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

/// <summary>One message as the reply handler was handed it, for the test to read back.</summary>
public sealed record RecordedMessage(string Payload, string IdempotencyKey, long Position);

/// <summary>Everything the scenario has observed, as served by the state endpoint.</summary>
public sealed record ExchangeState(
    Guid? MailboxId,
    DateTimeOffset? Deadline,
    IReadOnlyList<RecordedMessage> Messages,
    string? ClosedReason,
    IReadOnlyDictionary<string, int> Runs
);

/// <summary>
/// What the scenario saw, surviving across callbacks (each callback resolves a fresh transient task
/// instance). Reset between tests via the scenario endpoint.
/// </summary>
internal static class MailboxExchangeRecorder
{
    private static readonly object _lock = new();
    private static readonly Dictionary<string, int> _runs = new(StringComparer.Ordinal);
    private static readonly List<RecordedMessage> _messages = new();
    private static Guid? _mailboxId;
    private static DateTimeOffset? _deadline;
    private static string? _closedReason;

    public static int NextRun(string stage)
    {
        lock (_lock)
        {
            int run = _runs.TryGetValue(stage, out int previous) ? previous + 1 : 1;
            _runs[stage] = run;
            return run;
        }
    }

    public static void PublishAddress(Guid mailboxId, DateTimeOffset deadline)
    {
        lock (_lock)
        {
            _mailboxId = mailboxId;
            _deadline = deadline;
        }
    }

    public static void RecordMessage(ServiceTaskReply reply)
    {
        lock (_lock)
        {
            _messages.Add(new RecordedMessage(reply.Payload, reply.IdempotencyKey, reply.Position));
        }
    }

    public static void RecordClosed(MailboxClosedReason reason)
    {
        lock (_lock)
        {
            _closedReason = reason.ToString();
        }
    }

    public static ExchangeState Snapshot()
    {
        lock (_lock)
        {
            return new ExchangeState(
                _mailboxId,
                _deadline,
                new List<RecordedMessage>(_messages),
                _closedReason,
                new Dictionary<string, int>(_runs, StringComparer.Ordinal)
            );
        }
    }

    public static void Reset()
    {
        lock (_lock)
        {
            _runs.Clear();
            _messages.Clear();
            _mailboxId = null;
            _deadline = null;
            _closedReason = null;
        }
    }
}

/// <summary>
/// The scenario's stand-in for the channel an archive would answer on: it reads the echoed reply
/// address off the request and hands the message to <see cref="IServiceTaskReplyForwarder"/>, doing
/// no work of its own — exactly the shape the forwarder's contract describes.
/// </summary>
public sealed class WorkflowEngineMailboxEndpoints : IEndpointConfigurator
{
    public void ConfigureEndpoints(WebApplication app)
    {
        app.MapPost(
            "/test/workflow-engine-mailbox/reset",
            () =>
            {
                MailboxExchangeRecorder.Reset();
                return Results.Ok();
            }
        );

        app.MapGet("/test/workflow-engine-mailbox/state", () => Results.Json(MailboxExchangeRecorder.Snapshot()));

        app.MapPost(
            "/test/workflow-engine-mailbox/reply",
            async (HttpContext http, Guid mailboxId, string idempotencyKey) =>
            {
                // The body is forwarded byte-for-byte, so the test can assert the round trip through
                // the integrity envelope rather than a re-encoding of its own request.
                using var reader = new StreamReader(http.Request.Body);
                string payload = await reader.ReadToEndAsync();

                // Resolved per message from the request scope, as the forwarder's remarks require.
                var forwarder = http.RequestServices.GetRequiredService<IServiceTaskReplyForwarder>();
                try
                {
                    await forwarder.ForwardReply(
                        mailboxId,
                        ArchivingServiceTask.ServiceTaskType,
                        payload,
                        idempotencyKey,
                        http.RequestAborted
                    );
                    SnapshotLogger.LogInfo($"Mailbox.Forward.{idempotencyKey}.Accepted");
                    return Results.Ok();
                }
                catch (ServiceTaskReplyForwardException ex)
                {
                    SnapshotLogger.LogError($"Mailbox.Forward.{idempotencyKey}.{ex.Outcome}");
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
        services.AddTransient<IPipelineServiceTask, ArchivingServiceTask>();
        services.AddSingleton<IEndpointConfigurator, WorkflowEngineMailboxEndpoints>();
    }
}
