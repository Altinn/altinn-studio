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
/// The mailbox half of <see cref="ExecuteServiceTask"/>: which execution can read the address the
/// <see cref="MintMailbox"/> step published, and what everything else sees. The mint itself is
/// <see cref="MintMailboxTests"/>'s subject — nothing here opens a mailbox.
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

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage(SendStage, Record<ServiceTaskStageResult>(SendStage, ServiceTaskStageResult.Completed()))
                .Stage(
                    "RecordDispatch",
                    Record<ServiceTaskStageResult>("RecordDispatch", ServiceTaskStageResult.Completed())
                )
                .Finally(Record<ServiceTaskResult>("Finally", ServiceTaskResult.Success()))
                .WithReplyFrom(SendStage, new MailboxOptions { Timeout = TimeSpan.FromDays(3) });

        private Func<ServiceTaskContext, Task<T>> Record<T>(string step, T result) =>
            context =>
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
    public async Task DeclaringStage_ReadsTheMailboxTheMintStepCarried()
    {
        var task = new ArchivingTask();

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(MintedCarry()), Payload(SendStage));

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);

        ServiceTaskMailbox mailbox = task.Seen[SendStage].Mailbox;
        Assert.Equal(CarriedMailboxId, mailbox.Id);
        Assert.Equal(CarriedDeadline, mailbox.Deadline);
    }

    /// <summary>
    /// The stage may not send without an address, and it has no way to obtain one: the mint step records it
    /// immediately before this stage runs, so an empty carry means a step between the two dropped it.
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
        Assert.Contains("mint step records it", failed.ErrorMessage, StringComparison.Ordinal);
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

    [Theory]
    [InlineData("RecordDispatch")]
    [InlineData(null)]
    public async Task StepThatIsNotTheDeclaringStage_ReadingTheMailboxThrows(string? stageName)
    {
        var task = new ArchivingTask();

        await CreateCommand(task)
            .Execute(
                CreateContext(MintedCarry(), stageName is null ? Delivered(CarriedMailboxId) : null),
                Payload(stageName)
            );

        ServiceTaskContext seen = task.Seen[stageName ?? "Finally"];
        InvalidOperationException exception = Assert.Throws<InvalidOperationException>(() => seen.Mailbox);
        Assert.Contains(
            $"mailbox is opened by stage '{SendStage}' and is readable only there",
            exception.Message,
            StringComparison.Ordinal
        );
        Assert.Contains(
            stageName is null ? "the pipeline's conclusion" : $"stage '{stageName}'",
            exception.Message,
            StringComparison.Ordinal
        );
    }

    [Theory]
    [InlineData(SendStage)]
    [InlineData(null)]
    public async Task TaskThatDeclaresNoMailbox_ReadingTheMailboxThrows(string? stageName)
    {
        var task = new PlainTask();

        await CreateCommand(task).Execute(CreateContext(), Payload(stageName));

        InvalidOperationException exception = Assert.Throws<InvalidOperationException>(() =>
            task.Seen[stageName ?? "Finally"].Mailbox
        );
        Assert.Contains("this task opens no mailbox", exception.Message, StringComparison.Ordinal);
        Assert.Contains(nameof(ServiceTaskPipeline.WithReplyFrom), exception.Message, StringComparison.Ordinal);
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
    public async Task ConclusionOfADeclaringPipeline_WithoutARendezvous_FailsPermanentlyAndNeverRuns()
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
