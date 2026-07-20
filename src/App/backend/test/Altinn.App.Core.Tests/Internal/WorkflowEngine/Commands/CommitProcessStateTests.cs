using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands;

public class CommitProcessStateTests
{
    [Fact]
    public async Task Execute_StagesProcessStateChangeWithoutCallingStorage()
    {
        CommandSetup setup = CreateCommandSetup(CreateInstance("Task_1"));
        var payload = CreateProcessStateChangePayload(setup.UnitOfWork.Instance, "Task_2");
        var command = new CommitProcessState();
        StorageInstanceMutationRequest? capturedMutation = null;
        setup
            .MutationClient.Setup(x =>
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
                            Id = setup.UnitOfWork.Instance.Id,
                            AppId = setup.UnitOfWork.Instance.AppId,
                            Org = setup.UnitOfWork.Instance.Org,
                            InstanceOwner = setup.UnitOfWork.Instance.InstanceOwner,
                            Process = mutation.ProcessState?.State,
                            Data = [],
                        },
                        new StorageVersionMetadata(InstanceVersion: 13, ProcessStateVersion: 9)
                    );
                }
            );

        ProcessEngineCommandResult result = await ((IWorkflowEngineCommand)command).Execute(
            CreateContext(setup.UnitOfWork, payload)
        );

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        setup.MutationClient.VerifyNoOtherCalls();

        WorkflowAggregateSaveOutcome outcome = await setup.UnitOfWork.SaveWorkflowOwnedAggregate(
            setup.UnitOfWork.GetDataElementChanges(false),
            "commit-process-state-step-id",
            CancellationToken.None
        );

        Assert.Equal(WorkflowAggregateSaveOutcome.Saved, outcome);
        Assert.Equal("Task_2", setup.UnitOfWork.Instance.Process?.CurrentTask?.ElementId);
        Assert.Equal("Task_2", capturedMutation?.ProcessState?.State?.CurrentTask?.ElementId);
    }

    [Fact]
    public async Task Execute_WhenNewProcessStateIsNull_ReturnsPermanentFailure()
    {
        CommandSetup setup = CreateCommandSetup(CreateInstance("Task_1"));
        var payload = new ProcessStateChangePayload(
            new ProcessStateChange { OldProcessState = setup.UnitOfWork.Instance.Process, NewProcessState = null }
        );
        var command = new CommitProcessState();

        ProcessEngineCommandResult result = await ((IWorkflowEngineCommand)command).Execute(
            CreateContext(setup.UnitOfWork, payload)
        );

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("InvalidOperationException", failed.ExceptionType);
        setup.MutationClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Execute_WhenMutatorIsNotUnitOfWork_ReturnsPermanentFailure()
    {
        var payload = CreateProcessStateChangePayload(CreateInstance("Task_1"), "Task_2");
        var context = CreateContext(Mock.Of<IInstanceDataMutator>(), payload);
        var command = new CommitProcessState();

        ProcessEngineCommandResult result = await ((IWorkflowEngineCommand)command).Execute(context);

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("InvalidOperationException", failed.ExceptionType);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("{")]
    [InlineData("{\"processStateChange\":{}}")]
    [InlineData("{\"$type\":\"processStateChange\"}")]
    [InlineData("{\"$type\":\"unknown\"}")]
    [InlineData("{\"$type\":\"executeServiceTask\",\"serviceTaskType\":\"test\"}")]
    public async Task Execute_WithInvalidPayload_ReturnsPermanentInvalidPayloadWithoutSideEffects(
        string? serializedPayload
    )
    {
        var mutatorMock = new Mock<IInstanceDataMutator>(MockBehavior.Strict);
        var command = new CommitProcessState();

        ProcessEngineCommandResult result = await ((IWorkflowEngineCommand)command).Execute(
            CreateContext(mutatorMock.Object, serializedPayload)
        );

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("CommitProcessState payload is missing or invalid", failed.ErrorMessage);
        Assert.Equal("InvalidPayloadException", failed.ExceptionType);
        mutatorMock.VerifyNoOtherCalls();
    }

    private static Instance CreateInstance(string taskId) =>
        new()
        {
            Id = $"1337/{Guid.NewGuid()}",
            AppId = "ttd/test-app",
            Org = "ttd",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = taskId } },
            Data = [],
        };

    private static ProcessEngineCommandContext CreateContext(
        IInstanceDataMutator mutator,
        ProcessStateChangePayload payload
    ) => CreateContext(mutator, CommandPayloadSerializer.Serialize(payload));

    private static ProcessEngineCommandContext CreateContext(IInstanceDataMutator mutator, string? serializedPayload) =>
        new()
        {
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, Guid.NewGuid()),
            InstanceDataMutator = mutator,
            CancellationToken = CancellationToken.None,
            Payload = new AppCallbackPayload
            {
                CommandKey = CommitProcessState.Key,
                Actor = new Actor { UserId = 1337 },
                Payload = serializedPayload,
                LockToken = Guid.NewGuid().ToString(),
                State = "{}",
                WorkflowId = Guid.NewGuid(),
                ExecutionReferenceTime = new DateTimeOffset(2025, 3, 14, 9, 26, 53, TimeSpan.Zero),
            },
        };

    private static ProcessStateChangePayload CreateProcessStateChangePayload(Instance instance, string taskId) =>
        new(
            new ProcessStateChange
            {
                OldProcessState = instance.Process,
                NewProcessState = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = taskId } },
                Events = [new InstanceEvent { EventType = "process_StartTask" }],
            }
        );

    private static CommandSetup CreateCommandSetup(Instance instance)
    {
        var dataClientMock = new Mock<IDataClientWithStorageMetadata>(MockBehavior.Strict);
        var mutationClientMock = dataClientMock.As<IInstanceMutationClient>();
        var unitOfWork = new InstanceDataUnitOfWork(
            instance,
            new StorageVersionMetadata(InstanceVersion: 12, ProcessStateVersion: 8),
            dataClientMock.Object,
            mutationClientMock.Object,
            Mock.Of<IInstanceClientWithStorageMetadata>(),
            new ApplicationMetadata("ttd/test-app") { DataTypes = [] },
            Mock.Of<ITranslationService>(),
            new ModelSerializationService(null!),
            Mock.Of<IAppResources>(),
            Options.Create(new FrontEndSettings()),
            taskId: null,
            language: null
        );

        return new CommandSetup(unitOfWork, mutationClientMock);
    }

    private sealed record CommandSetup(InstanceDataUnitOfWork UnitOfWork, Mock<IInstanceMutationClient> MutationClient);
}
