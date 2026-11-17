using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Models;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process;

public sealed partial class ProcessEngineTest
{
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
                s.EnqueueAndWaitForServiceTaskAdoption(
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
                s.EnqueueAndWaitForServiceTaskAdoption(
                    It.IsAny<Instance>(),
                    It.IsAny<StorageVersionMetadata>(),
                    It.IsAny<string>(),
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
        Assert.NotEqual("EndEvent_1", result.ProcessStateChange?.NewProcessState?.EndEvent);
    }
}
