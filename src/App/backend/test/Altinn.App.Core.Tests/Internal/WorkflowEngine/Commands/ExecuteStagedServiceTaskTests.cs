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
/// The staged (multi-step) dispatch of <see cref="ExecuteServiceTask"/>: step resolution by name
/// across the work steps and the final step, per-kind result mapping, and the version-skew guards.
/// The single-step dispatch is covered by <see cref="ExecuteServiceTaskTests"/>.
/// </summary>
public class ExecuteStagedServiceTaskTests
{
    /// <summary>
    /// A send→poll pipeline whose behavior each test scripts via delegates. The steps are nested
    /// classes, so the default step names are "SendShipment" and "AwaitReceipt" — dispatching on
    /// those names is itself part of what these tests prove.
    /// </summary>
    private sealed class ShippingTask : IStagedServiceTask
    {
        public string Type => "shipping";

        public Func<ServiceTaskContext, Task<ServiceTaskStepResult>> OnSend { get; init; } =
            _ => Task.FromResult(ServiceTaskStepResult.Next());

        public Func<ServiceTaskContext, Task<ServiceTaskResult>> OnAwait { get; init; } =
            _ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());

        public IEnumerable<IServiceTaskStep> Steps => [new SendShipment(this)];

        public IFinalServiceTaskStep FinalStep => new AwaitReceipt(this);

        private sealed class SendShipment(ShippingTask owner) : IServiceTaskStep
        {
            public Task<ServiceTaskStepResult> Execute(ServiceTaskContext context) => owner.OnSend(context);
        }

        private sealed class AwaitReceipt(ShippingTask owner) : IFinalServiceTaskStep
        {
            public Task<ServiceTaskResult> Execute(ServiceTaskContext context) => owner.OnAwait(context);
        }
    }

    private static ExecuteServiceTask CreateCommand(IServiceTaskBase serviceTask)
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        switch (serviceTask)
        {
            case IStagedServiceTask staged:
                services.AddSingleton(staged);
                break;
            case IServiceTask simple:
                services.AddSingleton(simple);
                break;
        }
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
    public async Task WorkStep_Next_ReturnsSuccessWithoutAdvance()
    {
        var command = CreateCommand(new ShippingTask());

        var result = await command.Execute(CreateContext(), Payload("SendShipment"));

        var success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.False(success.AutoAdvanceProcess);
    }

    [Fact]
    public async Task WorkStep_Defer_ReturnsDeferredResult()
    {
        // Any step may await an async dependency — deferral is not reserved for the final step.
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
    public async Task WorkStep_Failure_MapsKind(bool permanent)
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
    public async Task FinalStep_Success_AutoAdvances()
    {
        var command = CreateCommand(new ShippingTask());

        var result = await command.Execute(CreateContext(), Payload("AwaitReceipt"));

        var success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.True(success.AutoAdvanceProcess);
        Assert.Null(success.AutoAdvanceAction);
    }

    [Fact]
    public async Task FinalStep_SuccessWithAction_CarriesTheAction()
    {
        var task = new ShippingTask
        {
            OnAwait = _ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success("reject")),
        };
        var command = CreateCommand(task);

        var result = await command.Execute(CreateContext(), Payload("AwaitReceipt"));

        var success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.True(success.AutoAdvanceProcess);
        Assert.Equal("reject", success.AutoAdvanceAction);
    }

    [Fact]
    public async Task FinalStep_SuccessWithoutAutoAdvance_DoesNotAdvance()
    {
        var task = new ShippingTask
        {
            OnAwait = _ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.SuccessWithoutAutoAdvance()),
        };
        var command = CreateCommand(task);

        var result = await command.Execute(CreateContext(), Payload("AwaitReceipt"));

        var success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.False(success.AutoAdvanceProcess);
    }

    [Fact]
    public async Task FinalStep_Defer_ReturnsDeferredResult()
    {
        // The final step is where a polling pipeline waits.
        var task = new ShippingTask
        {
            OnAwait = _ =>
                Task.FromResult<ServiceTaskResult>(
                    ServiceTaskResult.Defer(TimeSpan.FromMinutes(5), "awaiting receipt")
                ),
        };
        var command = CreateCommand(task);

        var result = await command.Execute(CreateContext(), Payload("AwaitReceipt"));

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
    public async Task StagedTaskWithoutStepName_FailsPermanently_AsKindMismatch()
    {
        var command = CreateCommand(new ShippingTask());

        var result = await command.Execute(CreateContext(), Payload(null));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("ServiceTaskKindMismatch", failed.ExceptionType);
    }

    [Fact]
    public async Task SimpleTaskWithStepName_FailsPermanently_AsKindMismatch()
    {
        var simple = new Mock<IServiceTask>();
        simple.Setup(x => x.Type).Returns("shipping");
        var command = CreateCommand(simple.Object);

        var result = await command.Execute(CreateContext(), Payload("SendShipment"));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("ServiceTaskKindMismatch", failed.ExceptionType);
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

    private sealed class PinnedNameTask : IStagedServiceTask
    {
        public string Type => "shipping";

        public IEnumerable<IServiceTaskStep> Steps => [new Entry()];

        public IFinalServiceTaskStep FinalStep => new Done();

        private sealed class Entry : IServiceTaskStep
        {
            // The rename escape hatch: the class was (hypothetically) renamed, the wire name pinned.
            public string Name => "legacySend";

            public Task<ServiceTaskStepResult> Execute(ServiceTaskContext context) =>
                Task.FromResult(ServiceTaskStepResult.Next());
        }

        private sealed class Done : IFinalServiceTaskStep
        {
            public Task<ServiceTaskResult> Execute(ServiceTaskContext context) =>
                Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());
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
