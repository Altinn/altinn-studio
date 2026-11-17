using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
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
    public async Task Next_OnAServiceTaskV8LeftWithoutWorkflow_RunsTheTaskAndGoesOnAfterIt(string? action, bool parked)
    {
        Instance instance = CreateServiceTaskInstance();
        Instance afterTask = parked ? CreateServiceTaskInstance() : CreateEndedInstance();
        var versions = new StorageVersionMetadata(InstanceVersion: 31, ProcessStateVersion: 17);
        string? capturedState = null;
        await using var fixture = CreateServiceTaskFixture();
        Mock<IWorkflowEngineService> workflowService = fixture.Mock<IWorkflowEngineService>();
        SetupServiceTaskWithoutWorkflow(workflowService);
        workflowService
            .Setup(s =>
                s.EnqueueAndWaitForServiceTaskWithoutWorkflow(
                    instance,
                    _storageVersions,
                    It.IsAny<string>(),
                    "en",
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<Instance, StorageVersionMetadata, string, string?, CancellationToken>(
                (_, _, state, _, _) => capturedState = state
            )
            .ReturnsAsync(new ProcessNextWorkflowResult(afterTask, versions, null, true, parked));

        ProcessChangeResult result = await fixture.ProcessEngine.Next(
            new ProcessNextRequest
            {
                Instance = instance,
                InstanceVersions = _storageVersions,
                User = CreateUserClaimsPrincipal(),
                Action = action,
                Language = "en",
            }
        );

        Assert.True(result.Success);
        Assert.Same(afterTask, result.MutatedInstance);
        Assert.Equal(versions, result.MutatedInstanceVersions);
        Assert.Same(instance.Process, result.ProcessStateChange.OldProcessState);
        Assert.Same(afterTask.Process, result.ProcessStateChange.NewProcessState);
        Assert.Equal(parked, result.WorkflowParked);

        // The workflow runs the task from the snapshot this request read.
        WorkflowCallbackState callbackState = ReadCallbackState(fixture, capturedState);
        Assert.Equal("Task_Service", callbackState.Instance.Process.CurrentTask.ElementId);
        Assert.Equal(_storageVersions.InstanceVersion, callbackState.InstanceVersion);

        // The task concludes the transition itself, so the request neither decides one nor enqueues one.
        workflowService.Verify(
            s =>
                s.EnqueueAndWaitForProcessNext(
                    It.IsAny<Instance>(),
                    It.IsAny<StorageVersionMetadata>(),
                    It.IsAny<string>(),
                    It.IsAny<ProcessStateChange>(),
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
        fixture.Mock<IProcessNavigator>().VerifyNoOtherCalls();
    }

    // v8 skipped the service task on a reject and took the reject flow, and the v8 frontend's failed service task
    // view offered that as its back button. A reject the BPMN allows from the task must not run the task and move
    // the process forward instead.
    [Fact]
    public async Task Next_WithAnAllowedReject_OnAServiceTaskV8LeftWithoutWorkflow_DoesNotRunTheTaskAndMoveForward()
    {
        Instance instance = CreateServiceTaskInstance();
        Instance afterTask = CreateEndedInstance();
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
        workflowService
            .Setup(s =>
                s.EnqueueAndWaitForServiceTaskWithoutWorkflow(
                    It.IsAny<Instance>(),
                    It.IsAny<StorageVersionMetadata>(),
                    It.IsAny<string>(),
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new ProcessNextWorkflowResult(afterTask, _storageVersions, null, true));
        SetupWorkflowResult(fixture, CreateTask1Instance());

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

        workflowService.Verify(
            s =>
                s.EnqueueAndWaitForServiceTaskWithoutWorkflow(
                    It.IsAny<Instance>(),
                    It.IsAny<StorageVersionMetadata>(),
                    It.IsAny<string>(),
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
        Assert.True(result.Success);
        Assert.Equal("Task_1", result.ProcessStateChange.NewProcessState?.CurrentTask?.ElementId);
        // The reject flow, as from any task: abandoned, without validation.
        fixture
            .Mock<IProcessNavigator>()
            .Verify(n => n.GetNextTask(It.IsAny<IInstanceDataAccessor>(), "Task_Service", "reject"), Times.Once);
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
    [InlineData(WorkflowActivityStatus.Processing, ProcessNextState.Retrying)]
    [InlineData(WorkflowActivityStatus.Failed, ProcessNextState.ResumeRequired)]
    public async Task Next_OnAnIdleServiceTaskWithAWorkflow_AnswersWithItsStateAndMovesNothing(
        WorkflowActivityStatus status,
        ProcessNextState expected
    )
    {
        // As after a workflow that runs the task was enqueued and has not yet claimed the instance, or failed to.
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

    [Fact]
    public async Task Next_WhenTheServiceTaskV8LeftFailsAgain_ReportsTheFailureWithoutAProcessChange()
    {
        Instance instance = CreateServiceTaskInstance();
        Instance afterFailure = CreateServiceTaskInstance();
        afterFailure.Process.Status = ProcessStatus.Processing;
        var failure = new WorkflowFailure
        {
            Kind = WorkflowFailureKind.StepFailed,
            WorkflowId = Guid.NewGuid(),
            LastError = new WorkflowFailureError { Message = "The task failed." },
        };
        await using var fixture = CreateServiceTaskFixture();
        Mock<IWorkflowEngineService> workflowService = fixture.Mock<IWorkflowEngineService>();
        SetupServiceTaskWithoutWorkflow(workflowService);
        workflowService
            .Setup(s =>
                s.EnqueueAndWaitForServiceTaskWithoutWorkflow(
                    instance,
                    _storageVersions,
                    It.IsAny<string>(),
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                new ProcessNextWorkflowResult(afterFailure, _storageVersions, failure, ProcessStateCommitted: false)
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
        Assert.Equal(ProcessErrorType.Internal, result.ErrorType);
        Assert.Same(failure, result.WorkflowFailure);
        Assert.Null(result.ProcessStateOnFailure);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task ResumeCurrentTask_OnAServiceTaskV8LeftWithoutWorkflow_RunsTheTask(bool parked)
    {
        Instance instance = CreateServiceTaskInstance();
        Instance afterTask = parked ? CreateServiceTaskInstance() : CreateEndedInstance();
        await using var fixture = CreateServiceTaskFixture();
        Mock<IWorkflowEngineService> workflowService = fixture.Mock<IWorkflowEngineService>();
        SetupServiceTaskWithoutWorkflow(workflowService);
        workflowService
            .Setup(s =>
                s.EnqueueAndWaitForServiceTaskWithoutWorkflow(
                    instance,
                    _storageVersions,
                    It.IsAny<string>(),
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new ProcessNextWorkflowResult(afterTask, _storageVersions, null, true, parked));

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
        Assert.Same(afterTask.Process, result.ProcessStateChange.NewProcessState);
        Assert.Equal(parked, result.WorkflowParked);
        workflowService.Verify(
            s => s.ResumeAndWaitForWorkflow(It.IsAny<Instance>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
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
        return Fixture.Create(services);
    }

    private static WorkflowCallbackState ReadCallbackState(Fixture fixture, string? state)
    {
        string payload = fixture
            .ServiceProvider.GetRequiredService<WorkflowStateSigner>()
            .Verify(Assert.IsType<string>(state), SigningDomain.CallbackState);
        return Assert.IsType<WorkflowCallbackState>(
            System.Text.Json.JsonSerializer.Deserialize<WorkflowCallbackState>(payload)
        );
    }

    // Idle, as v8 left it: v8 knew no process status.
    private static Instance CreateServiceTaskInstance() =>
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
                    Flow = 3,
                },
            },
        };

    private sealed class ServiceTaskRunWithoutWorkflow : IServiceTask
    {
        public string Type => ServiceTaskWithoutWorkflowType;

        public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) =>
            pipeline.Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()));
    }
}
