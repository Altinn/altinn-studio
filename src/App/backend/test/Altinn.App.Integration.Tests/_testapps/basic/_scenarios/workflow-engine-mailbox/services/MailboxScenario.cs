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
/// A task answered by messages: an external stage, "SendToArchive", publishes its reply address, and its reply
/// handler takes two messages, the first answered with <see cref="ServiceTaskReplyResult.AwaitNextReply"/> and the
/// second with <see cref="ServiceTaskReplyResult.Completed"/>. Two messages rather than one is deliberate: only a
/// stage that waits past its first reply exercises the relay's successor path (enqueue a successor receiver) as well
/// as its close.
///
/// The external stage is deliberately <strong>surrounded</strong> by plain stages — "PrepareDocuments" before it
/// and "RecordDispatch" after — so that the mint's place can fail in both directions: a mint hoisted to the front of
/// the stage list (which would start the deadline clock before the pre-send work, eroding the budget) breaks the
/// "immediately after PrepareDocuments" half, and the stage after it shows that the reply handler's completion
/// closes the mailbox and carries on, and that the last item's completion ends the task.
/// </summary>
/// <remarks>
/// The timeout handler is this scenario's tripwire, mirroring the throwing default handlers in the
/// controller-level unit tests: on the happy path nothing may reach it, so it logs an unmistakable
/// marker (the test asserts its absence) and fails permanently, which alone would keep the
/// process off its end event. A run that dispatched to the wrong handler therefore cannot pass.
/// </remarks>
public sealed class ArchivingServiceTask : IServiceTask
{
    /// <summary>The <c>altinn:taskType</c> of Task_Service in this scenario's BPMN.</summary>
    public const string ServiceTaskType = "mailbox";

    /// <summary>A plain stage before the send, so "the mint does not run before it" is falsifiable.</summary>
    public const string PrepareStageLabel = "PrepareDocuments";

    /// <summary>The send's log/recorder key. Steps are dispatched by item index; this label
    /// only names the send in the scenario's own recorded runs and logs.</summary>
    public const string SendStageLabel = "SendToArchive";

    /// <summary>A plain stage after the external stage, which runs once the replies are handled.</summary>
    public const string RecordStageLabel = "RecordDispatch";

    public string Type => ServiceTaskType;

    public void DefineExecute(PipelineBuilder.ServiceTask pipeline) =>
        pipeline
            .Stage(PrepareDocuments)
            .ExternalStage(
                SendToArchive,
                HandleArchiveReply,
                // Comfortably clear of the sum of the test's own waits (three 90s polls plus the
                // synchronous process/next wait), so a slow run fails on a test deadline that blames the
                // clock rather than tripping onTimeout and blaming the app. Nothing waits for the timeout, so
                // there is no reason to keep this tight.
                timeout: TimeSpan.FromMinutes(20),
                onTimeout: HandleArchiveTimeout
            )
            .Stage(RecordDispatch);

    private Task<ServiceTaskResult> PrepareDocuments(StageContext context)
    {
        int run = MailboxExchangeRecorder.NextRun(PrepareStageLabel);
        SnapshotLogger.LogInfo($"Mailbox.PrepareDocuments.Run{run}.Completed");
        return Task.FromResult(ServiceTaskResult.Completed());
    }

    private Task<ServiceTaskResult> SendToArchive(StageContext context, ReplyAddress replyAddress)
    {
        int run = MailboxExchangeRecorder.NextRun(SendStageLabel);
        // Standing in for the outbound message that would carry the reply address to the archive.
        MailboxExchangeRecorder.PublishAddress(replyAddress.Id, replyAddress.Deadline);
        SnapshotLogger.LogInfo($"Mailbox.SendToArchive.Run{run}.Published");
        return Task.FromResult(ServiceTaskResult.Completed());
    }

    private Task<ServiceTaskResult> RecordDispatch(StageContext context)
    {
        int run = MailboxExchangeRecorder.NextRun(RecordStageLabel);
        SnapshotLogger.LogInfo($"Mailbox.RecordDispatch.Run{run}.Completed");
        return Task.FromResult(ServiceTaskResult.Completed());
    }

    private Task<ServiceTaskReplyResult> HandleArchiveReply(StageContext context, ServiceTaskReply reply)
    {
        MailboxExchangeRecorder.RecordMessage(reply);
        string kind = ReadKind(reply.Payload);
        switch (kind)
        {
            case "ack":
                SnapshotLogger.LogInfo($"Mailbox.OnReply.Position{reply.Position}.Ack.AwaitNextReply");
                return Task.FromResult(ServiceTaskReplyResult.AwaitNextReply());

            case "receipt":
                SnapshotLogger.LogInfo($"Mailbox.OnReply.Position{reply.Position}.Receipt.Completed");
                return Task.FromResult(ServiceTaskReplyResult.Completed());

            default:
                SnapshotLogger.LogError($"Mailbox.OnReply.Position{reply.Position}.Tripwire");
                return Task.FromResult(
                    ServiceTaskReplyResult.FailedPermanent(
                        $"The archive sent a message this task cannot read: '{kind}'."
                    )
                );
        }
    }

    private Task<ServiceTaskResult> HandleArchiveTimeout(StageContext context)
    {
        MailboxExchangeRecorder.RecordTimeout();
        SnapshotLogger.LogError("Mailbox.OnTimeout.Tripwire");
        return Task.FromResult(
            ServiceTaskResult.FailedPermanent("The archive never answered before the reply address closed.")
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
    bool TimedOut,
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
    private static bool _timedOut;

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

    public static void RecordTimeout()
    {
        lock (_lock)
        {
            _timedOut = true;
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
                _timedOut,
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
            _timedOut = false;
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
        services.AddTransient<IServiceTask, ArchivingServiceTask>();
        services.AddSingleton<IEndpointConfigurator, WorkflowEngineMailboxEndpoints>();
    }
}
