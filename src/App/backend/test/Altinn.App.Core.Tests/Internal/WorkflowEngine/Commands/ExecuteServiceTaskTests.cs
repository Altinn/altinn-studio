using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands;

/// <summary>
/// The simple dispatch of <see cref="ExecuteServiceTask"/>: an <see cref="IServiceTask"/> whose
/// pipeline is the forwarding default <c>Finally(Execute)</c> — every test here exercises that
/// default end to end (a real class, not a mock: mocks bypass interface defaults, see
/// <see cref="ExecuteServiceTaskStageTests"/> for that guard). The multi-stage dispatch is
/// covered by <see cref="ExecuteServiceTaskStageTests"/>.
/// </summary>
public class ExecuteServiceTaskTests
{
    /// <summary>An <see cref="IServiceTask"/> scripted per test, recording what it observed.</summary>
    private sealed class FakeServiceTask(Func<ServiceTaskContext, Task<ServiceTaskResult>> onExecute) : IServiceTask
    {
        public int ExecuteCount { get; private set; }

        public ServiceTaskContext? Observed { get; private set; }

        public string Type => "myServiceTask";

        public Task<ServiceTaskResult> Execute(ServiceTaskContext context)
        {
            ExecuteCount++;
            Observed = context;
            return onExecute(context);
        }
    }

    private static FakeServiceTask Succeeding() =>
        new(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()));

    private static readonly DateTimeOffset FixtureExecutionReferenceTime = new(2025, 3, 14, 9, 26, 53, TimeSpan.Zero);

    private static ProcessEngineCommandContext CreateContext(
        Instance instance,
        string serviceTaskType,
        IInstanceDataMutator? mutator = null,
        int deferCount = 0,
        DateTimeOffset? waitDeadline = null,
        int retryCount = 0,
        DateTimeOffset? executionDeadline = null,
        Guid stepId = default,
        DateTimeOffset? firstDeferredAt = null
    )
    {
        if (mutator is null)
        {
            var mutatorMock = new Mock<IInstanceDataMutator>();
            mutatorMock.Setup(x => x.Instance).Returns(instance);
            mutator = mutatorMock.Object;
        }

        // A simple IServiceTask's pipeline is its conclusion and nothing else, so the concluding step names
        // item 0.
        var payload = new ExecuteServiceTaskPayload(serviceTaskType, ItemIndex: 0);
        string serializedPayload = CommandPayloadSerializer.Serialize(payload)!;

        return new ProcessEngineCommandContext
        {
            StateCarry = new(),
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, Guid.NewGuid()),
            InstanceDataMutator = mutator,
            CancellationToken = CancellationToken.None,
            Payload = new AppCallbackPayload
            {
                CommandKey = ExecuteServiceTask.Key,
                Actor = new Actor { UserId = 1337 },
                Payload = serializedPayload,
                State = "{}",
                WorkflowId = Guid.Empty,
                StepId = stepId,
                ExecutionReferenceTime = FixtureExecutionReferenceTime,
                DeferCount = deferCount,
                WaitDeadline = waitDeadline,
                FirstDeferredAt = firstDeferredAt,
                RetryCount = retryCount,
                ExecutionDeadline = executionDeadline,
            },
        };
    }

    private static ProcessEngineCommandContext WithExecutionReferenceTime(
        ProcessEngineCommandContext context,
        DateTimeOffset executionReferenceTime
    ) =>
        new()
        {
            StateCarry = context.StateCarry,
            AppId = context.AppId,
            InstanceId = context.InstanceId,
            InstanceDataMutator = context.InstanceDataMutator,
            CancellationToken = context.CancellationToken,
            Payload = context.Payload with { ExecutionReferenceTime = executionReferenceTime },
        };

    private static Instance CreateInstance(string taskId = "Task_1")
    {
        return new Instance
        {
            Id = "1337/2b3e9260-24d9-4c0a-8b93-ef2c9c7dcbde",
            Org = "ttd",
            AppId = "ttd/test-app",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Process = new ProcessState
            {
                Status = ProcessStatus.Processing,
                CurrentTask = new ProcessElementInfo { ElementId = taskId },
            },
            Data = [],
        };
    }

    private static ExecuteServiceTask CreateCommand(params IServiceTask[] serviceTasks)
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        foreach (IServiceTask st in serviceTasks)
        {
            services.AddSingleton(st);
        }
        var sp = services.BuildServiceProvider();

        return new ExecuteServiceTask(
            sp.GetRequiredService<AppImplementationFactory>(),
            // Never consulted: these pipelines declare no mailbox, so the delivery envelope is never
            // reached.
            TestMailboxDeliveryEnvelope.Create()
        );
    }

    [Fact]
    public async Task Execute_ResolvesServiceTaskAndCallsExecute_ReturnsSuccessWithAutoAdvance()
    {
        // Arrange
        var serviceTask = new FakeServiceTask(_ =>
            Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success("reject"))
        );
        var command = CreateCommand(serviceTask);
        var context = CreateContext(CreateInstance(), "myServiceTask");

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        var success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.True(success.AutoAdvanceProcess);
        Assert.Equal("reject", success.AutoAdvanceAction);
        Assert.Equal(1, serviceTask.ExecuteCount);
    }

    [Fact]
    public async Task Execute_ForwardsWorkflowIdToServiceTaskContext()
    {
        // Arrange
        var serviceTask = Succeeding();
        var command = CreateCommand(serviceTask);
        var context = CreateContext(CreateInstance(), "myServiceTask");

        // Act
        await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        Assert.NotNull(serviceTask.Observed);
        Assert.Equal(context.Payload.WorkflowId, serviceTask.Observed.WorkflowId);
    }

    [Fact]
    public async Task Execute_PassesWorkflowStepMetadataToServiceTaskContext()
    {
        Guid stepId = Guid.Parse("11111111-2222-3333-4444-555555555555");
        var executionReferenceTime = new DateTimeOffset(2026, 7, 21, 10, 30, 0, TimeSpan.FromHours(2));
        var serviceTask = new FakeServiceTask(_ =>
            Task.FromResult<ServiceTaskResult>(ServiceTaskResult.SuccessWithoutAutoAdvance())
        );
        var command = CreateCommand(serviceTask);
        Instance instance = CreateInstance();
        InstanceDataUnitOfWork unitOfWork = CreateUnitOfWork(instance);
        var context = WithExecutionReferenceTime(
            CreateContext(instance, "myServiceTask", unitOfWork, stepId: stepId),
            executionReferenceTime
        );

        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.NotNull(serviceTask.Observed);
        Assert.Equal(stepId, serviceTask.Observed.StepId);
        Assert.Equal(executionReferenceTime, serviceTask.Observed.ExecutionReferenceTime);
        Assert.Equal(ProcessStatus.Idle, unitOfWork.Instance.Process?.Status);
    }

    [Fact]
    public async Task Execute_WhenSuccessWithoutAutoAdvance_ReturnsFalseAutoAdvance()
    {
        // Arrange
        var serviceTask = new FakeServiceTask(_ =>
            Task.FromResult<ServiceTaskResult>(ServiceTaskResult.SuccessWithoutAutoAdvance())
        );
        var command = CreateCommand(serviceTask);
        Instance instance = CreateInstance();
        InstanceDataUnitOfWork unitOfWork = CreateUnitOfWork(instance);
        var context = CreateContext(instance, "myServiceTask", unitOfWork);

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        var success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.False(success.AutoAdvanceProcess);
        Assert.Equal(ProcessStatus.Idle, unitOfWork.Instance.Process?.Status);
    }

    /// <summary>
    /// The result roots declare no constructor an app can call, but they are records, and C# will not let a
    /// record narrow its synthesized copy constructor below <c>protected</c> — so an app can still chain that
    /// and hand the runtime a type it cannot map. The old catch-all concluded such a task as a silent
    /// success; a throw would ride the outer catch's retry ladder forever. It must converge: permanent, and
    /// naming the type.
    /// </summary>
    /// <remarks>
    /// Self-cleaning, like its three siblings (<c>ExecuteServiceTaskStageTests.RogueStageResult</c>,
    /// <c>MailboxRelayTests.RogueVerdict</c>, <c>MailboxRelayTests.RogueStageVerdict</c>): should the roots
    /// ever move off records and close this route,
    /// <c>base(original)</c> stops compiling and this test goes with the arm it pins.
    /// </remarks>
    private sealed record RogueResult : ServiceTaskResult
    {
        public RogueResult(ServiceTaskResult original)
            : base(original) { }
    }

    [Fact]
    public async Task Execute_WhenServiceTaskReturnsAnUnrecognisedResultType_FailsPermanentlyAndNamesIt()
    {
        var serviceTask = new FakeServiceTask(_ =>
            Task.FromResult<ServiceTaskResult>(new RogueResult(ServiceTaskResult.Success()))
        );
        var command = CreateCommand(serviceTask);
        var context = CreateContext(CreateInstance(), "myServiceTask");

        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("ServiceTaskResultUnknown", failed.ExceptionType);
        Assert.Contains(nameof(RogueResult), failed.ErrorMessage, StringComparison.Ordinal);
    }

    [Fact]
    public Task Execute_WhenServiceTaskConcludesWithoutAutoAdvance_ClearsProcessingAndStagesTheIdleStatus() =>
        AssertNonAutoResultPauses(ServiceTaskResult.SuccessWithoutAutoAdvance());

    [Fact]
    public async Task Execute_WhenServiceTaskReturnsFailedResult_ReturnsFailedResult()
    {
        // Arrange
        var serviceTask = new FakeServiceTask(_ =>
            Task.FromResult<ServiceTaskResult>(ServiceTaskResult.FailedPermanent("Something went wrong"))
        );
        var command = CreateCommand(serviceTask);
        var context = CreateContext(CreateInstance(), "myServiceTask");

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.Contains("Service task 'myServiceTask' failed: Something went wrong", failed.ErrorMessage);
        Assert.Equal("ServiceTaskFailedException", failed.ExceptionType);
        Assert.True(failed.NonRetryable);
    }

    [Fact]
    public async Task Execute_WhenServiceTaskDefers_ReturnsDeferredResultCarryingDelayAndReason()
    {
        // Arrange
        var serviceTask = new FakeServiceTask(_ =>
            Task.FromResult<ServiceTaskResult>(
                ServiceTaskResult.Defer(TimeSpan.FromMinutes(5), "delivery not confirmed")
            )
        );
        var command = CreateCommand(serviceTask);
        var context = CreateContext(CreateInstance(), "myServiceTask");

        // Act
        var result = await command.Execute(context, new ExecuteServiceTaskPayload("myServiceTask", ItemIndex: 0));

        // Assert — a deferral is neither a success nor a failure: mapping it onto either would make the
        // engine advance the process or record an error, and it must do neither.
        var deferred = Assert.IsType<DeferredProcessEngineCommandResult>(result);
        Assert.Equal(TimeSpan.FromMinutes(5), deferred.Delay);
        Assert.Equal("delivery not confirmed", deferred.Reason);
    }

    [Fact]
    public async Task Execute_ForwardsRetryCountAndExecutionDeadlineToServiceTaskContext()
    {
        // Arrange — the per-attempt pair, mirroring the per-wait pair below. A task that cannot see the
        // execution deadline has no way to tell whether it has room to start a slow call, and would be
        // recorded as a failure for work it could have deferred instead.
        var executionDeadline = new DateTimeOffset(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);
        var serviceTask = Succeeding();
        var command = CreateCommand(serviceTask);
        var context = CreateContext(
            CreateInstance(),
            "myServiceTask",
            retryCount: 2,
            executionDeadline: executionDeadline
        );

        // Act
        await command.Execute(context, new ExecuteServiceTaskPayload("myServiceTask", ItemIndex: 0));

        // Assert
        Assert.NotNull(serviceTask.Observed);
        Assert.Equal(2, serviceTask.Observed.Attempt.RetryCount);
        Assert.Equal(executionDeadline, serviceTask.Observed.Attempt.Deadline);
    }

    [Fact]
    public async Task Execute_ForwardsDeferCountAndWaitDeadlineToServiceTaskContext()
    {
        // Arrange — a polling task needs to know which check it is on and how much budget is left,
        // otherwise it cannot pace itself or give up on its own terms.
        var waitDeadline = new DateTimeOffset(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);
        var serviceTask = Succeeding();
        var command = CreateCommand(serviceTask);
        var context = CreateContext(CreateInstance(), "myServiceTask", deferCount: 4, waitDeadline: waitDeadline);

        // Act
        await command.Execute(context, new ExecuteServiceTaskPayload("myServiceTask", ItemIndex: 0));

        // Assert
        Assert.NotNull(serviceTask.Observed);
        Assert.Equal(4, serviceTask.Observed.Wait.DeferCount);
        Assert.Equal(waitDeadline, serviceTask.Observed.Wait.Deadline);
    }

    [Fact]
    public async Task Execute_ForwardsStepIdAndWaitStartedAtToServiceTaskContext()
    {
        // Arrange — StepId is the outbound idempotency key for send-then-poll tasks; WaitStartedAt
        // lets them pace progressively without bookkeeping of their own.
        var stepId = Guid.NewGuid();
        var firstDeferredAt = new DateTimeOffset(2026, 1, 1, 11, 0, 0, TimeSpan.Zero);
        var serviceTask = Succeeding();
        var command = CreateCommand(serviceTask);
        var context = CreateContext(
            CreateInstance(),
            "myServiceTask",
            stepId: stepId,
            firstDeferredAt: firstDeferredAt
        );

        // Act
        await command.Execute(context, new ExecuteServiceTaskPayload("myServiceTask", ItemIndex: 0));

        // Assert
        Assert.NotNull(serviceTask.Observed);
        Assert.Equal(stepId, serviceTask.Observed.StepId);
        Assert.Equal(firstDeferredAt, serviceTask.Observed.Wait.StartedAt);
    }

    [Fact]
    public async Task Execute_FirstRun_ReportsNoDeferralsAndNoDeadline()
    {
        var serviceTask = Succeeding();
        var command = CreateCommand(serviceTask);
        var context = CreateContext(CreateInstance(), "myServiceTask");

        await command.Execute(context, new ExecuteServiceTaskPayload("myServiceTask", ItemIndex: 0));

        Assert.NotNull(serviceTask.Observed);
        Assert.Equal(0, serviceTask.Observed.Wait.DeferCount);
        Assert.Null(serviceTask.Observed.Wait.Deadline);
        Assert.Equal(0, serviceTask.Observed.Attempt.RetryCount);
    }

    [Fact]
    public async Task Execute_WhenServiceTaskReturnsRetryableFailure_ReturnsRetryableFailure()
    {
        var serviceTask = new FakeServiceTask(_ =>
            Task.FromResult<ServiceTaskResult>(ServiceTaskResult.FailedRetryable("Try again"))
        );
        var command = CreateCommand(serviceTask);
        var context = CreateContext(CreateInstance(), "myServiceTask");

        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.Equal("Service task 'myServiceTask' failed: Try again", failed.ErrorMessage);
        Assert.Equal("ServiceTaskFailedException", failed.ExceptionType);
        Assert.False(failed.NonRetryable);
    }

    [Fact]
    public async Task Execute_WhenNoMatchingServiceTask_ReturnsFailedResult()
    {
        // Arrange
        var command = CreateCommand();
        var context = CreateContext(CreateInstance(), "nonExistentType");

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.Contains("No service task found for type nonExistentType", failed.ErrorMessage);
        Assert.Equal("ProcessException", failed.ExceptionType);
    }

    [Fact]
    public async Task Execute_WhenServiceTaskThrows_ReturnsFailedResult()
    {
        // Arrange
        var serviceTask = new FakeServiceTask(_ => throw new InvalidOperationException("Service task exploded"));
        var command = CreateCommand(serviceTask);
        var context = CreateContext(CreateInstance(), "myServiceTask");

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.Equal("Service task exploded", failed.ErrorMessage);
        Assert.Equal("InvalidOperationException", failed.ExceptionType);
    }

    [Fact]
    public async Task Execute_MutatorApiUseInsideServiceTaskStillWorks()
    {
        // Arrange
        var context = CreateContext(CreateInstance(), "myServiceTask");
        var dataElementIdentifier = new DataElementIdentifier(Guid.NewGuid());
        Mock.Get(context.InstanceDataMutator).Setup(x => x.RemoveDataElement(dataElementIdentifier));

        var serviceTask = new DelegateServiceTask(
            "myServiceTask",
            context =>
            {
                context.InstanceDataMutator.RemoveDataElement(dataElementIdentifier);
                return Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success("next"));
            }
        );
        var command = CreateCommand(serviceTask);

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        var success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.True(success.AutoAdvanceProcess);
    }

    private static async Task AssertNonAutoResultPauses(ServiceTaskResult serviceTaskResult)
    {
        var serviceTask = new FakeServiceTask(_ => Task.FromResult(serviceTaskResult));
        Instance instance = CreateInstance("ServiceTask_1");
        StorageInstanceMutationRequest? capturedMutation = null;
        var mutationClient = new Mock<IInstanceMutationClient>(MockBehavior.Strict);
        mutationClient
            .Setup(x =>
                x.CommitInstanceMutationWithStorageMetadata(
                    1337,
                    It.IsAny<Guid>(),
                    It.IsAny<StorageInstanceMutationRequest>(),
                    It.IsAny<IReadOnlyDictionary<string, StorageInstanceMutationContent>>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<StorageWritePreconditions?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (
                    int _,
                    Guid _,
                    StorageInstanceMutationRequest mutation,
                    IReadOnlyDictionary<string, StorageInstanceMutationContent> _,
                    StorageAuthenticationMethod? _,
                    StorageWritePreconditions? _,
                    CancellationToken _
                ) =>
                {
                    capturedMutation = mutation;
                    return new InstanceMutationWithStorageMetadata(
                        new Instance
                        {
                            Id = instance.Id,
                            AppId = instance.AppId,
                            Org = instance.Org,
                            InstanceOwner = instance.InstanceOwner,
                            Process = new ProcessState
                            {
                                Status = ProcessStatus.Idle,
                                CurrentTask = instance.Process?.CurrentTask,
                            },
                            Data = [],
                        },
                        new StorageVersionMetadata(InstanceVersion: 13, ProcessStateVersion: 9)
                    );
                }
            );
        InstanceDataUnitOfWork unitOfWork = CreateUnitOfWork(instance, mutationClient.Object);
        var command = CreateCommand(serviceTask);

        ProcessEngineCommandResult result = await ((IWorkflowEngineCommand)command).Execute(
            CreateContext(instance, "myServiceTask", unitOfWork)
        );

        var success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.False(success.AutoAdvanceProcess);
        Assert.Null(success.AutoAdvanceAction);
        Assert.Equal(ProcessStatus.Idle, unitOfWork.Instance.Process?.Status);
        WorkflowAggregateSaveOutcome outcome = await unitOfWork.SaveWorkflowOwnedAggregate(
            unitOfWork.GetDataElementChanges(false),
            Guid.NewGuid().ToString(),
            CancellationToken.None
        );
        Assert.Equal(WorkflowAggregateSaveOutcome.Saved, outcome);
        Assert.NotNull(capturedMutation);
        Assert.Equal(ProcessStatus.Processing, capturedMutation.ExpectedProcessStatus);
        Assert.Equal(ProcessStatus.Idle, capturedMutation.ProcessState?.State?.Status);
        Assert.Equal("ServiceTask_1", capturedMutation.ProcessState?.State?.CurrentTask?.ElementId);
        Assert.Equal(ProcessStatus.Idle, unitOfWork.Instance.Process?.Status);
        mutationClient.VerifyAll();
    }

    private static InstanceDataUnitOfWork CreateUnitOfWork(
        Instance instance,
        IInstanceMutationClient? mutationClient = null
    )
    {
        var dataClient = new Mock<IDataClientWithStorageMetadata>();
        mutationClient ??= dataClient.As<IInstanceMutationClient>().Object;
        return new InstanceDataUnitOfWork(
            instance,
            new StorageVersionMetadata(InstanceVersion: 12, ProcessStateVersion: 8),
            dataClient.Object,
            mutationClient,
            Mock.Of<IInstanceClientWithStorageMetadata>(),
            new ApplicationMetadata("ttd/test-app") { DataTypes = [] },
            Mock.Of<ITranslationService>(),
            new ModelSerializationService(null!),
            Mock.Of<IAppResources>(),
            Options.Create(new FrontEndSettings()),
            taskId: instance.Process?.CurrentTask?.ElementId,
            language: null
        );
    }

    private sealed class DelegateServiceTask(string type, Func<ServiceTaskContext, Task<ServiceTaskResult>> execute)
        : IServiceTask
    {
        public string Type => type;

        public Task<ServiceTaskResult> Execute(ServiceTaskContext context) => execute(context);
    }
}
