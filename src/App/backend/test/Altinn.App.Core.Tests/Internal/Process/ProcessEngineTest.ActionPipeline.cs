using System.Net;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.App.Core.Models.Process;
using Altinn.App.Core.Tests.Internal.WorkflowEngine;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process;

public sealed partial class ProcessEngineTest
{
    private static readonly Guid _mailboxId = new("018f4e00-0000-7000-8000-0000000000aa");

    private static ServiceCollection ActionPipelineTaskServices()
    {
        var services = new ServiceCollection();
        services.AddSingleton<IProcessTask>(
            new TestActionPipelineTask(pipeline =>
                pipeline.Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()))
            )
        );
        var translation = new Mock<ITranslationService>(MockBehavior.Strict);
        translation
            .Setup(t => t.TranslateTextKey(It.IsAny<string>(), It.IsAny<string?>(), null))
            .ReturnsAsync((string key, string? language, Dictionary<string, string>? _) => $"{language}: {key}");
        services.AddSingleton(translation.Object);
        return services;
    }

    private static Instance CreateActionPipelineTaskInstance(ProcessStatus status = ProcessStatus.Idle)
    {
        Instance instance = CreateTask2Instance();
        instance.Process.CurrentTask.AltinnTaskType = TestActionPipelineTask.TaskType;
        instance.Process.Status = status;
        return instance;
    }

    private static Moq.Language.Flow.ISetup<
        IWorkflowEngineService,
        Task<ProcessNextWorkflowResult>
    > SetupActionPipeline(Fixture fixture) =>
        fixture
            .Mock<IWorkflowEngineService>()
            .Setup(service =>
                service.EnqueueAndWaitForActionPipeline(
                    It.IsAny<Instance>(),
                    It.IsAny<StorageVersionMetadata>(),
                    It.IsAny<string>(),
                    It.IsAny<PipelineId>(),
                    It.IsAny<Actor>(),
                    It.IsAny<CancellationToken>()
                )
            );

    private static void VerifyNoActionPipeline(Fixture fixture) =>
        fixture
            .Mock<IWorkflowEngineService>()
            .Verify(
                service =>
                    service.EnqueueAndWaitForActionPipeline(
                        It.IsAny<Instance>(),
                        It.IsAny<StorageVersionMetadata>(),
                        It.IsAny<string>(),
                        It.IsAny<PipelineId>(),
                        It.IsAny<Actor>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );

    private static Instance InstanceAfter(string after) =>
        after switch
        {
            "processingOnTheTask" => CreateActionPipelineTaskInstance(ProcessStatus.Processing),
            "movedOn" => CreateEndedInstance(),
            _ => CreateActionPipelineTaskInstance(),
        };

    private static string Describe(ActionPipelineOutcome outcome) =>
        outcome switch
        {
            ActionPipelineOutcome.Refused refused => refused.Result.ProcessNextState.ToString()!,
            _ => outcome.GetType().Name,
        };

    public static TheoryData<string, bool, string> ActionPipelineStarts =>
        new()
        {
            // Where the chain left the instance, whether the acquire started the pipeline, and how the start ends.
            { "processingOnTheTask", true, nameof(ActionPipelineOutcome.Open) },
            { "movedOn", true, nameof(ActionPipelineOutcome.Moved) },
            { "idleOnTheTask", true, nameof(ActionPipelineOutcome.Released) },
            { "idleOnTheTask", false, nameof(ProcessNextState.InstanceChanged) },
            { "processingOnTheTask", false, nameof(ProcessNextState.InstanceChanged) },
            { "movedOn", false, nameof(ProcessNextState.InstanceChanged) },
        };

    [Theory]
    [MemberData(nameof(ActionPipelineStarts))]
    public async Task StartActionPipeline_TellsWhereTheChainLeftTheInstance(
        string after,
        bool acquireStartedThePipeline,
        string expected
    )
    {
        await using var fixture = Fixture.Create(ActionPipelineTaskServices());
        SetupActionPipeline(fixture)
            .ReturnsAsync(
                new ProcessNextWorkflowResult(
                    InstanceAfter(after),
                    _storageVersions,
                    WorkflowFailure: null,
                    ProcessStateCommitted: false,
                    AnchorHasDependent: acquireStartedThePipeline
                )
            );

        ActionPipelineOutcome result = await fixture.ProcessEngine.StartActionPipeline(
            CreateActionPipelineTaskInstance(),
            _storageVersions,
            TestActionPipelineTask.Action,
            "en"
        );

        Assert.Equal(expected, Describe(result));
    }

    [Fact]
    public async Task StartActionPipeline_AcquiresFromTheVersionsTheRequestRead_ForTheTasksPipeline()
    {
        await using var fixture = Fixture.Create(ActionPipelineTaskServices());
        StorageVersionMetadata? acquiredFrom = null;
        PipelineId? pipeline = null;
        Actor? actor = null;
        SetupActionPipeline(fixture)
            .Callback<Instance, StorageVersionMetadata, string, PipelineId, Actor, CancellationToken>(
                (_, versions, _, id, caller, _) =>
                {
                    acquiredFrom = versions;
                    pipeline = id;
                    actor = caller;
                }
            )
            .ReturnsAsync(
                new ProcessNextWorkflowResult(
                    CreateActionPipelineTaskInstance(ProcessStatus.Processing),
                    _storageVersions,
                    WorkflowFailure: null,
                    ProcessStateCommitted: false,
                    AnchorHasDependent: true
                )
            );

        await fixture.ProcessEngine.StartActionPipeline(
            CreateActionPipelineTaskInstance(),
            _storageVersions,
            TestActionPipelineTask.Action,
            "en"
        );

        Assert.Equal(_storageVersions, acquiredFrom);
        Assert.Equal(TestActionPipelineTask.Pipeline, pipeline);
        Assert.Equal(1337, actor?.UserId);
        Assert.Equal("en", actor?.Language);
    }

    [Fact]
    public async Task StartActionPipeline_AnotherTransitionFromTheSameVersion_IsAConcurrentTransition()
    {
        await using var fixture = Fixture.Create(ActionPipelineTaskServices());
        SetupActionPipeline(fixture)
            .ThrowsAsync(WorkflowSubmissionFailedException.NotAccepted("rejected", HttpStatusCode.Conflict));

        ActionPipelineOutcome result = await fixture.ProcessEngine.StartActionPipeline(
            CreateActionPipelineTaskInstance(),
            _storageVersions,
            TestActionPipelineTask.Action,
            "en"
        );

        var refused = Assert.IsType<ActionPipelineOutcome.Refused>(result);
        Assert.Equal(ProcessNextState.ConcurrentTransition, refused.Result.ProcessNextState);
        Assert.Equal(ProcessErrorType.Conflict, refused.Result.ErrorType);
    }

    [Theory]
    // A failed acquire enqueues nothing after it, so the chain has no dependent of the anchor.
    [InlineData(false)]
    [InlineData(true)]
    public async Task StartActionPipeline_AFailedChain_IsRefusedWithTheFailure(bool acquireStartedThePipeline)
    {
        await using var fixture = Fixture.Create(ActionPipelineTaskServices());
        var failure = new WorkflowFailure { Kind = WorkflowFailureKind.StepFailed, WorkflowId = Guid.NewGuid() };
        SetupActionPipeline(fixture)
            .ReturnsAsync(
                new ProcessNextWorkflowResult(
                    CreateActionPipelineTaskInstance(ProcessStatus.Processing),
                    _storageVersions,
                    failure,
                    ProcessStateCommitted: false,
                    AnchorHasDependent: acquireStartedThePipeline
                )
            );

        ActionPipelineOutcome result = await fixture.ProcessEngine.StartActionPipeline(
            CreateActionPipelineTaskInstance(),
            _storageVersions,
            TestActionPipelineTask.Action,
            "en"
        );

        var refused = Assert.IsType<ActionPipelineOutcome.Refused>(result);
        Assert.Equal(ProcessErrorType.Internal, refused.Result.ErrorType);
        Assert.Same(failure, refused.Result.WorkflowFailure);
    }

    [Fact]
    public async Task StartActionPipeline_ADependencyFailedChain_IsRefusedAsResumeRequired()
    {
        await using var fixture = Fixture.Create(ActionPipelineTaskServices());
        SetupActionPipeline(fixture)
            .ReturnsAsync(
                new ProcessNextWorkflowResult(
                    CreateActionPipelineTaskInstance(ProcessStatus.Processing),
                    _storageVersions,
                    new WorkflowFailure { Kind = WorkflowFailureKind.DependencyFailed, WorkflowId = Guid.NewGuid() },
                    ProcessStateCommitted: false,
                    AnchorHasDependent: true
                )
            );

        ActionPipelineOutcome result = await fixture.ProcessEngine.StartActionPipeline(
            CreateActionPipelineTaskInstance(),
            _storageVersions,
            TestActionPipelineTask.Action,
            "en"
        );

        Assert.Equal(nameof(ProcessNextState.ResumeRequired), Describe(result));
    }

    [Fact]
    public async Task StartActionPipeline_WhileTheInstanceIsHeld_IsRefusedWithoutStarting()
    {
        await using var fixture = Fixture.Create(ActionPipelineTaskServices());

        ActionPipelineOutcome result = await fixture.ProcessEngine.StartActionPipeline(
            CreateActionPipelineTaskInstance(ProcessStatus.Processing),
            _storageVersions,
            TestActionPipelineTask.Action,
            "en"
        );

        var refused = Assert.IsType<ActionPipelineOutcome.Refused>(result);
        Assert.Equal(ProcessStatus.Processing, refused.Result.BlockingProcessStatus);
        VerifyNoActionPipeline(fixture);
    }

    [Fact]
    public async Task StartActionPipeline_ForAnActionTheTaskDoesNotStart_Throws()
    {
        await using var fixture = Fixture.Create(ActionPipelineTaskServices());

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            fixture.ProcessEngine.StartActionPipeline(
                CreateActionPipelineTaskInstance(),
                _storageVersions,
                "confirm",
                "en"
            )
        );
        VerifyNoActionPipeline(fixture);
    }

    private static void SetupActiveWorkflow(Fixture fixture, Guid? workflowId) =>
        fixture
            .Mock<IWorkflowEngineService>()
            .Setup(service => service.FindActiveWorkflow(It.IsAny<Instance>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(workflowId);

    private static List<MailboxDeliveryRequest> SetupDelivery(Fixture fixture, HttpStatusCode status, long idx)
    {
        List<MailboxDeliveryRequest> deliveries = [];
        fixture
            .Mock<IWorkflowEngineClient>()
            .Setup(client =>
                client.DeliverToMailbox(
                    "org/app",
                    _mailboxId,
                    It.IsAny<MailboxDeliveryRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<string, Guid, MailboxDeliveryRequest, CancellationToken>(
                (_, _, request, _) => deliveries.Add(request)
            )
            .ReturnsAsync(
                new MailboxDeliveryResult(
                    status,
                    new MailboxDeliveryResponse
                    {
                        MailboxId = _mailboxId,
                        Idx = idx,
                        IdempotencyKey = "check:paid",
                        AcceptedAt = DateTimeOffset.UtcNow,
                    },
                    ErrorDetail: null
                )
            );
        return deliveries;
    }

    private static Moq.Language.Flow.ISetup<IWorkflowEngineService, Task<ProcessNextWorkflowResult>> SetupMessageWait(
        Fixture fixture
    ) =>
        fixture
            .Mock<IWorkflowEngineService>()
            .Setup(service =>
                service.WaitForActionPipelineMessage(
                    It.IsAny<Instance>(),
                    It.IsAny<Guid>(),
                    It.IsAny<Guid>(),
                    It.IsAny<long>(),
                    It.IsAny<CancellationToken>()
                )
            );

    private static Task<ActionPipelineOutcome> Send(Fixture fixture, ProcessStatus status = ProcessStatus.Processing) =>
        fixture.ProcessEngine.SendToActionPipeline(
            CreateActionPipelineTaskInstance(status),
            _mailboxId,
            """{"kind":"check"}""",
            "check:paid",
            "en"
        );

    [Theory]
    [InlineData(HttpStatusCode.Accepted)]
    [InlineData(HttpStatusCode.OK)]
    public async Task SendToActionPipeline_WaitsFromTheActiveWorkflowAtThePositionTheMailboxGave(
        HttpStatusCode delivered
    )
    {
        await using var fixture = Fixture.Create(ActionPipelineTaskServices());
        Guid receiverId = Guid.NewGuid();
        SetupActiveWorkflow(fixture, receiverId);
        SetupDelivery(fixture, delivered, idx: 3);
        SetupMessageWait(fixture)
            .ReturnsAsync(
                new ProcessNextWorkflowResult(
                    CreateActionPipelineTaskInstance(ProcessStatus.Processing),
                    _storageVersions,
                    WorkflowFailure: null,
                    ProcessStateCommitted: false,
                    Parked: true
                )
            );

        await Send(fixture);

        fixture
            .Mock<IWorkflowEngineService>()
            .Verify(service =>
                service.WaitForActionPipelineMessage(
                    It.IsAny<Instance>(),
                    receiverId,
                    _mailboxId,
                    3,
                    It.IsAny<CancellationToken>()
                )
            );
    }

    [Fact]
    public async Task SendToActionPipeline_SealsTheCallerAsTheSender()
    {
        await using var fixture = Fixture.Create(ActionPipelineTaskServices());
        SetupActiveWorkflow(fixture, Guid.NewGuid());
        List<MailboxDeliveryRequest> deliveries = SetupDelivery(fixture, HttpStatusCode.Accepted, idx: 0);
        SetupMessageWait(fixture)
            .ReturnsAsync(
                new ProcessNextWorkflowResult(
                    CreateActionPipelineTaskInstance(ProcessStatus.Processing),
                    _storageVersions,
                    WorkflowFailure: null,
                    ProcessStateCommitted: false,
                    Parked: true
                )
            );

        await Send(fixture);

        MailboxDelivery delivery = fixture
            .ServiceProvider.GetRequiredService<MailboxDeliveryEnvelope>()
            .Unwrap(Assert.Single(deliveries).Payload, _mailboxId, TestActionPipelineTask.Pipeline, "check:paid");
        Assert.Equal("""{"kind":"check"}""", delivery.Body);
        Assert.Equal(1337, delivery.Sender?.UserId);
        Assert.Equal("en", delivery.Sender?.Language);
    }

    [Theory]
    [InlineData("processingOnTheTask", nameof(ActionPipelineOutcome.Open))]
    [InlineData("movedOn", nameof(ActionPipelineOutcome.Moved))]
    [InlineData("idleOnTheTask", nameof(ActionPipelineOutcome.Released))]
    public async Task SendToActionPipeline_TellsWhereTheMessageLeftTheInstance(string after, string expected)
    {
        await using var fixture = Fixture.Create(ActionPipelineTaskServices());
        SetupActiveWorkflow(fixture, Guid.NewGuid());
        SetupDelivery(fixture, HttpStatusCode.Accepted, idx: 0);
        SetupMessageWait(fixture)
            .ReturnsAsync(
                new ProcessNextWorkflowResult(
                    InstanceAfter(after),
                    _storageVersions,
                    WorkflowFailure: null,
                    ProcessStateCommitted: false
                )
            );

        ActionPipelineOutcome result = await Send(fixture);

        Assert.Equal(expected, Describe(result));
    }

    [Theory]
    [InlineData(ProcessStatus.Idle, WorkflowActivityStatus.Idle, nameof(ActionPipelineOutcome.NotOpen))]
    [InlineData(ProcessStatus.Processing, WorkflowActivityStatus.Failed, nameof(ProcessNextState.ResumeRequired))]
    public async Task SendToActionPipeline_WithoutAnActiveWorkflow_SendsNothingAndTellsAFailedPipelineFromNone(
        ProcessStatus status,
        WorkflowActivityStatus workflowStatus,
        string expected
    )
    {
        await using var fixture = Fixture.Create(ActionPipelineTaskServices());
        SetupActiveWorkflow(fixture, null);
        fixture
            .Mock<IWorkflowEngineService>()
            .Setup(service => service.ResolveWorkflowTaskStatus(It.IsAny<Instance>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowTaskStatus(workflowStatus, "Task_2", null));
        // The request read the instance idle; only the read after finding no active workflow has the current status.
        fixture
            .Mock<IInstanceClientWithStorageMetadata>()
            .Setup(client =>
                client.GetInstanceWithStorageMetadata(
                    It.IsAny<Instance>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new InstanceWithStorageMetadata(CreateActionPipelineTaskInstance(status), _storageVersions));

        ActionPipelineOutcome result = await Send(fixture, ProcessStatus.Idle);

        Assert.Equal(expected, Describe(result));
        fixture
            .Mock<IWorkflowEngineClient>()
            .Verify(
                client =>
                    client.DeliverToMailbox(
                        It.IsAny<string>(),
                        It.IsAny<Guid>(),
                        It.IsAny<MailboxDeliveryRequest>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
    }

    [Theory]
    [InlineData(null)]
    [InlineData("confirm")]
    [InlineData(TestActionPipelineTask.Action)]
    public async Task Next_OnAnIdleActionPipelineTask_IsRefusedWithTheTasksIssue(string? action)
    {
        await using var fixture = Fixture.Create(ActionPipelineTaskServices());

        ProcessChangeResult result = await fixture.ProcessEngine.Next(
            new ProcessNextRequest
            {
                Instance = CreateActionPipelineTaskInstance(),
                InstanceVersions = _storageVersions,
                User = CreateUserClaimsPrincipal(),
                Action = action,
                Language = null,
            }
        );

        Assert.False(result.Success);
        Assert.Equal(ProcessErrorType.Conflict, result.ErrorType);
        Assert.Equal(TestActionPipelineTask.RefusalCode, Assert.Single(result.ValidationIssues!).Code);
        VerifyNoTransition(fixture);
    }

    [Fact]
    public async Task Next_OnAnIdleActionPipelineTask_TranslatesTheIssueInTheRequestsLanguage()
    {
        await using var fixture = Fixture.Create(ActionPipelineTaskServices());

        ProcessChangeResult result = await fixture.ProcessEngine.Next(
            new ProcessNextRequest
            {
                Instance = CreateActionPipelineTaskInstance(),
                InstanceVersions = _storageVersions,
                User = CreateUserClaimsPrincipal(),
                Action = "confirm",
                Language = "nn",
            }
        );

        Assert.Equal(
            $"nn: {TestActionPipelineTask.RefusalTextKey}",
            Assert.Single(result.ValidationIssues!).Description
        );
    }

    [Fact]
    public async Task Next_RejectOnAnIdleActionPipelineTask_MovesTheProcess()
    {
        await using var fixture = Fixture.Create(ActionPipelineTaskServices());
        SetupWorkflowResult(fixture, CreateEndedInstance());

        ProcessChangeResult result = await fixture.ProcessEngine.Next(
            new ProcessNextRequest
            {
                Instance = CreateActionPipelineTaskInstance(),
                InstanceVersions = _storageVersions,
                User = CreateUserClaimsPrincipal(),
                Action = "reject",
                Language = null,
            }
        );

        Assert.True(result.Success);
    }

    [Fact]
    public async Task Next_OnAHeldActionPipelineTask_AnswersRetryingBeforeTheRefusal()
    {
        await using var fixture = Fixture.Create(ActionPipelineTaskServices());
        fixture
            .Mock<IWorkflowEngineService>()
            .Setup(service => service.ResolveWorkflowTaskStatus(It.IsAny<Instance>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowTaskStatus(WorkflowActivityStatus.Processing, "Task_2", null));

        ProcessChangeResult result = await fixture.ProcessEngine.Next(
            new ProcessNextRequest
            {
                Instance = CreateActionPipelineTaskInstance(ProcessStatus.Processing),
                InstanceVersions = _storageVersions,
                User = CreateUserClaimsPrincipal(),
                Action = "confirm",
                Language = null,
            }
        );

        Assert.Equal(ProcessNextState.Retrying, result.ProcessNextState);
        Assert.Null(result.ValidationIssues);
    }
}
