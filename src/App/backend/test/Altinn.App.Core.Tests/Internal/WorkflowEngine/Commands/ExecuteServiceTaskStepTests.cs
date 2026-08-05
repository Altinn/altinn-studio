using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands;

/// <summary>
/// The step dispatch of <see cref="ExecuteServiceTask"/> for a task with declared
/// <see cref="IServiceTask.Steps"/>: resolution by step name, step-result mapping, the null step
/// name routing to the task's own Execute, and the rename version-skew guard. The plain concluding
/// dispatch (a task without declared steps) is covered by <see cref="ExecuteServiceTaskTests"/>.
/// </summary>
public class ExecuteServiceTaskStepTests
{
    /// <summary>
    /// A send→poll task whose behavior each test scripts via delegates: <c>SendShipment</c> is a
    /// declared step (its default name — the nested class's name — is itself part of what these
    /// tests prove), and the task's own <c>Execute</c> awaits the receipt and concludes.
    /// </summary>
    private sealed class ShippingTask : IServiceTask
    {
        public string Type => "shipping";

        public Func<ServiceTaskContext, Task<ServiceTaskStepResult>> OnSend { get; init; } =
            _ => Task.FromResult(ServiceTaskStepResult.Next());

        public Func<ServiceTaskContext, Task<ServiceTaskResult>> OnAwait { get; init; } =
            _ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());

        public IEnumerable<IServiceTaskStep> Steps => [new SendShipment(this)];

        public Task<ServiceTaskResult> Execute(ServiceTaskContext context) => OnAwait(context);

        private sealed class SendShipment(ShippingTask owner) : IServiceTaskStep
        {
            public Task<ServiceTaskStepResult> Execute(ServiceTaskContext context) => owner.OnSend(context);
        }
    }

    private static ExecuteServiceTask CreateCommand(IServiceTask serviceTask)
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        services.AddSingleton(serviceTask);
        var sp = services.BuildServiceProvider();

        return new ExecuteServiceTask(sp.GetRequiredService<AppImplementationFactory>());
    }

    private static ProcessEngineCommandContext CreateContext()
    {
        var instance = new Instance
        {
            Id = "1337/2b3e9260-24d9-4c0a-8b93-ef2c9c7dcbde",
            Org = "ttd",
            AppId = "ttd/test-app",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
        };
        var mutatorMock = new Mock<IInstanceDataMutator>();
        mutatorMock.Setup(x => x.Instance).Returns(instance);

        return new ProcessEngineCommandContext
        {
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, Guid.NewGuid()),
            InstanceDataMutator = mutatorMock.Object,
            CancellationToken = CancellationToken.None,
            Payload = new AppCallbackPayload
            {
                CommandKey = ExecuteServiceTask.Key,
                Actor = new Actor { UserId = 1337 },
                LockToken = Guid.NewGuid().ToString(),
                State = "{}",
                WorkflowId = Guid.NewGuid(),
                StepId = Guid.NewGuid(),
            },
        };
    }

    private static ExecuteServiceTaskPayload Payload(string? stepName) => new("shipping", stepName);

    [Fact]
    public async Task Step_Next_ReturnsSuccessWithoutAdvance()
    {
        var command = CreateCommand(new ShippingTask());

        var result = await command.Execute(CreateContext(), Payload("SendShipment"));

        var success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.False(success.AutoAdvanceProcess);
    }

    [Fact]
    public async Task Step_Defer_ReturnsDeferredResult()
    {
        // Any step may await an async dependency — deferral is not reserved for the conclusion.
        var task = new ShippingTask
        {
            OnSend = _ => Task.FromResult(ServiceTaskStepResult.Defer(TimeSpan.FromSeconds(30), "queue is saturated")),
        };
        var command = CreateCommand(task);

        var result = await command.Execute(CreateContext(), Payload("SendShipment"));

        var deferred = Assert.IsType<DeferredProcessEngineCommandResult>(result);
        Assert.Equal(TimeSpan.FromSeconds(30), deferred.Delay);
        Assert.Equal("queue is saturated", deferred.Reason);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Step_Failure_MapsKind(bool permanent)
    {
        var task = new ShippingTask
        {
            OnSend = _ =>
                Task.FromResult(
                    permanent
                        ? ServiceTaskStepResult.FailedPermanent("shipment rejected")
                        : ServiceTaskStepResult.FailedRetryable("shipment service timed out")
                ),
        };
        var command = CreateCommand(task);

        var result = await command.Execute(CreateContext(), Payload("SendShipment"));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.Equal(permanent, failed.NonRetryable);
        Assert.Contains("Service task 'shipping' failed", failed.ErrorMessage);
    }

    [Fact]
    public async Task NullStepName_RunsTheTasksOwnExecute_AndAutoAdvances()
    {
        // The concluding engine step carries no step name — it is the task's own Execute, the
        // only step that can conclude the task, and a task with declared steps runs it last.
        var command = CreateCommand(new ShippingTask());

        var result = await command.Execute(CreateContext(), Payload(null));

        var success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.True(success.AutoAdvanceProcess);
        Assert.Null(success.AutoAdvanceAction);
    }

    [Fact]
    public async Task Conclusion_SuccessWithAction_CarriesTheAction()
    {
        var task = new ShippingTask
        {
            OnAwait = _ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success("reject")),
        };
        var command = CreateCommand(task);

        var result = await command.Execute(CreateContext(), Payload(null));

        var success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.True(success.AutoAdvanceProcess);
        Assert.Equal("reject", success.AutoAdvanceAction);
    }

    [Fact]
    public async Task Conclusion_SuccessWithoutAutoAdvance_DoesNotAdvance()
    {
        var task = new ShippingTask
        {
            OnAwait = _ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.SuccessWithoutAutoAdvance()),
        };
        var command = CreateCommand(task);

        var result = await command.Execute(CreateContext(), Payload(null));

        var success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.False(success.AutoAdvanceProcess);
    }

    [Fact]
    public async Task Conclusion_Defer_ReturnsDeferredResult()
    {
        // The task's own Execute is where a send-then-poll task waits.
        var task = new ShippingTask
        {
            OnAwait = _ =>
                Task.FromResult<ServiceTaskResult>(
                    ServiceTaskResult.Defer(TimeSpan.FromMinutes(5), "awaiting receipt")
                ),
        };
        var command = CreateCommand(task);

        var result = await command.Execute(CreateContext(), Payload(null));

        var deferred = Assert.IsType<DeferredProcessEngineCommandResult>(result);
        Assert.Equal(TimeSpan.FromMinutes(5), deferred.Delay);
        Assert.Equal("awaiting receipt", deferred.Reason);
    }

    [Fact]
    public async Task StepThrows_ReturnsRetryableFailure()
    {
        var task = new ShippingTask { OnSend = _ => throw new InvalidOperationException("shipping exploded") };
        var command = CreateCommand(task);

        var result = await command.Execute(CreateContext(), Payload("SendShipment"));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.False(failed.NonRetryable);
        Assert.Equal("shipping exploded", failed.ErrorMessage);
    }

    [Fact]
    public async Task UnknownStepName_FailsPermanently_PointingAtTheRenameHazard()
    {
        var command = CreateCommand(new ShippingTask());

        var result = await command.Execute(CreateContext(), Payload("OldStepName"));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("ServiceTaskStepNotFound", failed.ExceptionType);
        Assert.Contains("no step named 'OldStepName'", failed.ErrorMessage);
        Assert.Contains("renamed", failed.ErrorMessage);
    }

    [Fact]
    public async Task StepNameIsCaseSensitive_UnlikeTaskTypeResolution()
    {
        // Task types match the BPMN attribute ignoring case; step names are exact — they are our
        // own wire values, produced from the same property that dispatches them.
        var command = CreateCommand(new ShippingTask());

        var result = await command.Execute(CreateContext(), Payload("sendshipment"));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Contains("no step named 'sendshipment'", failed.ErrorMessage);
    }

    [Fact]
    public async Task StepNameAgainstTaskWithoutSteps_FailsPermanently_AndToleratesANullStepsMock()
    {
        // Version skew: a workflow enqueued when the task declared this step, calling back into an
        // app version where it no longer does. Doubles as the Moq gotcha on purpose: an unstubbed
        // mock bypasses the interface default and returns null from Steps — the dispatch must
        // treat that as "no steps", not throw.
        var simple = new Mock<IServiceTask>();
        simple.Setup(x => x.Type).Returns("shipping");
        var command = CreateCommand(simple.Object);

        var result = await command.Execute(CreateContext(), Payload("SendShipment"));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("ServiceTaskStepNotFound", failed.ExceptionType);
        simple.Verify(x => x.Execute(It.IsAny<ServiceTaskContext>()), Times.Never);
    }

    [Fact]
    public async Task StepContext_CarriesTheEngineIdentityAndClocks()
    {
        ServiceTaskContext? observed = null;
        var task = new ShippingTask
        {
            OnSend = ctx =>
            {
                observed = ctx;
                return Task.FromResult(ServiceTaskStepResult.Next());
            },
        };
        var command = CreateCommand(task);
        var context = CreateContext();

        await command.Execute(context, Payload("SendShipment"));

        Assert.NotNull(observed);
        Assert.Equal(context.Payload.WorkflowId, observed.WorkflowId);
        Assert.Equal(context.Payload.StepId, observed.StepId);
        Assert.Same(context.InstanceDataMutator, observed.InstanceDataMutator);
    }

    private sealed class PinnedNameTask : IServiceTask
    {
        public string Type => "shipping";

        public IEnumerable<IServiceTaskStep> Steps => [new Entry()];

        public Task<ServiceTaskResult> Execute(ServiceTaskContext context) =>
            Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());

        private sealed class Entry : IServiceTaskStep
        {
            // The rename escape hatch: the class was (hypothetically) renamed, the wire name pinned.
            public string Name => "legacySend";

            public Task<ServiceTaskStepResult> Execute(ServiceTaskContext context) =>
                Task.FromResult(ServiceTaskStepResult.Next());
        }
    }

    [Fact]
    public async Task PinnedStepName_OverridesTheClassNameDefault()
    {
        var command = CreateCommand(new PinnedNameTask());

        var pinned = await command.Execute(CreateContext(), Payload("legacySend"));
        Assert.IsType<SuccessfulProcessEngineCommandResult>(pinned);

        var byClassName = await command.Execute(CreateContext(), Payload("Entry"));
        var failed = Assert.IsType<FailedProcessEngineCommandResult>(byClassName);
        Assert.Contains("no step named 'Entry'", failed.ErrorMessage);
    }
}
