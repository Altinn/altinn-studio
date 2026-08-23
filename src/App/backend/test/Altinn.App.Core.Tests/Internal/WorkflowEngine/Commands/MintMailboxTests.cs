using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
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
/// The step that opens the mailbox: what keys the mint, what the carry ends up holding, and what each
/// refusal — the engine's and the drift guards' — does to the step.
/// </summary>
public class MintMailboxTests
{
    private static readonly Guid InstanceGuid = new("2b3e9260-24d9-4c0a-8b93-ef2c9c7dcbde");
    private const string SendStage = "SendToArchive";

    /// <summary>Answers mints idempotently on the key, so a test can tell "minted twice" from "replayed".</summary>
    private sealed class RecordingMailboxMinter : IWorkflowEngineClient
    {
        private readonly Dictionary<string, MailboxResponse> _byKey = new(StringComparer.Ordinal);

        public List<(string Namespace, MailboxCreateRequest Request)> Mints { get; } = [];

        public MailboxMintResult? Answer { get; init; }

        public Exception? Throws { get; init; }

        public Task<MailboxMintResult> MintMailbox(
            string ns,
            MailboxCreateRequest request,
            CancellationToken ct = default
        )
        {
            Mints.Add((ns, request));

            if (Throws is { } exception)
            {
                throw exception;
            }

            if (Answer is { } scripted)
            {
                return Task.FromResult(scripted);
            }

            if (!_byKey.TryGetValue(request.IdempotencyKey, out MailboxResponse? mailbox))
            {
                DateTimeOffset createdAt = new(2026, 8, 19, 10, 0, 0, TimeSpan.Zero);
                mailbox = new MailboxResponse
                {
                    Id = Guid.NewGuid(),
                    Namespace = ns,
                    IdempotencyKey = request.IdempotencyKey,
                    CollectionKey = request.CollectionKey,
                    Timeout = request.Timeout,
                    Deadline = createdAt + request.Timeout,
                    Status = MailboxStatus.Open,
                    NextIdx = 0,
                    NextSeq = 0,
                    CreatedAt = createdAt,
                };
                _byKey[request.IdempotencyKey] = mailbox;
            }

            return Task.FromResult<MailboxMintResult>(new MailboxMintResult.Minted(mailbox));
        }

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

        public Task<MailboxResponse?> CloseMailbox(string ns, Guid mailboxId, CancellationToken ct = default) =>
            throw new NotSupportedException();

        public Task<MailboxDeliveryResult> DeliverToMailbox(
            string ns,
            Guid mailboxId,
            MailboxDeliveryRequest request,
            CancellationToken ct = default
        ) => throw new NotSupportedException();
    }

    /// <summary>The shape the mint step is emitted for: a stage that sends, answered by a message.</summary>
    private sealed class ArchivingTask : IPipelineServiceTask
    {
        public string Type => "archiving";

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage(SendStage, _ => Task.FromResult(ServiceTaskStageResult.Completed()))
                .Stage("RecordDispatch", _ => Task.FromResult(ServiceTaskStageResult.Completed()))
                .Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()))
                .WithReplyFrom(SendStage, new MailboxOptions { Timeout = TimeSpan.FromDays(3) });
    }

    /// <summary>Drift: the stage the workflow was enqueued against no longer exists.</summary>
    private sealed class RenamedStageTask : IPipelineServiceTask
    {
        public string Type => "archiving";

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage("SendToArchiveV2", _ => Task.FromResult(ServiceTaskStageResult.Completed()))
                .Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()))
                .WithReplyFrom("SendToArchiveV2", new MailboxOptions { Timeout = TimeSpan.FromDays(3) });
    }

    /// <summary>Drift: neither the stage nor any mailbox declaration survived the redeploy.</summary>
    private sealed class NoStageNoMailboxTask : IPipelineServiceTask
    {
        public string Type => "archiving";

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage("SendToArchiveV2", _ => Task.FromResult(ServiceTaskStageResult.Completed()))
                .Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()));
    }

    /// <summary>Drift: the stage is still there, but the pipeline no longer opens a mailbox at all.</summary>
    private sealed class NoLongerDeclaringTask : IPipelineServiceTask
    {
        public string Type => "archiving";

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage(SendStage, _ => Task.FromResult(ServiceTaskStageResult.Completed()))
                .Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()));
    }

    /// <summary>Drift: the declaration moved to a later stage while this workflow was in flight.</summary>
    private sealed class MovedDeclarationTask : IPipelineServiceTask
    {
        public string Type => "archiving";

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage(SendStage, _ => Task.FromResult(ServiceTaskStageResult.Completed()))
                .Stage("SendReceipt", _ => Task.FromResult(ServiceTaskStageResult.Completed()))
                .Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()))
                .WithReplyFrom("SendReceipt", new MailboxOptions { Timeout = TimeSpan.FromDays(3) });
    }

    private static MintMailbox CreateCommand(IPipelineServiceTask serviceTask, IWorkflowEngineClient client)
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        services.AddSingleton(serviceTask);
        ServiceProvider sp = services.BuildServiceProvider();

        return new MintMailbox(sp.GetRequiredService<AppImplementationFactory>(), client);
    }

    private static ProcessEngineCommandContext CreateContext(
        Guid? stepId = null,
        WorkflowCallbackStateCarry? carry = null
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
                CommandKey = MintMailbox.Key,
                Actor = new Actor { UserId = 1337 },
                LockToken = Guid.NewGuid().ToString(),
                ExecutionReferenceTime = new DateTimeOffset(2026, 8, 19, 10, 0, 0, TimeSpan.Zero),
                State = "{}",
                WorkflowId = Guid.NewGuid(),
                StepId = stepId ?? Guid.NewGuid(),
            },
        };
    }

    private static MintMailboxPayload Payload(string stageName = SendStage) => new("archiving", stageName);

    [Fact]
    public async Task Execute_MintsKeyedOnTheStepIdWithTheDeclaredTimeout()
    {
        var minter = new RecordingMailboxMinter();
        Guid stepId = Guid.NewGuid();

        ProcessEngineCommandResult result = await CreateCommand(new ArchivingTask(), minter)
            .Execute(CreateContext(stepId), Payload());

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);

        (string ns, MailboxCreateRequest request) = Assert.Single(minter.Mints);
        Assert.Equal("ttd/test-app", ns);
        Assert.Equal(stepId.ToString(), request.IdempotencyKey);
        Assert.Equal(TimeSpan.FromDays(3), request.Timeout);
        Assert.Equal(InstanceGuid.ToString(), request.CollectionKey);
    }

    [Fact]
    public async Task Execute_RecordsTheMintedMailboxOnTheCarryUnderTheOpeningStage()
    {
        var minter = new RecordingMailboxMinter();
        var carry = new WorkflowCallbackStateCarry();

        await CreateCommand(new ArchivingTask(), minter).Execute(CreateContext(carry: carry), Payload());

        CarriedMailbox? recorded = carry.FindMailbox(SendStage);
        Assert.NotNull(recorded);
        Assert.NotEqual(Guid.Empty, recorded.Id);
        Assert.Equal(new DateTimeOffset(2026, 8, 22, 10, 0, 0, TimeSpan.Zero), recorded.Deadline);
        Assert.NotNull(carry.Mailboxes);
        Assert.Equal(SendStage, Assert.Single(carry.Mailboxes).Key);
    }

    /// <summary>
    /// The property the whole step exists for: a replayed attempt lands on the mailbox the first one
    /// published, so the stage after it can never publish a second address.
    /// </summary>
    [Fact]
    public async Task Execute_RetriedOnTheSameStep_ReplaysOntoTheSameMailbox()
    {
        var minter = new RecordingMailboxMinter();
        Guid stepId = Guid.NewGuid();
        var first = new WorkflowCallbackStateCarry();
        var second = new WorkflowCallbackStateCarry();

        await CreateCommand(new ArchivingTask(), minter).Execute(CreateContext(stepId, first), Payload());
        await CreateCommand(new ArchivingTask(), minter).Execute(CreateContext(stepId, second), Payload());

        Assert.Equal(first.FindMailbox(SendStage)?.Id, second.FindMailbox(SendStage)?.Id);
        Assert.Equal(2, minter.Mints.Count);
        Assert.All(minter.Mints, mint => Assert.Equal(stepId.ToString(), mint.Request.IdempotencyKey));
    }

    [Fact]
    public async Task Execute_WithoutAStepId_FailsPermanentlyRatherThanMintingASharedMailbox()
    {
        var minter = new RecordingMailboxMinter();
        var carry = new WorkflowCallbackStateCarry();

        ProcessEngineCommandResult result = await CreateCommand(new ArchivingTask(), minter)
            .Execute(CreateContext(Guid.Empty, carry), Payload());

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxStepIdMissing", failed.ExceptionType);
        Assert.Empty(minter.Mints);
        Assert.Null(carry.Mailboxes);
    }

    [Fact]
    public async Task Execute_RejectedMint_FailsPermanentlyWithTheEngineDetail()
    {
        var minter = new RecordingMailboxMinter
        {
            Answer = new MailboxMintResult.Rejected(
                "Timeout 30.00:00:00 exceeds the maximum mailbox timeout of 21.00:00:00."
            ),
        };
        var carry = new WorkflowCallbackStateCarry();

        ProcessEngineCommandResult result = await CreateCommand(new ArchivingTask(), minter)
            .Execute(CreateContext(carry: carry), Payload());

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxRejected", failed.ExceptionType);
        Assert.Contains(SendStage, failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Contains("exceeds the maximum mailbox timeout", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Null(carry.Mailboxes);
    }

    [Fact]
    public async Task Execute_AtCapacityMint_FailsRetryablyWithTheEngineDetail()
    {
        var minter = new RecordingMailboxMinter
        {
            Answer = new MailboxMintResult.AtCapacity(
                "Collection 'inst-1' already holds the maximum of 100 open mailboxes."
            ),
        };
        var carry = new WorkflowCallbackStateCarry();

        ProcessEngineCommandResult result = await CreateCommand(new ArchivingTask(), minter)
            .Execute(CreateContext(carry: carry), Payload());

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.False(failed.NonRetryable);
        Assert.Equal("MailboxAtCapacity", failed.ExceptionType);
        Assert.Contains(SendStage, failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Contains("maximum of 100 open mailboxes", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Null(carry.Mailboxes);
    }

    [Fact]
    public async Task Execute_UnreachableEngine_FailsRetryably()
    {
        var minter = new RecordingMailboxMinter { Throws = new HttpRequestException("engine unreachable") };
        var carry = new WorkflowCallbackStateCarry();

        ProcessEngineCommandResult result = await CreateCommand(new ArchivingTask(), minter)
            .Execute(CreateContext(carry: carry), Payload());

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.False(failed.NonRetryable);
        Assert.Null(carry.Mailboxes);
    }

    /// <summary>Redeploy drift: the stage this step was emitted for was renamed or removed mid-flight.</summary>
    [Fact]
    public async Task Execute_WhenTheStageIsGone_FailsPermanentlyNamingTheRedeployFix()
    {
        var minter = new RecordingMailboxMinter();

        ProcessEngineCommandResult result = await CreateCommand(new RenamedStageTask(), minter)
            .Execute(CreateContext(), Payload());

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("ServiceTaskStageNotFound", failed.ExceptionType);
        Assert.Contains($"no stage named '{SendStage}'", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Contains("redeploy", failed.ErrorMessage, StringComparison.Ordinal);
        // The actionable half: a stage renamed together with its declaration is the likeliest shape of this
        // drift, so the message says where the declaration went rather than only that the stage is gone.
        Assert.Contains(
            "mailbox is now opened by stage 'SendToArchiveV2'",
            failed.ErrorMessage,
            StringComparison.Ordinal
        );
        Assert.Empty(minter.Mints);
    }

    /// <summary>
    /// The same drift with nowhere to point: the stage and the declaration both went, so the message must not
    /// invent a stage the mailbox moved to.
    /// </summary>
    [Fact]
    public async Task Execute_WhenTheStageAndTheDeclarationBothWent_FailsPermanentlyWithoutNamingARelocation()
    {
        var minter = new RecordingMailboxMinter();

        ProcessEngineCommandResult result = await CreateCommand(new NoStageNoMailboxTask(), minter)
            .Execute(CreateContext(), Payload());

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("ServiceTaskStageNotFound", failed.ExceptionType);
        Assert.DoesNotContain("now opened by stage", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Empty(minter.Mints);
    }

    /// <summary>Redeploy drift: the stage survived, the declaration did not.</summary>
    [Fact]
    public async Task Execute_WhenTheDeclarationIsGone_FailsPermanently()
    {
        var minter = new RecordingMailboxMinter();

        ProcessEngineCommandResult result = await CreateCommand(new NoLongerDeclaringTask(), minter)
            .Execute(CreateContext(), Payload());

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxDeclarationNotFound", failed.ExceptionType);
        Assert.Contains("now opens no mailbox at all", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Empty(minter.Mints);
    }

    /// <summary>Redeploy drift: the declaration moved, so minting here would open an orphan.</summary>
    [Fact]
    public async Task Execute_WhenTheDeclarationMoved_FailsPermanentlyNamingBothStages()
    {
        var minter = new RecordingMailboxMinter();

        ProcessEngineCommandResult result = await CreateCommand(new MovedDeclarationTask(), minter)
            .Execute(CreateContext(), Payload());

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxDeclarationNotFound", failed.ExceptionType);
        Assert.Contains($"from stage '{SendStage}'", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Contains("now opened by stage 'SendReceipt'", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Empty(minter.Mints);
    }

    [Fact]
    public async Task Execute_WhenNoServiceTaskIsRegisteredForTheType_FailsRetryably()
    {
        var minter = new RecordingMailboxMinter();
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        ServiceProvider sp = services.BuildServiceProvider();
        var command = new MintMailbox(sp.GetRequiredService<AppImplementationFactory>(), minter);

        ProcessEngineCommandResult result = await command.Execute(CreateContext(), Payload());

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.False(failed.NonRetryable);
        Assert.Empty(minter.Mints);
    }

    [Fact]
    public async Task Execute_WithAMissingPayload_FailsPermanently()
    {
        var minter = new RecordingMailboxMinter();
        IWorkflowEngineCommand command = CreateCommand(new ArchivingTask(), minter);
        ProcessEngineCommandContext context = CreateContext();
        context = context with { Payload = context.Payload with { Payload = null } };

        ProcessEngineCommandResult result = await command.Execute(context);

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("InvalidPayloadException", failed.ExceptionType);
        Assert.Empty(minter.Mints);
    }

    /// <summary>
    /// The payload has to survive the engine round trip: it is serialized at enqueue and read back at the
    /// callback through the polymorphic contract, so an unregistered discriminator is a runtime failure.
    /// </summary>
    [Fact]
    public void Payload_RoundTripsThroughThePolymorphicCommandContract()
    {
        string? json = CommandPayloadSerializer.Serialize<CommandRequestPayload>(new MintMailboxPayload("t", "s"));
        Assert.NotNull(json);
        Assert.Contains("mintMailbox", json, StringComparison.Ordinal);

        var restored = CommandPayloadSerializer.Deserialize<MintMailboxPayload>(json);
        Assert.NotNull(restored);
        Assert.Equal("t", restored.ServiceTaskType);
        Assert.Equal("s", restored.StageName);
    }
}
