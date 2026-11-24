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
/// The step that opens an external stage's mailbox before its send: what keys the mint, which timeout it asks for,
/// what the carry ends up holding, and what each refusal — the engine's and the plain index-not-found guard — does
/// to the step.
/// </summary>
public class MintMailboxTests
{
    private static readonly Guid _instanceGuid = new("2b3e9260-24d9-4c0a-8b93-ef2c9c7dcbde");

    /// <summary>The item index of the external stage whose mailbox the mint step opens.</summary>
    private const int SendStageIndex = 0;

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
            CancellationToken cancellationToken = default
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
            CancellationToken cancellationToken = default
        ) => throw new NotSupportedException();

        public Task<WorkflowStatusResponse?> GetWorkflow(
            string ns,
            Guid workflowId,
            CancellationToken cancellationToken = default
        ) => throw new NotSupportedException();

        public Task<WorkflowCollectionDetailResponse?> GetCollection(
            string ns,
            string key,
            CancellationToken cancellationToken = default
        ) => throw new NotSupportedException();

        public Task<IReadOnlyList<WorkflowStatusResponse>> ListWorkflows(
            string ns,
            string? collectionKey = null,
            Dictionary<string, string>? labels = null,
            IReadOnlyList<PersistentItemStatus>? statuses = null,
            CancellationToken cancellationToken = default
        ) => throw new NotSupportedException();

        public Task<CancelWorkflowResponse> CancelWorkflow(
            string ns,
            Guid workflowId,
            CancellationToken cancellationToken = default
        ) => throw new NotSupportedException();

        public Task<ResumeWorkflowResponse> ResumeWorkflow(
            string ns,
            Guid workflowId,
            bool cascade = false,
            CancellationToken cancellationToken = default
        ) => throw new NotSupportedException();

        public Task<MailboxResponse?> CloseMailbox(
            string ns,
            Guid mailboxId,
            CancellationToken cancellationToken = default
        ) => throw new NotSupportedException();

        public Task<MailboxDeliveryResult> DeliverToMailbox(
            string ns,
            Guid mailboxId,
            MailboxDeliveryRequest request,
            CancellationToken cancellationToken = default
        ) => throw new NotSupportedException();
    }

    private static Task<ServiceTaskResult> SendToArchive(StageContext context, ReplyAddress address) =>
        Task.FromResult(ServiceTaskResult.Completed());

    private static Task<ServiceTaskReplyResult> HandleArchiveReply(StageContext context, ServiceTaskReply reply) =>
        Task.FromResult(ServiceTaskReplyResult.Completed());

    private static Task<ServiceTaskResult> RecordArchived(StageContext context) =>
        Task.FromResult(ServiceTaskResult.Completed());

    /// <summary>The shape the mint step is planned for: an external stage, here with a stage after it.</summary>
    private sealed class ArchivingTask : IServiceTask
    {
        public string Type => "archiving";

        public void DefineExecute(PipelineBuilder.ServiceTask pipeline) =>
            pipeline
                .ExternalStage(SendToArchive, HandleArchiveReply, timeout: TimeSpan.FromDays(3))
                .Stage(RecordArchived);
    }

    /// <summary>An external stage that gives no timeout of its own.</summary>
    private sealed class DefaultTimeoutTask : IServiceTask
    {
        public string Type => "archiving";

        public void DefineExecute(PipelineBuilder.ServiceTask pipeline) =>
            pipeline.ExternalStage(SendToArchive, HandleArchiveReply);
    }

    /// <summary>Two external stages with different timeouts: the mint reads the one at its own index.</summary>
    private sealed class ArchiveThenJournalTask : IServiceTask
    {
        public string Type => "archiving";

        public void DefineExecute(PipelineBuilder.ServiceTask pipeline) =>
            pipeline
                .ExternalStage(SendToArchive, HandleArchiveReply, timeout: TimeSpan.FromDays(3))
                .ExternalStage(SendToArchive, HandleArchiveReply, timeout: TimeSpan.FromDays(5));
    }

    /// <summary>Drift: the pipeline composes a stage where this workflow expects an external one.</summary>
    private sealed class NoLongerExternalTask : IServiceTask
    {
        public string Type => "archiving";

        public void DefineExecute(PipelineBuilder.ServiceTask pipeline) => pipeline.Stage(RecordArchived);
    }

    /// <summary>Drift: nothing composes at this index at all.</summary>
    private sealed class ShorterPipelineTask : IServiceTask
    {
        public string Type => "archiving";

        public void DefineExecute(PipelineBuilder.ServiceTask pipeline) =>
            pipeline.ExternalStage(SendToArchive, HandleArchiveReply, timeout: TimeSpan.FromDays(3));
    }

    private static MintMailbox CreateCommand(IServiceTask serviceTask, IWorkflowEngineClient client)
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        services.AddSingleton(serviceTask);
        ServiceProvider sp = services.BuildServiceProvider();

        return new MintMailbox(sp.GetRequiredService<AppImplementationFactory>(), client);
    }

    private static WorkflowEngineCommandContext CreateContext(
        Guid? stepId = null,
        WorkflowCallbackStateCarry? carry = null
    )
    {
        var instance = new Instance
        {
            Id = $"1337/{_instanceGuid}",
            Org = "ttd",
            AppId = "ttd/test-app",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
        };
        var mutatorMock = new Mock<IInstanceDataMutator>();
        mutatorMock.Setup(x => x.Instance).Returns(instance);

        return new WorkflowEngineCommandContext
        {
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, _instanceGuid),
            InstanceDataMutator = mutatorMock.Object,
            CancellationToken = CancellationToken.None,
            StateCarry = carry ?? new WorkflowCallbackStateCarry(),
            Payload = new AppCallbackPayload
            {
                CommandKey = MintMailbox.Key,
                Actor = new Actor { UserId = 1337 },
                ExecutionReferenceTime = new DateTimeOffset(2026, 8, 19, 10, 0, 0, TimeSpan.Zero),
                State = "{}",
                WorkflowId = Guid.NewGuid(),
                StepId = stepId ?? Guid.NewGuid(),
            },
        };
    }

    private static MintMailboxPayload Payload(int stageIndex = SendStageIndex) => new("archiving", stageIndex);

    [Fact]
    public async Task Execute_MintsKeyedOnTheStepIdWithTheStagesTimeout()
    {
        var minter = new RecordingMailboxMinter();
        Guid stepId = Guid.NewGuid();

        WorkflowEngineCommandResult result = await CreateCommand(new ArchivingTask(), minter)
            .Execute(CreateContext(stepId), Payload());

        Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);

        (string ns, MailboxCreateRequest request) = Assert.Single(minter.Mints);
        Assert.Equal("ttd/test-app", ns);
        Assert.Equal(stepId.ToString(), request.IdempotencyKey);
        Assert.Equal(TimeSpan.FromDays(3), request.Timeout);
        Assert.Equal(_instanceGuid.ToString(), request.CollectionKey);
    }

    /// <summary>
    /// A stage that gives no timeout still opens an address with one: 14 days, a literal here so that changing the
    /// default is a decision this test has to be told about.
    /// </summary>
    [Fact]
    public async Task Execute_ForAStageThatGivesNoTimeout_MintsWithTheDefaultOf14Days()
    {
        var minter = new RecordingMailboxMinter();
        var carry = new WorkflowCallbackStateCarry();

        await CreateCommand(new DefaultTimeoutTask(), minter).Execute(CreateContext(carry: carry), Payload());

        Assert.Equal(TimeSpan.FromDays(14), Assert.Single(minter.Mints).Request.Timeout);
        Assert.Equal(
            new DateTimeOffset(2026, 9, 2, 10, 0, 0, TimeSpan.Zero),
            carry.FindMailbox(SendStageIndex)?.Deadline
        );
    }

    [Fact]
    public async Task Execute_RecordsTheMintedMailboxOnTheCarryUnderTheStageIndex()
    {
        var minter = new RecordingMailboxMinter();
        var carry = new WorkflowCallbackStateCarry();

        await CreateCommand(new ArchivingTask(), minter).Execute(CreateContext(carry: carry), Payload());

        CarriedMailbox? recorded = carry.FindMailbox(SendStageIndex);
        Assert.NotNull(recorded);
        Assert.NotEqual(Guid.Empty, recorded.Id);
        Assert.Equal(new DateTimeOffset(2026, 8, 22, 10, 0, 0, TimeSpan.Zero), recorded.Deadline);
        Assert.NotNull(carry.Mailboxes);
        Assert.Equal($"{SendStageIndex}", Assert.Single(carry.Mailboxes).Key);
    }

    /// <summary>
    /// The mint reads the external stage at its own index: the second of two takes the second's timeout and is
    /// carried under that index, never the first's.
    /// </summary>
    [Fact]
    public async Task Execute_ForALaterExternalStage_MintsWithItsTimeoutAndCarriesItUnderItsIndex()
    {
        var minter = new RecordingMailboxMinter();
        var carry = new WorkflowCallbackStateCarry();

        WorkflowEngineCommandResult result = await CreateCommand(new ArchiveThenJournalTask(), minter)
            .Execute(CreateContext(carry: carry), Payload(stageIndex: 1));

        Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        Assert.Equal(TimeSpan.FromDays(5), Assert.Single(minter.Mints).Request.Timeout);
        Assert.Null(carry.FindMailbox(SendStageIndex));
        Assert.NotNull(carry.FindMailbox(1));
        Assert.NotNull(carry.Mailboxes);
        Assert.Equal("1", Assert.Single(carry.Mailboxes).Key);
    }

    /// <summary>
    /// The property the whole step exists for: a replayed attempt lands on the mailbox the first one
    /// published, so the send after it can never publish a second address.
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

        Assert.Equal(first.FindMailbox(SendStageIndex)?.Id, second.FindMailbox(SendStageIndex)?.Id);
        Assert.Equal(2, minter.Mints.Count);
        Assert.All(minter.Mints, mint => Assert.Equal(stepId.ToString(), mint.Request.IdempotencyKey));
    }

    [Fact]
    public async Task Execute_WithoutAStepId_FailsPermanentlyRatherThanMintingASharedMailbox()
    {
        var minter = new RecordingMailboxMinter();
        var carry = new WorkflowCallbackStateCarry();

        WorkflowEngineCommandResult result = await CreateCommand(new ArchivingTask(), minter)
            .Execute(CreateContext(Guid.Empty, carry), Payload());

        FailedWorkflowEngineCommandResult failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxStepIdMissing", failed.ExceptionType);
        Assert.Contains($"index {SendStageIndex}", failed.ErrorMessage, StringComparison.Ordinal);
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

        WorkflowEngineCommandResult result = await CreateCommand(new ArchivingTask(), minter)
            .Execute(CreateContext(carry: carry), Payload());

        FailedWorkflowEngineCommandResult failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxRejected", failed.ExceptionType);
        Assert.Contains($"index {SendStageIndex}", failed.ErrorMessage, StringComparison.Ordinal);
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

        WorkflowEngineCommandResult result = await CreateCommand(new ArchivingTask(), minter)
            .Execute(CreateContext(carry: carry), Payload());

        FailedWorkflowEngineCommandResult failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.False(failed.NonRetryable);
        Assert.Equal("MailboxAtCapacity", failed.ExceptionType);
        Assert.Contains($"index {SendStageIndex}", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Contains("maximum of 100 open mailboxes", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Null(carry.Mailboxes);
    }

    [Fact]
    public async Task Execute_UnreachableEngine_FailsRetryably()
    {
        var minter = new RecordingMailboxMinter { Throws = new HttpRequestException("engine unreachable") };
        var carry = new WorkflowCallbackStateCarry();

        WorkflowEngineCommandResult result = await CreateCommand(new ArchivingTask(), minter)
            .Execute(CreateContext(carry: carry), Payload());

        FailedWorkflowEngineCommandResult failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.False(failed.NonRetryable);
        Assert.Null(carry.Mailboxes);
    }

    [Fact]
    public async Task Execute_WhenAStageComposesAtIndex_FailsPermanentlyWithoutMinting()
    {
        var minter = new RecordingMailboxMinter();
        var carry = new WorkflowCallbackStateCarry();

        WorkflowEngineCommandResult result = await CreateCommand(new NoLongerExternalTask(), minter)
            .Execute(CreateContext(carry: carry), Payload());

        FailedWorkflowEngineCommandResult failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxDeclarationNotFound", failed.ExceptionType);
        Assert.Contains($"an external stage at index {SendStageIndex}", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Contains("now composes none at that index", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Empty(minter.Mints);
        Assert.Null(carry.Mailboxes);
    }

    /// <summary>The same miss with nothing at the index at all.</summary>
    [Fact]
    public async Task Execute_WhenNothingComposesAtIndex_FailsPermanentlyWithThePlainVerdict()
    {
        var minter = new RecordingMailboxMinter();

        WorkflowEngineCommandResult result = await CreateCommand(new ShorterPipelineTask(), minter)
            .Execute(CreateContext(), Payload(stageIndex: 1));

        FailedWorkflowEngineCommandResult failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxDeclarationNotFound", failed.ExceptionType);
        Assert.Contains("an external stage at index 1", failed.ErrorMessage, StringComparison.Ordinal);
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

        WorkflowEngineCommandResult result = await command.Execute(CreateContext(), Payload());

        FailedWorkflowEngineCommandResult failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.False(failed.NonRetryable);
        Assert.Empty(minter.Mints);
    }

    [Fact]
    public async Task Execute_WithAMissingPayload_FailsPermanently()
    {
        var minter = new RecordingMailboxMinter();
        IWorkflowEngineCommand command = CreateCommand(new ArchivingTask(), minter);
        WorkflowEngineCommandContext context = CreateContext();
        context = context with { Payload = context.Payload with { Payload = null } };

        WorkflowEngineCommandResult result = await command.Execute(context);

        FailedWorkflowEngineCommandResult failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
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
        string? json = CommandPayloadSerializer.Serialize<CommandRequestPayload>(new MintMailboxPayload("t", 3));
        Assert.NotNull(json);
        Assert.Contains("mintMailbox", json, StringComparison.Ordinal);

        var restored = CommandPayloadSerializer.Deserialize<MintMailboxPayload>(json);
        Assert.NotNull(restored);
        Assert.Equal("t", restored.ServiceTaskType);
        Assert.Equal(3, restored.StageIndex);
    }
}
