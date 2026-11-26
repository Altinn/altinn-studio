using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.Elements.Base;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process;

// An instance v8 left in a service task whose run failed is idle in the task, with no workflow for it.
public sealed partial class ProcessEngineTest
{
    private const string ServiceTaskWithoutWorkflowType = "service-without-workflow";

    [Theory]
    [InlineData(null, false)]
    [InlineData(null, true)]
    [InlineData("write", false)]
    [InlineData(ServiceTaskWithoutWorkflowType, false)]
    public async Task Next_OnAServiceTaskV8LeftWithoutWorkflow_StartsTheTaskAgain(string? action, bool parked)
    {
        Instance instance = CreateServiceTaskInstance();
        Instance afterTask = parked ? CreateServiceTaskInstance(flow: 4) : CreateEndedInstance();
        await using var fixture = CreateServiceTaskFixture();
        Mock<IWorkflowEngineService> workflowService = fixture.Mock<IWorkflowEngineService>();
        SetupServiceTaskWithoutWorkflow(workflowService);
        List<ProcessStateChange> enqueued = CaptureEnqueuedTransitions(workflowService, afterTask, parked);

        ProcessChangeResult result = await fixture.ProcessEngine.Next(
            new ProcessNextRequest
            {
                Instance = instance,
                InstanceVersions = _storageVersions,
                User = CreateUserClaimsPrincipal(),
                Action = action,
                Language = null,
            }
        );

        Assert.True(result.Success);
        Assert.Same(afterTask.Process, result.ProcessStateChange.NewProcessState);
        Assert.Equal(parked, result.WorkflowParked);
        AssertRestartOfTheServiceTask(Assert.Single(enqueued));
        // A restart decides no route and validates nothing, as for any service task.
        fixture.Mock<IProcessNavigator>().VerifyNoOtherCalls();
        fixture.Mock<IValidationService>().VerifyNoOtherCalls();
    }

    [Fact]
    public async Task ResumeCurrentTask_OnAServiceTaskV8LeftWithoutWorkflow_StartsTheTaskAgain()
    {
        Instance instance = CreateServiceTaskInstance();
        await using var fixture = CreateServiceTaskFixture();
        Mock<IWorkflowEngineService> workflowService = fixture.Mock<IWorkflowEngineService>();
        SetupServiceTaskWithoutWorkflow(workflowService);
        List<ProcessStateChange> enqueued = CaptureEnqueuedTransitions(workflowService, CreateEndedInstance(), false);

        ProcessChangeResult result = await fixture.ProcessEngine.ResumeCurrentTask(
            new ProcessNextRequest
            {
                Instance = instance,
                InstanceVersions = _storageVersions,
                User = CreateUserClaimsPrincipal(),
                Action = null,
                Language = null,
            }
        );

        Assert.True(result.Success);
        Assert.NotNull(result.ProcessStateChange.NewProcessState?.Ended);
        AssertRestartOfTheServiceTask(Assert.Single(enqueued));
        workflowService.Verify(
            s => s.ResumeAndWaitForWorkflow(It.IsAny<Instance>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
    }

    [Fact]
    public async Task Next_WhenTheInstanceChangedBeforeTheRestartClaimedIt_ReportsThatTheInstanceChanged()
    {
        // The acquire lost to a change made after this request read the instance, so it completed without the
        // restart and the instance is still on the visit the request read.
        Instance instance = CreateServiceTaskInstance();
        await using var fixture = CreateServiceTaskFixture();
        Mock<IWorkflowEngineService> workflowService = fixture.Mock<IWorkflowEngineService>();
        SetupServiceTaskWithoutWorkflow(workflowService);
        CaptureEnqueuedTransitions(workflowService, CreateServiceTaskInstance(), false);

        ProcessChangeResult result = await fixture.ProcessEngine.Next(
            new ProcessNextRequest
            {
                Instance = instance,
                InstanceVersions = _storageVersions,
                User = CreateUserClaimsPrincipal(),
                Action = null,
                Language = null,
            }
        );

        Assert.False(result.Success);
        Assert.Equal(ProcessErrorType.Conflict, result.ErrorType);
        Assert.Equal(ProcessNextState.InstanceChanged, result.ProcessNextState);
    }

    // v8 skipped the service task on a reject and took the reject flow, and the v8 frontend's failed service task
    // view offered that as its back button. A reject the BPMN allows from the task must not run the task and move
    // the process forward instead.
    [Fact]
    public async Task Next_WithAnAllowedReject_OnAServiceTaskV8LeftWithoutWorkflow_DoesNotRunTheTaskAndMoveForward()
    {
        Instance instance = CreateServiceTaskInstance();
        await using var fixture = CreateServiceTaskFixture();
        fixture
            .Mock<IProcessReader>()
            .Setup(r => r.GetAltinnTaskExtension("Task_Service"))
            .Returns(new AltinnTaskExtension { AltinnActions = [new AltinnAction("reject")] });
        fixture.Mock<IProcessReader>().Setup(r => r.IsProcessTask("Task_Service")).Returns(true);
        fixture
            .Mock<IProcessNavigator>()
            .Setup(n => n.GetNextTask(It.IsAny<IInstanceDataAccessor>(), "Task_Service", "reject"))
            .ReturnsAsync(
                new ProcessTask
                {
                    Id = "Task_1",
                    Incoming = ["Flow_back"],
                    Outgoing = ["Flow_1"],
                    Name = "Utfylling",
                    ExtensionElements = new() { TaskExtension = new() { TaskType = AltinnTaskTypes.Data } },
                }
            );
        Mock<IWorkflowEngineService> workflowService = fixture.Mock<IWorkflowEngineService>();
        SetupServiceTaskWithoutWorkflow(workflowService);
        List<ProcessStateChange> enqueued = CaptureEnqueuedTransitions(workflowService, CreateTask1Instance(), false);

        ProcessChangeResult result = await fixture.ProcessEngine.Next(
            new ProcessNextRequest
            {
                Instance = instance,
                InstanceVersions = _storageVersions,
                User = CreateUserClaimsPrincipal(),
                Action = "reject",
                Language = null,
            }
        );

        Assert.True(result.Success);
        Assert.Equal("Task_1", result.ProcessStateChange.NewProcessState?.CurrentTask?.ElementId);
        // The reject flow, as from any task: abandoned, without validation.
        ProcessStateChange rejected = Assert.Single(enqueued);
        Assert.Equal("Task_1", rejected.NewProcessState?.CurrentTask?.ElementId);
        Assert.Contains(rejected.Events ?? [], e => e.EventType == nameof(InstanceEventType.process_AbandonTask));
        fixture.Mock<IValidationService>().VerifyNoOtherCalls();
    }

    [Theory]
    [InlineData("confirm")]
    [InlineData("reject")]
    public async Task Next_WithAnotherActionOnAServiceTaskV8LeftWithoutWorkflow_IsRefusedAsV8RefusedIt(string action)
    {
        // A reject the BPMN does not allow from the task is no different from any other action.
        Instance instance = CreateServiceTaskInstance();
        await using var fixture = CreateServiceTaskFixture();
        Mock<IWorkflowEngineService> workflowService = fixture.Mock<IWorkflowEngineService>();

        ProcessChangeResult result = await fixture.ProcessEngine.Next(
            new ProcessNextRequest
            {
                Instance = instance,
                InstanceVersions = _storageVersions,
                User = CreateUserClaimsPrincipal(),
                Action = action,
                Language = null,
            }
        );

        Assert.False(result.Success);
        Assert.Equal(ProcessErrorType.Conflict, result.ErrorType);
        Assert.Equal("User action not supported.", result.ErrorTitle);
        workflowService.VerifyNoOtherCalls();
        fixture.Mock<IProcessNavigator>().VerifyNoOtherCalls();
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Next_OnAServiceTaskV8LeftThatTheProcessNoLongerDeclares_IsRefusedAndRunsNothing(
        bool keptAsUserTask
    )
    {
        // A deploy removed the task, or made it a user task, while v8 left instances in it.
        Instance instance = CreateServiceTaskInstance();
        await using var fixture = CreateServiceTaskFixture();
        fixture
            .Mock<IProcessReader>()
            .Setup(r => r.GetFlowElement("Task_Service"))
            .Returns(keptAsUserTask ? CreateDeclaredTask(new ProcessTask()) : null);
        Mock<IWorkflowEngineService> workflowService = fixture.Mock<IWorkflowEngineService>();
        SetupServiceTaskWithoutWorkflow(workflowService);

        ProcessChangeResult result = await fixture.ProcessEngine.Next(
            new ProcessNextRequest
            {
                Instance = instance,
                InstanceVersions = _storageVersions,
                User = CreateUserClaimsPrincipal(),
                Action = null,
                Language = null,
            }
        );

        Assert.False(result.Success);
        Assert.Equal(ProcessErrorType.Conflict, result.ErrorType);
        Assert.Equal("Service task not in the process.", result.ErrorTitle);
        workflowService.VerifyNoOtherCalls();
    }

    [Theory]
    [InlineData(WorkflowActivityStatus.Processing, nameof(ProcessNextState.Retrying))]
    [InlineData(WorkflowActivityStatus.Failed, nameof(ProcessNextState.ResumeRequired))]
    public async Task Next_OnAnIdleServiceTaskWithAWorkflow_AnswersWithItsStateAndMovesNothing(
        WorkflowActivityStatus status,
        string expectedName
    )
    {
        // A public test method cannot take the internal enum, so the cases name its values.
        ProcessNextState expected = Enum.Parse<ProcessNextState>(expectedName);
        // As after a workflow that starts the task again was enqueued and has not yet claimed the instance, or failed
        // to.
        Instance instance = CreateServiceTaskInstance();
        await using var fixture = CreateServiceTaskFixture();
        Mock<IWorkflowEngineService> workflowService = fixture.Mock<IWorkflowEngineService>();
        workflowService
            .Setup(s => s.ResolveWorkflowTaskStatus(instance, It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new WorkflowTaskStatus(
                    status,
                    "Task_Service",
                    status == WorkflowActivityStatus.Failed
                        ? new WorkflowFailure { Kind = WorkflowFailureKind.StepFailed, WorkflowId = Guid.NewGuid() }
                        : null
                )
            );

        ProcessChangeResult result = await fixture.ProcessEngine.Next(
            new ProcessNextRequest
            {
                Instance = instance,
                InstanceVersions = _storageVersions,
                User = CreateUserClaimsPrincipal(),
                Action = null,
                Language = null,
            }
        );

        Assert.False(result.Success);
        Assert.Equal(ProcessErrorType.Conflict, result.ErrorType);
        Assert.Equal(expected, result.ProcessNextState);
        workflowService.Verify(s => s.ResolveWorkflowTaskStatus(instance, It.IsAny<CancellationToken>()), Times.Once);
        workflowService.VerifyNoOtherCalls();
        fixture.Mock<IProcessNavigator>().VerifyNoOtherCalls();
    }

    private static void AssertRestartOfTheServiceTask(ProcessStateChange transition)
    {
        Assert.Equal("Task_Service", transition.OldProcessState?.CurrentTask?.ElementId);
        Assert.Equal(3, transition.OldProcessState?.CurrentTask?.Flow);
        // A new visit of the same task, as a gateway back to it makes.
        ProcessElementInfo? restarted = transition.NewProcessState?.CurrentTask;
        Assert.Equal("Task_Service", restarted?.ElementId);
        Assert.Equal(4, restarted?.Flow);
        Assert.Equal(ServiceTaskWithoutWorkflowType, restarted?.AltinnTaskType);
        // Started only: the task never ended.
        InstanceEvent started = Assert.Single(transition.Events ?? []);
        Assert.Equal(nameof(InstanceEventType.process_StartTask), started.EventType);
        Assert.Equal("Task_Service", started.ProcessInfo?.CurrentTask?.ElementId);
    }

    private static List<ProcessStateChange> CaptureEnqueuedTransitions(
        Mock<IWorkflowEngineService> workflowService,
        Instance afterTransition,
        bool parked
    )
    {
        List<ProcessStateChange> captured = [];
        workflowService
            .Setup(s =>
                s.EnqueueAndWaitForProcessNext(
                    It.IsAny<Instance>(),
                    _storageVersions,
                    It.IsAny<string>(),
                    It.IsAny<ProcessStateChange>(),
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<Instance, StorageVersionMetadata, string, ProcessStateChange, string?, CancellationToken>(
                (_, _, _, transition, _, _) => captured.Add(transition)
            )
            .ReturnsAsync(new ProcessNextWorkflowResult(afterTransition, _storageVersions, null, true, parked));
        return captured;
    }

    private static void SetupServiceTaskWithoutWorkflow(Mock<IWorkflowEngineService> workflowService) =>
        workflowService
            .Setup(s => s.ResolveWorkflowTaskStatus(It.IsAny<Instance>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new WorkflowTaskStatus(
                    WorkflowActivityStatus.Failed,
                    "Task_Service",
                    Failure: null,
                    ServiceTaskWithoutWorkflow: true
                )
            );

    private static Fixture CreateServiceTaskFixture()
    {
        var services = new ServiceCollection();
        services.AddSingleton<IServiceTask>(new ServiceTaskRunWithoutWorkflow());
        Fixture fixture = Fixture.Create(services);
        fixture
            .Mock<IProcessReader>()
            .Setup(r => r.GetFlowElement("Task_Service"))
            .Returns(CreateDeclaredTask(new ServiceTask()));
        return fixture;
    }

    private static ProcessElement CreateDeclaredTask(ProcessTask task)
    {
        task.Id = "Task_Service";
        task.Name = "Lag PDF";
        task.Incoming = ["Flow_1"];
        task.Outgoing = ["Flow_2"];
        task.ExtensionElements = new() { TaskExtension = new() { TaskType = ServiceTaskWithoutWorkflowType } };
        return task;
    }

    // Idle, as v8 left it: v8 knew no process status.
    private static Instance CreateServiceTaskInstance(int flow = 3) =>
        new()
        {
            Id = _instanceId,
            AppId = "org/app",
            InstanceOwner = new InstanceOwner() { PartyId = "1337" },
            Data = [],
            Process = new ProcessState()
            {
                StartEvent = "StartEvent_1",
                CurrentTask = new()
                {
                    ElementId = "Task_Service",
                    AltinnTaskType = ServiceTaskWithoutWorkflowType,
                    Flow = flow,
                },
            },
        };

    private sealed class ServiceTaskRunWithoutWorkflow : IServiceTask
    {
        public string Type => ServiceTaskWithoutWorkflowType;

        public void DefineExecute(PipelineBuilder.ServiceTask pipeline) =>
            pipeline.Stage(_ => Task.FromResult(ServiceTaskResult.Completed()));
    }
}
