using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process;

// v8 left an instance it failed in a service task idle in that task, with no workflow, and ran the task again on the
// next process/next. These tests cover how v9 takes such an instance over.
public sealed partial class ProcessEngineTest
{
    private const string AdoptedServiceTaskType = "adopted-service";

    [Theory]
    [InlineData(null, false)]
    [InlineData(null, true)]
    [InlineData("reject", false)]
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
                s.EnqueueAndWaitForServiceTaskAdoption(
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
                s.EnqueueAndWaitForServiceTaskAdoption(
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
                s.EnqueueAndWaitForServiceTaskAdoption(
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
        services.AddSingleton<IServiceTask>(new AdoptedServiceTask());
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
                    AltinnTaskType = AdoptedServiceTaskType,
                    Flow = 3,
                },
            },
        };

    private sealed class AdoptedServiceTask : IServiceTask
    {
        public string Type => AdoptedServiceTaskType;

        public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) =>
            pipeline.Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()));
    }
}
