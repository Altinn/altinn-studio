using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands;

/// <summary>
/// The mailbox half of <see cref="ExecuteServiceTask"/>: the declaring stage being handed the address the
/// <see cref="MintMailbox"/> step published, and what the executions that open no mailbox do instead. The
/// mint itself is <see cref="MintMailboxTests"/>'s subject — nothing here opens a mailbox.
/// </summary>
public class ExecuteServiceTaskMailboxTests
{
    private static readonly Guid InstanceGuid = new("2b3e9260-24d9-4c0a-8b93-ef2c9c7dcbde");
    private static readonly Guid CarriedMailboxId = new("018f4e00-0000-7000-8000-0000000000aa");
    private static readonly DateTimeOffset CarriedDeadline = new(2026, 8, 22, 10, 0, 0, TimeSpan.Zero);
    private const string SendStage = "SendToArchive";

    private sealed class ArchivingTask : IPipelineServiceTask
    {
        public string Type => "archiving";

        public Dictionary<string, ServiceTaskContext> Seen { get; } = new(StringComparer.Ordinal);

        /// <summary>The address handed to the stage that opens the mailbox.</summary>
        public ServiceTaskMailbox? SentTo { get; private set; }

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage(
                    SendStage,
                    (context, mailbox) =>
                    {
                        Seen[SendStage] = context;
                        SentTo = mailbox;
                        return Task.FromResult(ServiceTaskStageResult.Completed());
                    },
                    new MailboxOptions { Timeout = TimeSpan.FromDays(3) },
                    out MailboxHandle archive
                )
                .Stage(
                    "RecordDispatch",
                    Record<ServiceTaskStageResult>("RecordDispatch", ServiceTaskStageResult.Completed())
                )
                .ConcludeOnReplies(
                    archive,
                    onMessage: Record<ServiceTaskExchangeResult, ServiceTaskReply>(
                        "OnMessage",
                        ServiceTaskResult.Success()
                    ),
                    onClosed: Record<ServiceTaskResult, MailboxClosedReason>("OnClosed", ServiceTaskResult.Success())
                );

        private Func<ServiceTaskContext, Task<T>> Record<T>(string step, T result) =>
            context =>
            {
                Seen[step] = context;
                return Task.FromResult(result);
            };

        private Func<ServiceTaskContext, TArg, Task<T>> Record<T, TArg>(string step, T result) =>
            (context, _) =>
            {
                Seen[step] = context;
                return Task.FromResult(result);
            };
    }

    /// <summary>The same task without a mailbox, for the "declares none" branch.</summary>
    private sealed class PlainTask : IPipelineServiceTask
    {
        public string Type => "archiving";

        public Dictionary<string, ServiceTaskContext> Seen { get; } = new(StringComparer.Ordinal);

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage(
                    SendStage,
                    context =>
                    {
                        Seen[SendStage] = context;
                        return Task.FromResult(ServiceTaskStageResult.Completed());
                    }
                )
                .Finally(context =>
                {
                    Seen["Finally"] = context;
                    return Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());
                });
    }

    private static ExecuteServiceTask CreateCommand(IPipelineServiceTask serviceTask)
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        services.AddSingleton(serviceTask);
        ServiceProvider sp = services.BuildServiceProvider();

        return new ExecuteServiceTask(
            sp.GetRequiredService<AppImplementationFactory>(),
            TestMailboxDeliveryEnvelope.Create()
        );
    }

    /// <summary>The carry as the mint step leaves it for the stage that sends.</summary>
    private static WorkflowCallbackStateCarry MintedCarry(string stageName = SendStage)
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(stageName, CarriedMailboxId, CarriedDeadline);
        return carry;
    }

    private static ProcessEngineCommandContext CreateContext(
        WorkflowCallbackStateCarry? carry = null,
        AppCallbackMailbox? mailbox = null
    )
    {
        var instance = new Instance
        {
            Id = $"1337/{InstanceGuid}",
            Org = "ttd",
            AppId = "ttd/test-app",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
        };
        var mutatorMock = new Mock<IInstanceDataMutator>();
        mutatorMock.Setup(x => x.Instance).Returns(instance);

        return new ProcessEngineCommandContext
        {
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, InstanceGuid),
            InstanceDataMutator = mutatorMock.Object,
            CancellationToken = CancellationToken.None,
            StateCarry = carry ?? new WorkflowCallbackStateCarry(),
            Payload = new AppCallbackPayload
            {
                CommandKey = ExecuteServiceTask.Key,
                Actor = new Actor { UserId = 1337 },
                LockToken = Guid.NewGuid().ToString(),
                ExecutionReferenceTime = new DateTimeOffset(2026, 8, 19, 10, 0, 0, TimeSpan.Zero),
                State = "{}",
                WorkflowId = Guid.NewGuid(),
                StepId = Guid.NewGuid(),
                Mailbox = mailbox,
            },
        };
    }

    /// <summary>
    /// A rendezvous sealed the way the forwarder seals one — an unsealed payload never reaches a handler.
    /// </summary>
    private static AppCallbackMailbox Delivered(Guid mailboxId, long seq = 0, string payload = "<receipt/>")
    {
        string key = $"source-message-{seq}";
        return new AppCallbackMailbox
        {
            Id = mailboxId,
            Seq = seq,
            Delivery = new AppCallbackMailboxDelivery
            {
                IdempotencyKey = key,
                Payload = TestMailboxDeliveryEnvelope.Create().Wrap(payload, mailboxId, "archiving", key),
                AcceptedAt = new DateTimeOffset(2026, 8, 19, 9, 30, 0, TimeSpan.Zero),
            },
        };
    }

    private static ExecuteServiceTaskPayload Payload(string? stageName) => new("archiving", stageName);

    [Fact]
    public async Task DeclaringStage_IsHandedTheMailboxTheMintStepCarried()
    {
        var task = new ArchivingTask();

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(MintedCarry()), Payload(SendStage));

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);

        ServiceTaskMailbox mailbox = Assert.IsType<ServiceTaskMailbox>(task.SentTo);
        Assert.Equal(CarriedMailboxId, mailbox.Id);
        Assert.Equal(CarriedDeadline, mailbox.Deadline);
    }

    /// <summary>
    /// The stage may not send without an address, and it has no way to obtain one. Two causes reach here and
    /// the wording must name both: a redeploy that <em>added</em> the declaration to this stage, so the
    /// in-flight workflow's step list holds no mint step at all, and a mint step whose record did not survive
    /// into this step's state. Naming only the second sent readers hunting a step that never existed.
    /// </summary>
    [Fact]
    public async Task DeclaringStage_WithoutACarriedMailbox_FailsPermanentlyAndNeverRuns()
    {
        var task = new ArchivingTask();

        ProcessEngineCommandResult result = await CreateCommand(task).Execute(CreateContext(), Payload(SendStage));

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxIdMissingFromState", failed.ExceptionType);
        Assert.Contains($"Stage '{SendStage}' opens a mailbox", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Contains("enqueued before the stage opened one", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Contains("did not survive into this step's state", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Empty(task.Seen);
    }

    /// <summary>
    /// A mailbox carried under another stage's name is not this stage's: the lookup is by name, never by
    /// "the one entry there happens to be".
    /// </summary>
    [Fact]
    public async Task DeclaringStage_WithAMailboxCarriedForAnotherStage_FailsPermanently()
    {
        var task = new ArchivingTask();

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(MintedCarry("SomeOtherStage")), Payload(SendStage));

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxIdMissingFromState", failed.ExceptionType);
        Assert.Empty(task.Seen);
    }

    /// <summary>
    /// A stage that opens no mailbox needs no carried entry, and gets none: the runtime reads the stage's own
    /// declaration to decide what to hand it, so an empty carry is not this stage's problem.
    /// </summary>
    [Fact]
    public async Task NonDeclaringStage_RunsWithAnEmptyCarry()
    {
        var task = new ArchivingTask();

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(), Payload("RecordDispatch"));

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.Contains("RecordDispatch", task.Seen);
        Assert.Null(task.SentTo);
    }

    [Fact]
    public async Task TaskThatOpensNoMailbox_RunsBothItsStepsWithAnEmptyCarry()
    {
        var task = new PlainTask();

        Assert.IsType<SuccessfulProcessEngineCommandResult>(
            await CreateCommand(task).Execute(CreateContext(), Payload(SendStage))
        );
        Assert.IsType<SuccessfulProcessEngineCommandResult>(
            await CreateCommand(task).Execute(CreateContext(), Payload(stageName: null))
        );

        Assert.Contains(SendStage, task.Seen);
        Assert.Contains("Finally", task.Seen);
    }

    /// <summary>
    /// The command reads the carry and never writes it: the mint owns the one entry, and a stage that ran
    /// forwards the blob exactly as it received it.
    /// </summary>
    [Theory]
    [InlineData(SendStage)]
    [InlineData("RecordDispatch")]
    public async Task AnyStage_LeavesTheCarriedMailboxesUntouched(string stageName)
    {
        var task = new ArchivingTask();
        WorkflowCallbackStateCarry carry = MintedCarry();

        await CreateCommand(task).Execute(CreateContext(carry), Payload(stageName));

        Assert.NotNull(carry.Mailboxes);
        KeyValuePair<string, CarriedMailbox> only = Assert.Single(carry.Mailboxes);
        Assert.Equal(SendStage, only.Key);
        Assert.Equal(CarriedMailboxId, only.Value.Id);
    }

    [Fact]
    public async Task ReplyHandlerOfAnExchangePipeline_WithoutARendezvous_FailsPermanentlyAndNeverRuns()
    {
        var task = new ArchivingTask();

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(MintedCarry()), Payload(stageName: null));

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxReceiptMissing", failed.ExceptionType);
        Assert.Empty(task.Seen);
    }
}
