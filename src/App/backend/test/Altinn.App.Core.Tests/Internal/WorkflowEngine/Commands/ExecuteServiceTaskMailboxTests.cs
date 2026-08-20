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
/// The mailbox half of <see cref="ExecuteServiceTask"/>: which execution mints the mailbox, what it
/// keys the mint on, and what every other execution sees when it reaches for
/// <see cref="ServiceTaskContext.Mailbox"/>.
/// </summary>
public class ExecuteServiceTaskMailboxTests
{
    private static readonly Guid InstanceGuid = new("2b3e9260-24d9-4c0a-8b93-ef2c9c7dcbde");

    /// <summary>
    /// Records every mint it is asked for and answers idempotently on the key, the way the engine does — so a test
    /// can distinguish "minted twice" from "replayed onto the same mailbox".
    /// </summary>
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

    /// <summary>
    /// A two-stage archiving task that opens its mailbox in the first stage. Every step records the
    /// context it was handed, so a test can ask what each of them could see.
    /// </summary>
    private sealed class ArchivingTask : IPipelineServiceTask
    {
        public string Type => "archiving";

        public Dictionary<string, ServiceTaskContext> Seen { get; } = new(StringComparer.Ordinal);

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage(
                    "SendToArchive",
                    Record<ServiceTaskStageResult>("SendToArchive", ServiceTaskStageResult.Completed())
                )
                .Stage(
                    "RecordDispatch",
                    Record<ServiceTaskStageResult>("RecordDispatch", ServiceTaskStageResult.Completed())
                )
                .Finally(Record<ServiceTaskResult>("Finally", ServiceTaskResult.Success()))
                .WithReplyFrom("SendToArchive", new MailboxOptions { Timeout = TimeSpan.FromDays(3) });

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
                    "SendToArchive",
                    context =>
                    {
                        Seen["SendToArchive"] = context;
                        return Task.FromResult(ServiceTaskStageResult.Completed());
                    }
                )
                .Finally(context =>
                {
                    Seen["Finally"] = context;
                    return Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());
                });
    }

    private static ExecuteServiceTask CreateCommand(IPipelineServiceTask serviceTask, IWorkflowEngineClient client)
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        services.AddSingleton(serviceTask);
        var sp = services.BuildServiceProvider();

        return new ExecuteServiceTask(
            sp.GetRequiredService<AppImplementationFactory>(),
            client,
            TestMailboxDeliveryEnvelope.Create()
        );
    }

    private static ProcessEngineCommandContext CreateContext(
        Guid? stepId = null,
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
                StepId = stepId ?? Guid.NewGuid(),
                Mailbox = mailbox,
            },
        };
    }

    /// <summary>
    /// The rendezvous a receive workflow's step is handed: a message standing at its position, sealed the way the
    /// forwarder seals one, because an unsealed payload never reaches a handler at all.
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
    public async Task DeclaringStage_MintsTheMailboxAndReadsIt()
    {
        var task = new ArchivingTask();
        var minter = new RecordingMailboxMinter();
        Guid stepId = Guid.NewGuid();

        ProcessEngineCommandResult result = await CreateCommand(task, minter)
            .Execute(CreateContext(stepId), Payload("SendToArchive"));

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);

        (string ns, MailboxCreateRequest request) = Assert.Single(minter.Mints);
        Assert.Equal("ttd/test-app", ns);
        Assert.Equal(stepId.ToString(), request.IdempotencyKey);
        Assert.Equal(TimeSpan.FromDays(3), request.Timeout);
        Assert.Equal(InstanceGuid.ToString(), request.CollectionKey);

        ServiceTaskMailbox mailbox = task.Seen["SendToArchive"].Mailbox;
        Assert.Equal(new DateTimeOffset(2026, 8, 22, 10, 0, 0, TimeSpan.Zero), mailbox.Deadline);
        Assert.NotEqual(Guid.Empty, mailbox.Id);
    }

    [Fact]
    public async Task RetryOfTheDeclaringStage_ReplaysOntoTheSameMailbox()
    {
        // The property the whole address depends on: the step id keys the mint, so an attempt that published the
        // address and then crashed is handed that same address on the retry.
        var task = new ArchivingTask();
        var minter = new RecordingMailboxMinter();
        Guid stepId = Guid.NewGuid();

        await CreateCommand(task, minter).Execute(CreateContext(stepId), Payload("SendToArchive"));
        Guid first = task.Seen["SendToArchive"].Mailbox.Id;

        await CreateCommand(task, minter).Execute(CreateContext(stepId), Payload("SendToArchive"));
        Guid second = task.Seen["SendToArchive"].Mailbox.Id;

        Assert.Equal(first, second);
        Assert.Equal(2, minter.Mints.Count);
        Assert.All(minter.Mints, mint => Assert.Equal(stepId.ToString(), mint.Request.IdempotencyKey));
    }

    [Theory]
    [InlineData("RecordDispatch")]
    [InlineData(null)]
    public async Task StepThatIsNotTheDeclaringStage_MintsNothingAndReadingTheMailboxThrows(string? stageName)
    {
        var task = new ArchivingTask();
        var minter = new RecordingMailboxMinter();

        // The conclusion of a declaring pipeline runs only on a receive workflow, so it is handed a rendezvous; a
        // stage never is.
        await CreateCommand(task, minter)
            .Execute(CreateContext(mailbox: stageName is null ? Delivered(Guid.NewGuid()) : null), Payload(stageName));

        Assert.Empty(minter.Mints);

        ServiceTaskContext seen = task.Seen[stageName ?? "Finally"];
        InvalidOperationException exception = Assert.Throws<InvalidOperationException>(() => seen.Mailbox);
        Assert.Contains(
            "mailbox is opened by stage 'SendToArchive' and is readable only there",
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
    [InlineData("SendToArchive")]
    [InlineData(null)]
    public async Task TaskThatDeclaresNoMailbox_MintsNothingAndReadingTheMailboxThrows(string? stageName)
    {
        var task = new PlainTask();
        var minter = new RecordingMailboxMinter();

        await CreateCommand(task, minter).Execute(CreateContext(), Payload(stageName));

        Assert.Empty(minter.Mints);

        InvalidOperationException exception = Assert.Throws<InvalidOperationException>(() =>
            task.Seen[stageName ?? "Finally"].Mailbox
        );
        Assert.Contains("this task opens no mailbox", exception.Message, StringComparison.Ordinal);
        Assert.Contains(nameof(ServiceTaskPipeline.WithReplyFrom), exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task MissingStepId_FailsPermanentlyRatherThanMintingASharedMailbox()
    {
        // An empty step id is a constant, so keying the mint on it would collapse every mailbox in the namespace
        // onto one inbox — every instance reading every other instance's messages.
        var task = new ArchivingTask();
        var minter = new RecordingMailboxMinter();

        ProcessEngineCommandResult result = await CreateCommand(task, minter)
            .Execute(CreateContext(Guid.Empty), Payload("SendToArchive"));

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxStepIdMissing", failed.ExceptionType);
        Assert.Empty(minter.Mints);
        Assert.Empty(task.Seen);
    }

    [Fact]
    public async Task RejectedMint_FailsPermanentlyWithTheEngineDetailAndNeverRunsTheStage()
    {
        // A declaration the engine can never accept — a timeout past its maximum, most often. App startup cannot
        // catch it because the maximum is the engine's, so the transition must fail once with the reason.
        var task = new ArchivingTask();
        var minter = new RecordingMailboxMinter
        {
            Answer = new MailboxMintResult.Rejected(
                "Timeout 30.00:00:00 exceeds the maximum mailbox timeout of 21.00:00:00."
            ),
        };

        ProcessEngineCommandResult result = await CreateCommand(task, minter)
            .Execute(CreateContext(), Payload("SendToArchive"));

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxRejected", failed.ExceptionType);
        Assert.Contains("SendToArchive", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Contains("exceeds the maximum mailbox timeout", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Empty(task.Seen);
    }

    [Fact]
    public async Task AtCapacityMint_FailsRetryablyWithTheEngineDetailAndNeverRunsTheStage()
    {
        // The collection is at its open-mailbox cap. Retryable, but the failure names the at-cap collection on the
        // first attempt rather than repeating a bare 429 up the ladder.
        var task = new ArchivingTask();
        var minter = new RecordingMailboxMinter
        {
            Answer = new MailboxMintResult.AtCapacity(
                "Collection 'inst-1' already holds the maximum of 100 open mailboxes."
            ),
        };

        ProcessEngineCommandResult result = await CreateCommand(task, minter)
            .Execute(CreateContext(), Payload("SendToArchive"));

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.False(failed.NonRetryable);
        Assert.Equal("MailboxAtCapacity", failed.ExceptionType);
        Assert.Contains("SendToArchive", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Contains("maximum of 100 open mailboxes", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Empty(task.Seen);
    }

    [Fact]
    public async Task UnreachableEngine_FailsRetryablyAndNeverRunsTheStage()
    {
        // The stage must not send without an address: a failed mint stops the step before the work, so the retry
        // sends once, with the address the retry's mint returns.
        var task = new ArchivingTask();
        var minter = new RecordingMailboxMinter { Throws = new HttpRequestException("engine unreachable") };

        ProcessEngineCommandResult result = await CreateCommand(task, minter)
            .Execute(CreateContext(), Payload("SendToArchive"));

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.False(failed.NonRetryable);
        Assert.Empty(task.Seen);
    }

    [Fact]
    public async Task DeclaringStage_RecordsTheMailboxOnTheStateCarry()
    {
        // The mint's key is this stage's step id, which no later step can re-derive — so the address has to leave
        // this callback in the state blob, and the carry is what puts it there.
        var task = new ArchivingTask();
        var minter = new RecordingMailboxMinter();
        var carry = new WorkflowCallbackStateCarry();

        await CreateCommand(task, minter).Execute(CreateContext(carry: carry), Payload("SendToArchive"));

        Assert.Equal(task.Seen["SendToArchive"].Mailbox.Id, carry.MailboxId);
    }

    [Theory]
    [InlineData("RecordDispatch")]
    [InlineData(null)]
    public async Task StepThatIsNotTheDeclaringStage_RecordsNothingOnTheCarry(string? stageName)
    {
        // A step that mints nothing must leave the carry exactly as it found it.
        var task = new ArchivingTask();
        var minter = new RecordingMailboxMinter();
        var carry = new WorkflowCallbackStateCarry();

        await CreateCommand(task, minter).Execute(CreateContext(carry: carry), Payload(stageName));

        Assert.Null(carry.MailboxId);
    }

    [Fact]
    public async Task ConclusionOfADeclaringPipeline_WithoutARendezvous_FailsPermanentlyAndNeverRuns()
    {
        // A declaring pipeline emits its conclusion on receive workflows only, so it can only ever run with the
        // engine's rendezvous block. Without one it would settle the task without ever reading the answer it
        // opened the exchange for, so it fails permanently and the handler is never called at all.
        var task = new ArchivingTask();
        var minter = new RecordingMailboxMinter();

        ProcessEngineCommandResult result = await CreateCommand(task, minter)
            .Execute(CreateContext(), Payload(stageName: null));

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxReceiptMissing", failed.ExceptionType);
        Assert.Empty(minter.Mints);
        Assert.Empty(task.Seen);
    }
}
