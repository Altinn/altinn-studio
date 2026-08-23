using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands;

/// <summary>
/// The pipeline dispatch of <see cref="ExecuteServiceTask"/> for an
/// <see cref="IPipelineServiceTask"/>: resolution by stage name, stage-result mapping, the null
/// stage name routing to the pipeline's Finally, and the rename version-skew guard. The simple
/// dispatch (an <see cref="IServiceTask"/>, whose pipeline is the forwarding default
/// <c>Finally(Execute)</c>) is covered by <see cref="ExecuteServiceTaskTests"/>.
/// </summary>
public class ExecuteServiceTaskStageTests
{
    /// <summary>
    /// A send→poll pipeline whose behavior each test scripts via delegates: the "SendShipment"
    /// stage dispatches, and the Finally awaits the receipt and concludes.
    /// </summary>
    private sealed class ShippingTask : IPipelineServiceTask
    {
        public string Type => "shipping";

        public Func<ServiceTaskContext, Task<ServiceTaskStageResult>> OnSend { get; init; } =
            _ => Task.FromResult(ServiceTaskStageResult.Completed());

        public Func<ServiceTaskContext, Task<ServiceTaskResult>> OnAwait { get; init; } =
            _ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline.Stage("SendShipment", ctx => OnSend(ctx)).Finally(ctx => OnAwait(ctx));
    }

    private static ExecuteServiceTask CreateCommand(IPipelineServiceTask serviceTask)
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        services.AddSingleton(serviceTask);
        var sp = services.BuildServiceProvider();

        return new ExecuteServiceTask(
            sp.GetRequiredService<AppImplementationFactory>(),
            // Never consulted: these pipelines declare no mailbox, so the delivery envelope is never
            // reached.
            TestMailboxDeliveryEnvelope.Create()
        );
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
            StateCarry = new(),
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, Guid.NewGuid()),
            InstanceDataMutator = mutatorMock.Object,
            CancellationToken = CancellationToken.None,
            Payload = new AppCallbackPayload
            {
                CommandKey = ExecuteServiceTask.Key,
                Actor = new Actor { UserId = 1337 },
                LockToken = Guid.NewGuid().ToString(),
                ExecutionReferenceTime = new DateTimeOffset(2025, 3, 14, 9, 26, 53, TimeSpan.Zero),
                State = "{}",
                WorkflowId = Guid.NewGuid(),
                StepId = Guid.NewGuid(),
            },
        };
    }

    private static ExecuteServiceTaskPayload Payload(string? stageName) => new("shipping", stageName);

    [Fact]
    public async Task Stage_Completed_ReturnsSuccessWithoutAdvance()
    {
        var command = CreateCommand(new ShippingTask());

        var result = await command.Execute(CreateContext(), Payload("SendShipment"));

        var success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.False(success.AutoAdvanceProcess);
    }

    [Fact]
    public async Task Stage_Defer_ReturnsDeferredResult()
    {
        // Any stage may await an async dependency — deferral is not reserved for the conclusion.
        var task = new ShippingTask
        {
            OnSend = _ => Task.FromResult(ServiceTaskStageResult.Defer(TimeSpan.FromSeconds(30), "queue is saturated")),
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
    public async Task Stage_Failure_MapsKind(bool permanent)
    {
        var task = new ShippingTask
        {
            OnSend = _ =>
                Task.FromResult(
                    permanent
                        ? ServiceTaskStageResult.FailedPermanent("shipment rejected")
                        : ServiceTaskStageResult.FailedRetryable("shipment service timed out")
                ),
        };
        var command = CreateCommand(task);

        var result = await command.Execute(CreateContext(), Payload("SendShipment"));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.Equal(permanent, failed.NonRetryable);
        Assert.Contains("Service task 'shipping' failed", failed.ErrorMessage);
    }

    [Fact]
    public async Task NullStageName_RunsTheFinally_AndAutoAdvances()
    {
        // The concluding engine step carries no stage name — it is the pipeline's Finally, the
        // only step that can conclude the task, and it runs after every stage has completed.
        var command = CreateCommand(new ShippingTask());

        var result = await command.Execute(CreateContext(), Payload(null));

        var success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.True(success.AutoAdvanceProcess);
        Assert.Null(success.AutoAdvanceAction);
    }

    [Fact]
    public async Task Finally_SuccessWithAction_CarriesTheAction()
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
    public async Task Finally_SuccessWithoutAutoAdvance_DoesNotAdvance()
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
    public async Task Finally_Defer_ReturnsDeferredResult()
    {
        // The Finally is where a send-then-poll pipeline waits.
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
    public async Task StageThrows_ReturnsRetryableFailure()
    {
        var task = new ShippingTask { OnSend = _ => throw new InvalidOperationException("shipping exploded") };
        var command = CreateCommand(task);

        var result = await command.Execute(CreateContext(), Payload("SendShipment"));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.False(failed.NonRetryable);
        Assert.Equal("shipping exploded", failed.ErrorMessage);
    }

    [Fact]
    public async Task UnknownStageName_FailsPermanently_PointingAtTheRenameHazard()
    {
        var command = CreateCommand(new ShippingTask());

        var result = await command.Execute(CreateContext(), Payload("OldStageName"));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("ServiceTaskStageNotFound", failed.ExceptionType);
        Assert.Contains("no stage named 'OldStageName'", failed.ErrorMessage);
        Assert.Contains("renamed", failed.ErrorMessage);
    }

    [Fact]
    public async Task StageNameIsCaseSensitive_UnlikeTaskTypeResolution()
    {
        // Task types match the BPMN attribute ignoring case; stage names are exact — they are our
        // own wire values, produced from the same Define that dispatches them.
        var command = CreateCommand(new ShippingTask());

        var result = await command.Execute(CreateContext(), Payload("sendshipment"));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Contains("no stage named 'sendshipment'", failed.ErrorMessage);
    }

    private sealed class SimpleTask : IServiceTask
    {
        public bool Executed { get; private set; }

        public string Type => "shipping";

        public Task<ServiceTaskResult> Execute(ServiceTaskContext context)
        {
            Executed = true;
            return Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());
        }
    }

    [Fact]
    public async Task StageNameAgainstSimpleTask_FailsPermanently_AsStageNotFound()
    {
        // Version skew: a workflow enqueued when the task composed this stage, calling back into
        // an app version where the task is a simple IServiceTask (pipeline = just the Finally).
        var simple = new SimpleTask();
        var command = CreateCommand(simple);

        var result = await command.Execute(CreateContext(), Payload("SendShipment"));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("ServiceTaskStageNotFound", failed.ExceptionType);
        Assert.False(simple.Executed);
    }

    [Fact]
    public async Task MockedTaskWhoseDefineReturnsNull_FailsRetryably_WithALegibleMessage()
    {
        // Moq bypasses interface defaults: an unstubbed mock returns null from Define. The
        // dispatch must fail legibly rather than NullReference — the same guard covers a broken
        // real implementation.
        var mock = new Mock<IServiceTask>();
        mock.Setup(x => x.Type).Returns("shipping");
        var command = CreateCommand(mock.Object);

        var result = await command.Execute(CreateContext(), Payload(null));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.False(failed.NonRetryable);
        Assert.Contains("Define returned null", failed.ErrorMessage);
        mock.Verify(x => x.Execute(It.IsAny<ServiceTaskContext>()), Times.Never);
    }

    [Fact]
    public async Task StageContext_CarriesTheEngineIdentityAndClocks()
    {
        ServiceTaskContext? observed = null;
        var task = new ShippingTask
        {
            OnSend = ctx =>
            {
                observed = ctx;
                return Task.FromResult(ServiceTaskStageResult.Completed());
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

    private sealed class RenamedMethodTask : IPipelineServiceTask
    {
        public string Type => "shipping";

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) => // The wire identity is the literal, not the method: renaming SendViaNewClient (from,
            // say, SendShipment) is refactor-safe because "legacySend" stays put.
            pipeline
                .Stage("legacySend", SendViaNewClient)
                .Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()));

        private Task<ServiceTaskStageResult> SendViaNewClient(ServiceTaskContext context) =>
            Task.FromResult(ServiceTaskStageResult.Completed());
    }

    [Fact]
    public async Task StageNameIsTheLiteral_NotTheMethodName()
    {
        var command = CreateCommand(new RenamedMethodTask());

        var byLiteral = await command.Execute(CreateContext(), Payload("legacySend"));
        Assert.IsType<SuccessfulProcessEngineCommandResult>(byLiteral);

        var byMethodName = await command.Execute(CreateContext(), Payload("SendViaNewClient"));
        var failed = Assert.IsType<FailedProcessEngineCommandResult>(byMethodName);
        Assert.Contains("no stage named 'SendViaNewClient'", failed.ErrorMessage);
    }
}
