using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.ProcessEnd;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands.ProcessNext.ProcessEnd;

public class EndProcessLegacyHookTests
{
    [Fact]
    public async Task Execute_ExposesEndedStateAndLockedCleanupDataBeforeTerminalCommit()
    {
        Guid dataElementId = Guid.NewGuid();
        var instance = new Instance
        {
            Id = $"1337/{Guid.NewGuid()}",
            AppId = "ttd/test-app",
            Org = "ttd",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Process = new ProcessState
            {
                Ended = new DateTime(2026, 7, 24, 8, 30, 0, DateTimeKind.Utc),
                EndEvent = "EndEvent_1",
                CurrentTask = null,
                Status = ProcessStatus.Processing,
            },
            Data =
            [
                new DataElement
                {
                    Id = dataElementId.ToString(),
                    DataType = "auto-delete",
                    Locked = true,
                },
            ],
        };
        var mutator = new Mock<IInstanceDataMutator>(MockBehavior.Strict);
        mutator.SetupGet(x => x.Instance).Returns(instance);
        bool hookObservedPreCommitState = false;
        var processEnd = new Mock<IProcessEnd>(MockBehavior.Strict);
        processEnd
            .Setup(x => x.End(It.IsAny<Instance>(), null))
            .Callback<Instance, List<InstanceEvent>?>(
                (observedInstance, events) =>
                {
                    Assert.Same(instance, observedInstance);
                    Assert.Null(events);
                    Assert.Equal("EndEvent_1", observedInstance.Process?.EndEvent);
                    Assert.NotNull(observedInstance.Process?.Ended);
                    Assert.Null(observedInstance.Process?.CurrentTask);
                    Assert.Equal(ProcessStatus.Processing, observedInstance.Process?.Status);
                    DataElement dataElement = Assert.Single(observedInstance.Data);
                    Assert.Equal(dataElementId.ToString(), dataElement.Id);
                    Assert.Equal("auto-delete", dataElement.DataType);
                    Assert.True(dataElement.Locked);
                    hookObservedPreCommitState = true;
                }
            )
            .Returns(Task.CompletedTask);
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        services.AddSingleton(processEnd.Object);
        await using ServiceProvider serviceProvider = services.BuildServiceProvider();
        var command = new EndProcessLegacyHook(serviceProvider);
        var context = new ProcessEngineCommandContext
        {
            StateCarry = new(),
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(instance),
            InstanceDataMutator = mutator.Object,
            CancellationToken = CancellationToken.None,
            Payload = new AppCallbackPayload
            {
                CommandKey = EndProcessLegacyHook.Key,
                Actor = new Actor { UserId = 1337 },
                ExecutionReferenceTime = new DateTimeOffset(2026, 7, 24, 8, 30, 0, TimeSpan.Zero),
                State = "{}",
                WorkflowId = Guid.NewGuid(),
                StepId = Guid.NewGuid(),
            },
        };

        ProcessEngineCommandResult result = await command.Execute(context);

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.True(hookObservedPreCommitState);
        processEnd.VerifyAll();
        mutator.VerifyAll();
    }
}
