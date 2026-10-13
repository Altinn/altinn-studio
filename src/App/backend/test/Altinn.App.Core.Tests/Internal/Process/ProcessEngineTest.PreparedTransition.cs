using System.Text.Json;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process;

public sealed partial class ProcessEngineTest
{
    private static readonly DateTimeOffset _executionTime = new(2025, 3, 14, 11, 26, 53, TimeSpan.FromHours(2));

    [Theory]
    [InlineData(null, "Task_2", InstanceEventType.process_EndTask, ProcessSequenceFlowType.CompleteCurrentMoveToNext)]
    [InlineData(
        "reject",
        "Task_2",
        InstanceEventType.process_AbandonTask,
        ProcessSequenceFlowType.AbandonCurrentMoveToNext
    )]
    [InlineData(null, "Task_1", InstanceEventType.process_EndTask, ProcessSequenceFlowType.CompleteCurrentMoveToNext)]
    public async Task Next_PreparesTheSourceAndNewTaskVisitWithoutExecutionContext(
        string? action,
        string destination,
        InstanceEventType leaveEvent,
        ProcessSequenceFlowType flowType
    )
    {
        await using var fixture = Fixture.Create();
        Instance instance = CreateTask1Instance();
        instance.Process.Started = _executionTime.AddHours(-1).UtcDateTime;
        instance.Process.CurrentTask.Started = _executionTime.AddMinutes(-30).UtcDateTime;
        ProcessState source = instance.Process;
        ProcessElementInfo sourceTask = source.CurrentTask;
        if (destination == "Task_1")
        {
            fixture
                .Mock<IProcessNavigator>()
                .Setup(n => n.GetNextTask(It.IsAny<IInstanceDataAccessor>(), "Task_1", action))
                .ReturnsAsync(new ProcessTask { Id = "Task_1" });
        }
        fixture
            .Mock<IProcessReader>()
            .Setup(r => r.GetAltinnTaskExtension("Task_1"))
            .Returns(new AltinnTaskExtension { AltinnActions = [new AltinnAction("reject")] });

        ProcessStateChange change = await PrepareProcessNext(fixture, instance, action);

        Assert.Same(sourceTask, change.OldProcessState?.CurrentTask);
        ProcessState target = Assert.IsType<ProcessState>(change.NewProcessState);
        Assert.Equal(source.Started, target.Started);
        Assert.Equal(source.StartEvent, target.StartEvent);
        Assert.Null(target.Ended);
        ProcessElementInfo targetTask = Assert.IsType<ProcessElementInfo>(target.CurrentTask);
        Assert.NotSame(sourceTask, targetTask);
        Assert.Equal(destination, targetTask.ElementId);
        Assert.Equal(3, targetTask.Flow);
        Assert.Equal(flowType.ToString(), targetTask.FlowType);
        Assert.Null(targetTask.Started);
        if (destination == "Task_2")
        {
            Assert.Equal("Bekreft", targetTask.Name);
            Assert.Equal(AltinnTaskTypes.Confirmation, targetTask.AltinnTaskType);
        }
        var events = Assert.IsType<List<InstanceEvent>>(change.Events);
        Assert.Equal(
            new[] { leaveEvent.ToString(), nameof(InstanceEventType.process_StartTask) },
            events.Select(e => e.EventType)
        );
        Assert.Same(sourceTask, events[0].ProcessInfo.CurrentTask);
        Assert.Same(target, events[1].ProcessInfo);
        Assert.All(
            change.Events,
            e =>
            {
                Assert.Equal(instance.Id, e.InstanceId);
                Assert.Equal(instance.InstanceOwner.PartyId, e.InstanceOwnerPartyId);
                Assert.Null(e.Created);
                Assert.Null(e.User);
            }
        );
    }

    [Fact]
    public async Task Next_PreparesCompletionAndLegacySubmissionWithoutExecutionContext()
    {
        await using var fixture = Fixture.Create();
        Instance instance = CreateTask2Instance();
        instance.Process.Started = _executionTime.AddHours(-1).UtcDateTime;
        ProcessState source = instance.Process;

        ProcessStateChange change = await PrepareProcessNext(fixture, instance);

        ProcessState target = Assert.IsType<ProcessState>(change.NewProcessState);
        Assert.Null(target.CurrentTask);
        Assert.Equal("EndEvent_1", target.EndEvent);
        Assert.Equal(source.Started, target.Started);
        Assert.Equal(source.StartEvent, target.StartEvent);
        Assert.Null(target.Ended);
        var events = Assert.IsType<List<InstanceEvent>>(change.Events);
        Assert.Equal(
            new[]
            {
                nameof(InstanceEventType.process_EndTask),
                nameof(InstanceEventType.process_EndEvent),
                nameof(InstanceEventType.Submited),
            },
            events.Select(e => e.EventType)
        );
        Assert.All(events.Skip(1), e => Assert.Same(target, e.ProcessInfo));
        Assert.All(
            change.Events,
            e =>
            {
                Assert.Null(e.Created);
                Assert.Null(e.User);
            }
        );
    }

    public static TheoryData<Actor, PlatformUser> TransitionActors =>
        new()
        {
            {
                new Actor
                {
                    UserId = 1337,
                    NationalIdentityNumber = "22927774937",
                    AuthenticationLevel = 2,
                },
                new PlatformUser
                {
                    UserId = 1337,
                    NationalIdentityNumber = "22927774937",
                    AuthenticationLevel = 2,
                }
            },
            {
                new Actor { OrgId = "ttd", AuthenticationLevel = 3 },
                new PlatformUser { OrgId = "ttd", AuthenticationLevel = 3 }
            },
            {
                new Actor
                {
                    SystemUserId = Guid.Parse("00000000-0000-0000-0000-000000000001"),
                    SystemUserOwnerOrgNo = "123456789",
                    SystemUserName = "Submission system",
                    AuthenticationLevel = 3,
                },
                new PlatformUser
                {
                    SystemUserId = Guid.Parse("00000000-0000-0000-0000-000000000001"),
                    SystemUserOwnerOrgNo = "123456789",
                    SystemUserName = "Submission system",
                    AuthenticationLevel = 3,
                }
            },
        };

    [Theory]
    [MemberData(nameof(TransitionActors))]
    public void ApplyExecutionContext_MapsTheDurableActor(Actor actor, PlatformUser expected)
    {
        var state = new ProcessState { EndEvent = "EndEvent_1" };
        var instanceEvent = new InstanceEvent
        {
            EventType = nameof(InstanceEventType.process_EndEvent),
            ProcessInfo = state,
        };
        var prepared = new ProcessStateChange { NewProcessState = state, Events = [instanceEvent] };

        ProcessEngine.ApplyExecutionContext(prepared, actor, _executionTime);

        Assert.Equivalent(expected, instanceEvent.User);
    }

    [Fact]
    public async Task Next_WhenTheTransitionCannotBeConstructed_AnswersWithAGenericErrorAndEnqueuesNothing()
    {
        Instance instance = CreateTask1Instance();
        instance.Process.Status = ProcessStatus.Idle;
        ProcessState source = instance.Process;
        string originalProcess = JsonSerializer.Serialize(source);
        await using var fixture = Fixture.Create();
        fixture
            .Mock<IProcessNavigator>()
            .Setup(n => n.GetNextTask(It.IsAny<IInstanceDataAccessor>(), "Task_1", null))
            .ReturnsAsync(new ProcessTask { Id = "MissingTask" });

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
        Assert.Equal("Could not prepare the next process transition.", result.ErrorMessage);
        Assert.DoesNotContain("MissingTask", result.ErrorMessage, StringComparison.Ordinal);
        Assert.Same(source, instance.Process);
        Assert.Equal(originalProcess, JsonSerializer.Serialize(instance.Process));
        fixture.Mock<IWorkflowEngineService>().VerifyNoOtherCalls();
    }

    [Fact]
    public async Task EnqueueProcessNext_PreparesAndTimesTheServiceTaskContinuationWithItsDurableContext()
    {
        await using var fixture = Fixture.Create();
        Instance instance = CreateTask1Instance();
        instance.Process.CurrentTask.Started = _executionTime.AddMinutes(-30).UtcDateTime;
        string originalProcess = JsonSerializer.Serialize(instance.Process);
        var actor = new Actor { OrgId = "ttd", AuthenticationLevel = 3 };
        Guid workflowId = Guid.NewGuid();
        var dataAccessor = Mock.Of<IInstanceDataAccessor>(a => a.Instance == instance);
        fixture
            .Mock<IWorkflowEngineService>()
            .Setup(s =>
                s.EnqueueDependentProcessNext(
                    instance,
                    It.IsAny<ProcessStateChange>(),
                    workflowId,
                    "collection",
                    "state",
                    actor,
                    null,
                    "continuation-key",
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(Guid.NewGuid());

        await fixture.ProcessEngine.EnqueueProcessNext(
            dataAccessor,
            actor,
            workflowId,
            "collection",
            "state",
            _executionTime,
            action: null,
            idempotencyKey: "continuation-key"
        );

        IInvocation enqueue = Assert.Single(fixture.Mock<IWorkflowEngineService>().Invocations);
        ProcessStateChange transition = Assert.IsType<ProcessStateChange>(enqueue.Arguments[1]);
        Assert.Equal(_executionTime.UtcDateTime, transition.NewProcessState?.CurrentTask?.Started);
        Assert.NotNull(transition.Events);
        Assert.All(
            transition.Events,
            e =>
            {
                Assert.Equal(_executionTime.UtcDateTime, e.Created);
                Assert.Equal("ttd", e.User.OrgId);
                Assert.Equal(3, e.User.AuthenticationLevel);
            }
        );
        Assert.Equal(originalProcess, JsonSerializer.Serialize(instance.Process));
    }

    private static async Task<ProcessStateChange> PrepareProcessNext(
        Fixture fixture,
        Instance instance,
        string? action = null
    )
    {
        ProcessState originalProcess = instance.Process;
        string originalState = JsonSerializer.Serialize(originalProcess);
        SetupWorkflowResult(fixture, CreateEndedInstance());
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
        Assert.Same(originalProcess, instance.Process);
        Assert.Equal(originalState, JsonSerializer.Serialize(instance.Process));
        IInvocation enqueue = Assert.Single(fixture.Mock<IWorkflowEngineService>().Invocations);
        return Assert.IsType<ProcessStateChange>(enqueue.Arguments[3]);
    }
}
