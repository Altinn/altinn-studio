using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.ProcessEnd;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands.ProcessNext.ProcessEnd;

public class ConfirmCompleteOnProcessEndTests
{
    private static Instance CreateInstance(DateTime? ended) =>
        new()
        {
            Id = $"1337/{Guid.NewGuid()}",
            Org = "ttd",
            AppId = "ttd/test-app",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Process = new ProcessState
            {
                Status = ProcessStatus.Processing,
                Ended = ended,
                EndEvent = ended is null ? null : "EndEvent_1",
                CurrentTask = ended is null ? new ProcessElementInfo { ElementId = "Task_1" } : null,
            },
            Data = [],
        };

    private static InstanceDataUnitOfWork CreateUnitOfWork(Instance instance)
    {
        var dataClient = new Mock<IDataClientWithStorageMetadata>(MockBehavior.Strict);
        // Before the first Object read, which fixes the interfaces the mock implements.
        IInstanceMutationClient mutationClient = dataClient.As<IInstanceMutationClient>().Object;
        return new InstanceDataUnitOfWork(
            instance,
            new StorageVersionMetadata(InstanceVersion: 12, ProcessStateVersion: 8),
            dataClient.Object,
            mutationClient,
            Mock.Of<IInstanceClientWithStorageMetadata>(MockBehavior.Strict),
            new ApplicationMetadata(instance.AppId) { DataTypes = [] },
            Mock.Of<ITranslationService>(),
            new ModelSerializationService(null!),
            Mock.Of<IAppResources>(),
            Options.Create(new FrontEndSettings()),
            taskId: instance.Process?.CurrentTask?.ElementId,
            language: null
        );
    }

    private static WorkflowEngineCommandContext CreateContext(IInstanceDataMutator mutator) =>
        new()
        {
            StateCarry = new(),
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(mutator.Instance),
            InstanceDataMutator = mutator,
            CancellationToken = CancellationToken.None,
            Payload = new AppCallbackPayload
            {
                CommandKey = ConfirmCompleteOnProcessEnd.Key,
                Actor = new Actor { UserId = 1337 },
                State = "{}",
                WorkflowId = Guid.Empty,
                StepId = Guid.NewGuid(),
                ExecutionReferenceTime = new DateTimeOffset(2026, 11, 3, 9, 0, 0, TimeSpan.Zero),
            },
        };

    private static readonly DateTime _ended = new(2026, 11, 3, 8, 59, 0, DateTimeKind.Utc);

    [Fact]
    public async Task Execute_BeforeTheProcessHasEnded_FailsPermanentlyWithoutStaging()
    {
        InstanceDataUnitOfWork unitOfWork = CreateUnitOfWork(CreateInstance(ended: null));

        WorkflowEngineCommandResult result = await new ConfirmCompleteOnProcessEnd().Execute(CreateContext(unitOfWork));

        FailedWorkflowEngineCommandResult failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.False(unitOfWork.StagedCompleteConfirmation);
    }

    [Fact]
    public async Task Execute_WithoutAUnitOfWork_FailsPermanently()
    {
        var mutator = new Mock<IInstanceDataMutator>();
        mutator.Setup(x => x.Instance).Returns(CreateInstance(_ended));

        WorkflowEngineCommandResult result = await new ConfirmCompleteOnProcessEnd().Execute(
            CreateContext(mutator.Object)
        );

        FailedWorkflowEngineCommandResult failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
    }
}
