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
/// refusal — the engine's and the plain index-not-found guard — does to the step.
/// </summary>
public class MintMailboxTests
{
    private static readonly Guid _instanceGuid = new("2b3e9260-24d9-4c0a-8b93-ef2c9c7dcbde");

    /// <summary>The item index of the stage whose mailbox the mint step opens.</summary>
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

    private static readonly MailboxOptions _threeDays = new() { Timeout = TimeSpan.FromDays(3) };

    private static Task<ServiceTaskStageResult> Plain(ServiceTaskContext context) =>
        Task.FromResult(ServiceTaskStageResult.Completed());

    private static Task<ServiceTaskStageResult> Send(ServiceTaskContext context, ServiceTaskMailbox mailbox) =>
        Task.FromResult(ServiceTaskStageResult.Completed());

    private static Task<ServiceTaskExchangeResult> OnMessage(ServiceTaskContext context, ServiceTaskReply reply) =>
        Task.FromResult<ServiceTaskExchangeResult>(ServiceTaskResult.Success());

    private static Task<ServiceTaskResult> OnClosed(ServiceTaskContext context, MailboxClosedReason reason) =>
        Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());

    private static Task<ServiceTaskResult> Conclude(ServiceTaskContext context) =>
        Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());

    /// <summary>The shape the mint step is emitted for: a stage that sends, answered by messages.</summary>
    private sealed class ArchivingTask : IPipelineServiceTask
    {
        public string Type => "archiving";

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage(Send, _threeDays, out MailboxHandle archive)
                .Stage(Plain)
                .ConcludeOnReplies(archive, OnMessage, OnClosed);
    }

    /// <summary>Drift: the pipeline composes a plain stage where this workflow expects a declaring one.</summary>
    private sealed class NoLongerDeclaringTask : IPipelineServiceTask
    {
        public string Type => "archiving";

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline.Stage(Plain).Finally(Conclude);
    }

    /// <summary>Drift: nothing composes at this index at all.</summary>
    private sealed class ShorterPipelineTask : IPipelineServiceTask
    {
        public string Type => "archiving";

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline.Stage(Send, _threeDays, out MailboxHandle archive).ConcludeOnReplies(archive, OnMessage, OnClosed);
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
            Id = $"1337/{_instanceGuid}",
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
            InstanceId = new InstanceIdentifier(1337, _instanceGuid),
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

    private static MintMailboxPayload Payload(int stageIndex = SendStageIndex) => new("archiving", stageIndex);

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
        Assert.Equal(_instanceGuid.ToString(), request.CollectionKey);
    }

    [Fact]
    public async Task Execute_RecordsTheMintedMailboxOnTheCarryUnderTheOpeningIndex()
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

        Assert.Equal(first.FindMailbox(SendStageIndex)?.Id, second.FindMailbox(SendStageIndex)?.Id);
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

        ProcessEngineCommandResult result = await CreateCommand(new ArchivingTask(), minter)
            .Execute(CreateContext(carry: carry), Payload());

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
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

        ProcessEngineCommandResult result = await CreateCommand(new ArchivingTask(), minter)
            .Execute(CreateContext(carry: carry), Payload());

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
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

        ProcessEngineCommandResult result = await CreateCommand(new ArchivingTask(), minter)
            .Execute(CreateContext(carry: carry), Payload());

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.False(failed.NonRetryable);
        Assert.Null(carry.Mailboxes);
    }

    [Fact]
    public async Task Execute_WhenNoDeclaringStageComposesAtIndex_FailsPermanentlyWithThePlainVerdict()
    {
        var minter = new RecordingMailboxMinter();

        ProcessEngineCommandResult result = await CreateCommand(new NoLongerDeclaringTask(), minter)
            .Execute(CreateContext(), Payload());

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxDeclarationNotFound", failed.ExceptionType);
        Assert.Contains($"from the stage at index {SendStageIndex}", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Contains("no mailbox-opening stage at that index", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.DoesNotContain("now opened by stage", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Empty(minter.Mints);
    }

    /// <summary>The same miss with nothing at the index at all.</summary>
    [Fact]
    public async Task Execute_WhenNothingComposesAtIndex_FailsPermanentlyWithThePlainVerdict()
    {
        var minter = new RecordingMailboxMinter();

        ProcessEngineCommandResult result = await CreateCommand(new ShorterPipelineTask(), minter)
            .Execute(CreateContext(), Payload(stageIndex: 1));

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxDeclarationNotFound", failed.ExceptionType);
        Assert.Contains("from the stage at index 1", failed.ErrorMessage, StringComparison.Ordinal);
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
        string? json = CommandPayloadSerializer.Serialize<CommandRequestPayload>(new MintMailboxPayload("t", 3));
        Assert.NotNull(json);
        Assert.Contains("mintMailbox", json, StringComparison.Ordinal);

        var restored = CommandPayloadSerializer.Deserialize<MintMailboxPayload>(json);
        Assert.NotNull(restored);
        Assert.Equal("t", restored.ServiceTaskType);
        Assert.Equal(3, restored.StageIndex);
    }
}
