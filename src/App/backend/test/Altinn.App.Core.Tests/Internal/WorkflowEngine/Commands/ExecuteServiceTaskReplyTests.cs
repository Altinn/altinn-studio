using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands;

/// <summary>
/// The reply half of <see cref="ExecuteServiceTask"/>: what the engine's rendezvous block becomes on
/// the way to <see cref="ServiceTaskContext.Reply"/>, and what happens when the block and the
/// pipeline's own declaration disagree.
/// </summary>
public class ExecuteServiceTaskReplyTests
{
    private static readonly Guid _instanceGuid = new("2b3e9260-24d9-4c0a-8b93-ef2c9c7dcbde");
    private static readonly Guid _mailboxId = new("018f4e00-0000-7000-8000-0000000000aa");

    /// <summary>A task answered by a message: one sending stage, and a conclusion that reads it.</summary>
    private sealed class ArchivingTask : IPipelineServiceTask
    {
        public string Type => "archiving";

        public ServiceTaskResult Verdict { get; init; } = ServiceTaskResult.Success();

        public ServiceTaskContext? Conclusion { get; private set; }

        public ServiceTaskContext? Stage { get; private set; }

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage("SendToArchive", _ => Task.FromResult(ServiceTaskStageResult.Completed()))
                .Stage(
                    "RecordDispatch",
                    context =>
                    {
                        Stage = context;
                        return Task.FromResult(ServiceTaskStageResult.Completed());
                    }
                )
                .Finally(context =>
                {
                    Conclusion = context;
                    return Task.FromResult(Verdict);
                })
                .WithReplyFrom("SendToArchive", new MailboxOptions { Timeout = TimeSpan.FromDays(3) });
    }

    /// <summary>The same task without a mailbox — it is never answered by a message.</summary>
    private sealed class PlainTask : IPipelineServiceTask
    {
        public string Type => "archiving";

        public ServiceTaskResult Verdict { get; init; } = ServiceTaskResult.Success();

        public ServiceTaskContext? Conclusion { get; private set; }

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage("SendToArchive", _ => Task.FromResult(ServiceTaskStageResult.Completed()))
                .Finally(context =>
                {
                    Conclusion = context;
                    return Task.FromResult(Verdict);
                });
    }

    private sealed class UnusedEngineClient : IWorkflowEngineClient
    {
        public Task<WorkflowEnqueueResponse.Accepted> EnqueueWorkflows(
            string ns,
            string idempotencyKey,
            string? collectionKey,
            WorkflowEnqueueRequest request,
            CancellationToken ct = default
        ) => throw new NotSupportedException();

        public Task<WorkflowCollectionDetailResponse?> GetCollection(
            string ns,
            string key,
            CancellationToken ct = default
        ) => throw new NotSupportedException();

        public Task<IReadOnlyList<WorkflowStatusResponse>> ListWorkflows(
            string ns,
            string? collectionKey = null,
            Dictionary<string, string>? labels = null,
            IReadOnlyList<PersistentItemStatus>? statuses = null,
            CancellationToken ct = default
        ) => throw new NotSupportedException();

        public Task<CancelWorkflowResponse> CancelWorkflow(
            string ns,
            Guid workflowId,
            CancellationToken ct = default
        ) => throw new NotSupportedException();

        public Task<ResumeWorkflowResponse> ResumeWorkflow(
            string ns,
            Guid workflowId,
            bool cascade = false,
            CancellationToken ct = default
        ) => throw new NotSupportedException();

        public Task<bool> AbandonWorkflow(string ns, Guid workflowId, CancellationToken ct = default) =>
            throw new NotSupportedException();

        public Task<MailboxMintResult> MintMailbox(
            string ns,
            MailboxCreateRequest request,
            CancellationToken ct = default
        ) => throw new NotSupportedException();

        public Task<MailboxResponse?> CloseMailbox(string ns, Guid mailboxId, CancellationToken ct = default) =>
            throw new NotSupportedException();
    }

    private static ExecuteServiceTask CreateCommand(IPipelineServiceTask serviceTask)
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        services.AddSingleton(serviceTask);
        ServiceProvider sp = services.BuildServiceProvider();

        return new ExecuteServiceTask(
            sp.GetRequiredService<AppImplementationFactory>(),
            new UnusedEngineClient(),
            Mock.Of<IWorkflowCallbackSecretProvider>(p =>
                p.GetSigningSecret()
                == new AppCode
                {
                    Id = "code-1",
                    Code = "secret-code-long-enough-for-hmac",
                    IssuedAt = DateTimeOffset.UtcNow.AddDays(-1),
                    ExpiresAt = DateTimeOffset.UtcNow.AddDays(180),
                }
            )
        );
    }

    private static ProcessEngineCommandContext CreateContext(
        AppCallbackMailbox? mailbox = null,
        WorkflowCallbackStateCarry? carry = null
    )
    {
        var instance = new Instance
        {
            Id = $"1337/{_instanceGuid}",
            Org = "ttd",
            AppId = "ttd/test-app",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_2" } },
        };
        var mutator = new Mock<IInstanceDataMutator>();
        mutator.Setup(x => x.Instance).Returns(instance);

        return new ProcessEngineCommandContext
        {
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, _instanceGuid),
            InstanceDataMutator = mutator.Object,
            CancellationToken = CancellationToken.None,
            StateCarry = carry ?? new WorkflowCallbackStateCarry(),
            Payload = new AppCallbackPayload
            {
                CommandKey = ExecuteServiceTask.Key,
                Actor = new Actor { UserId = 1337 },
                LockToken = "lock-token",
                ExecutionReferenceTime = new DateTimeOffset(2026, 8, 19, 10, 0, 0, TimeSpan.Zero),
                State = "{}",
                WorkflowId = Guid.NewGuid(),
                StepId = Guid.NewGuid(),
                Mailbox = mailbox,
            },
        };
    }

    private static AppCallbackMailbox Delivered(long seq = 0) =>
        new()
        {
            Id = _mailboxId,
            Seq = seq,
            Delivery = new AppCallbackMailboxDelivery
            {
                IdempotencyKey = "fiks-message-42",
                Payload = "<receipt>ok</receipt>",
                AcceptedAt = new DateTimeOffset(2026, 8, 19, 9, 30, 0, TimeSpan.Zero),
            },
        };

    private static AppCallbackMailbox Closed(MailboxDisposedReason reason) =>
        new()
        {
            Id = _mailboxId,
            Seq = 2,
            DisposedReason = reason,
        };

    [Fact]
    public async Task Conclusion_WithADeliveredMessage_ReadsItVerbatim()
    {
        var task = new ArchivingTask();

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(Delivered(seq: 3)), new ExecuteServiceTaskPayload("archiving"));

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        ServiceTaskReply reply = Assert.IsType<ServiceTaskReply>(task.Conclusion!.Reply);
        Assert.Equal("<receipt>ok</receipt>", reply.Payload);
        Assert.Equal("fiks-message-42", reply.IdempotencyKey);
        Assert.Equal(new DateTimeOffset(2026, 8, 19, 9, 30, 0, TimeSpan.Zero), reply.AcceptedAt);
        Assert.Equal(3, reply.Position);
        Assert.Null(task.Conclusion.ReplyClosedReason);
    }

    [Fact]
    public async Task Conclusion_WithAnEmptyMessage_StillReadsAMessage()
    {
        // The distinction the whole conclusion protocol rests on: a sender that delivers an empty
        // body produces a reply whose Payload is empty, never a null Reply. Inferring the closing
        // signal from an absent payload would conclude an exchange degraded because a forwarder sent
        // nothing.
        var task = new ArchivingTask();
        AppCallbackMailbox empty = Delivered() with { Delivery = Delivered().Delivery! with { Payload = "" } };

        await CreateCommand(task).Execute(CreateContext(empty), new ExecuteServiceTaskPayload("archiving"));

        Assert.NotNull(task.Conclusion!.Reply);
        Assert.Equal("", task.Conclusion.Reply.Payload);
        Assert.Null(task.Conclusion.ReplyClosedReason);
    }

    [Theory]
    [InlineData(MailboxDisposedReason.Deadline, MailboxClosedReason.Deadline)]
    [InlineData(MailboxDisposedReason.Request, MailboxClosedReason.Request)]
    public async Task Conclusion_OnAClosedMailbox_ReadsNullAndTheReason(
        MailboxDisposedReason engineReason,
        MailboxClosedReason appReason
    )
    {
        // A null Reply means exactly one thing — conclude — and the reason rides beside it for the
        // wording only. Both map through rather than one of them being the default, because a
        // silently defaulted reason would word every timeout as a deliberate closure.
        var task = new ArchivingTask();

        await CreateCommand(task)
            .Execute(CreateContext(Closed(engineReason)), new ExecuteServiceTaskPayload("archiving"));

        Assert.Null(task.Conclusion!.Reply);
        Assert.Equal(appReason, task.Conclusion.ReplyClosedReason);
    }

    [Fact]
    public async Task Stage_OfADeclaringPipeline_CannotReadAReply()
    {
        // A stage runs once, before the exchange opens or as part of opening it. Reading Reply there
        // must not answer null — null is the instruction to conclude.
        var task = new ArchivingTask();

        await CreateCommand(task)
            .Execute(CreateContext(), new ExecuteServiceTaskPayload("archiving", "RecordDispatch"));

        Assert.Null(task.Conclusion);
        InvalidOperationException thrown = Assert.Throws<InvalidOperationException>(() => task.Stage!.Reply);
        Assert.Contains("a stage never answers a message", thrown.Message, StringComparison.Ordinal);
        Assert.Contains("RecordDispatch", thrown.Message, StringComparison.Ordinal);
        Assert.Throws<InvalidOperationException>(() => task.Stage!.ReplyClosedReason);
    }

    [Fact]
    public async Task Conclusion_OfATaskWithNoMailbox_ThrowsOnReplyRatherThanAnsweringNull()
    {
        var task = new PlainTask();

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(), new ExecuteServiceTaskPayload("archiving"));

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        InvalidOperationException thrown = Assert.Throws<InvalidOperationException>(() => task.Conclusion!.Reply);
        Assert.Contains("not answered by a message", thrown.Message, StringComparison.Ordinal);
        Assert.Throws<InvalidOperationException>(() => task.Conclusion!.ReplyClosedReason);
    }

    [Fact]
    public async Task Conclusion_OfATaskWithNoMailbox_HandedARendezvous_FailsPermanently()
    {
        // The declaration was removed while an exchange was in flight, or the workflow belongs to a
        // different task. Either way the handler cannot answer for an exchange it does not know it
        // is in.
        var task = new PlainTask();

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(Delivered()), new ExecuteServiceTaskPayload("archiving"));

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxReceiptWithoutDeclaration", failed.ExceptionType);
        Assert.Null(task.Conclusion);
    }

    [Fact]
    public async Task Stage_HandedARendezvous_FailsPermanently()
    {
        // The engine puts the block on a receive workflow's first step and nowhere else, and a
        // receive workflow's one step is the conclusion. A stage carrying one means the workflow was
        // not built by this app-lib's expansion.
        var task = new ArchivingTask();

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(Delivered()), new ExecuteServiceTaskPayload("archiving", "RecordDispatch"));

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxReceiptOnStage", failed.ExceptionType);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Conclusion_HandedAnAmbiguousRendezvous_FailsPermanently(bool both)
    {
        // Exactly one of the message and the closure reason is present, by the engine's contract.
        // Reading "neither" as a closure would let a malformed callback end an exchange, and an
        // absent message is an instruction, not an absence of information.
        var task = new ArchivingTask();
        AppCallbackMailbox ambiguous = both
            ? Delivered() with
            {
                DisposedReason = MailboxDisposedReason.Request,
            }
            : new AppCallbackMailbox { Id = _mailboxId, Seq = 0 };

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(ambiguous), new ExecuteServiceTaskPayload("archiving"));

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxReceiptAmbiguous", failed.ExceptionType);
        Assert.Null(task.Conclusion);
    }

    [Fact]
    public async Task AwaitNextReply_FromATaskThatAnswersNoMessage_IsRejectedNonRetryably()
    {
        // There is no next message to await outside an exchange, and no receiver to enqueue. It must
        // not fall through to an ordinary success, which would settle a task that believes it is
        // still waiting.
        var task = new PlainTask { Verdict = ServiceTaskResult.AwaitNextReply() };

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(), new ExecuteServiceTaskPayload("archiving"));

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("AwaitNextReplyOutsideAnExchange", failed.ExceptionType);
    }

    [Fact]
    public async Task AwaitNextReply_OnADeliveredMessage_AsksTheRelayForTheNextReceiver()
    {
        var task = new ArchivingTask { Verdict = ServiceTaskResult.AwaitNextReply() };

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(Delivered(seq: 1)), new ExecuteServiceTaskPayload("archiving"));

        SuccessfulProcessEngineCommandResult success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.False(success.AutoAdvanceProcess);
        MailboxContinuation.AwaitNextMessage awaiting = Assert.IsType<MailboxContinuation.AwaitNextMessage>(
            success.MailboxContinuation
        );
        Assert.Equal(_mailboxId, awaiting.MailboxId);
        Assert.Equal("archiving", awaiting.ServiceTaskType);
    }

    [Fact]
    public async Task AwaitNextReply_OnAClosedMailbox_IsRejectedNonRetryably()
    {
        // The contract violation the engine explicitly leaves to the app-lib. It is reachable
        // through the command, not just through the relay's own unit, because that is where an app
        // author's handler actually returns it.
        var task = new ArchivingTask { Verdict = ServiceTaskResult.AwaitNextReply() };

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(Closed(MailboxDisposedReason.Deadline)), new ExecuteServiceTaskPayload("archiving"));

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxExchangeAlreadyClosed", failed.ExceptionType);
        Assert.Null(failed.MailboxContinuation);
    }

    [Fact]
    public async Task Conclusion_ThatSucceeds_CarriesTheConclusionAndDropsTheMailboxFromTheBlob()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(_mailboxId);
        var task = new ArchivingTask { Verdict = ServiceTaskResult.Success("confirm") };

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(Delivered(), carry), new ExecuteServiceTaskPayload("archiving"));

        SuccessfulProcessEngineCommandResult success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.True(success.AutoAdvanceProcess);
        Assert.Equal("confirm", success.AutoAdvanceAction);
        Assert.IsType<MailboxContinuation.Conclude>(success.MailboxContinuation);
        Assert.True(carry.MailboxConcluded);
    }

    [Fact]
    public async Task Conclusion_ThatFailsPermanently_StillCarriesTheConclusion()
    {
        var task = new ArchivingTask
        {
            Verdict = ServiceTaskResult.FailedPermanent("the archive never confirmed before the deadline"),
        };

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(Closed(MailboxDisposedReason.Deadline)), new ExecuteServiceTaskPayload("archiving"));

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.IsType<MailboxContinuation.Conclude>(failed.MailboxContinuation);
    }
}
