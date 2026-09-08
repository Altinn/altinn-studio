using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands;

/// <summary>
/// The pipeline dispatch of <see cref="ExecuteServiceTask"/> for an
/// <see cref="IPipelineServiceTask"/>: resolution by item index — the conclusion's included, since it is an
/// item like any other — stage-result mapping, the plain index-not-found verdict, and the refusal of a
/// payload naming no item at all. The simple dispatch (an <see cref="IServiceTask"/>, whose pipeline is the
/// forwarding default <c>Finally(Execute)</c>) is covered by <see cref="ExecuteServiceTaskTests"/>.
/// </summary>
public class ExecuteServiceTaskStageTests
{
    /// <summary>
    /// A send→poll pipeline whose behavior each test scripts via delegates: the stage at item
    /// index 0 dispatches, and the Finally — item index 1 — awaits the receipt and concludes.
    /// </summary>
    private sealed class ShippingTask : IPipelineServiceTask
    {
        public string Type => "shipping";

        public Func<ServiceTaskContext, Task<ServiceTaskStageResult>> OnSend { get; init; } =
            _ => Task.FromResult(ServiceTaskStageResult.Completed());

        public Func<ServiceTaskContext, Task<ServiceTaskResult>> OnAwait { get; init; } =
            _ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline.Stage(ctx => OnSend(ctx)).Finally(ctx => OnAwait(ctx));
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
                ExecutionReferenceTime = new DateTimeOffset(2025, 3, 14, 9, 26, 53, TimeSpan.Zero),
                State = "{}",
                WorkflowId = Guid.NewGuid(),
                StepId = Guid.NewGuid(),
            },
        };
    }

    private static ExecuteServiceTaskPayload Payload(int? itemIndex) => new("shipping", itemIndex);

    /// <summary>The item index of <see cref="ShippingTask"/>'s conclusion.</summary>
    private const int ConclusionIndex = 1;

    /// <summary>
    /// The stage-result counterpart of
    /// <c>ExecuteServiceTaskTests.Execute_WhenServiceTaskReturnsAnUnrecognisedResultType_…</c>: a type the
    /// mapper does not know must fail permanently and name itself, never be concluded as a silent success and
    /// never ride the outer catch's retry ladder.
    /// </summary>
    /// <remarks>
    /// Self-cleaning: closing the copy-constructor route properly stops <c>base(original)</c> compiling, and
    /// this test disappears with the arm it pins.
    /// </remarks>
    private sealed record RogueStageResult : ServiceTaskStageResult
    {
        public RogueStageResult(ServiceTaskStageResult original)
            : base(original) { }
    }

    [Fact]
    public async Task Stage_WhenItReturnsAnUnrecognisedResultType_FailsPermanentlyAndNamesIt()
    {
        var task = new ShippingTask
        {
            OnSend = _ =>
                Task.FromResult<ServiceTaskStageResult>(new RogueStageResult(ServiceTaskStageResult.Completed())),
        };

        ProcessEngineCommandResult result = await CreateCommand(task).Execute(CreateContext(), Payload(0));

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("ServiceTaskResultUnknown", failed.ExceptionType);
        Assert.Contains(nameof(RogueStageResult), failed.ErrorMessage, StringComparison.Ordinal);
    }

    /// <summary>
    /// A context whose mutator is a real unit of work, for the concluding step that releases
    /// processing ownership — that transition is staged on the unit of work, not on a bare mutator.
    /// </summary>
    private static ProcessEngineCommandContext CreateContextWithUnitOfWork()
    {
        ProcessEngineCommandContext context = CreateContext();
        var dataClient = new Mock<IDataClientWithStorageMetadata>();
        IInstanceMutationClient mutationClient = dataClient.As<IInstanceMutationClient>().Object;
        var unitOfWork = new InstanceDataUnitOfWork(
            context.InstanceDataMutator.Instance,
            new StorageVersionMetadata(InstanceVersion: 12, ProcessStateVersion: 8),
            dataClient.Object,
            mutationClient,
            Mock.Of<IInstanceClientWithStorageMetadata>(),
            new ApplicationMetadata("ttd/test-app") { DataTypes = [] },
            Mock.Of<ITranslationService>(),
            new ModelSerializationService(null!),
            Mock.Of<IAppResources>(),
            Options.Create(new FrontEndSettings()),
            taskId: context.InstanceDataMutator.Instance.Process?.CurrentTask?.ElementId,
            language: null
        );

        return new ProcessEngineCommandContext
        {
            StateCarry = context.StateCarry,
            AppId = context.AppId,
            InstanceId = context.InstanceId,
            InstanceDataMutator = unitOfWork,
            CancellationToken = context.CancellationToken,
            Payload = context.Payload,
        };
    }

    [Fact]
    public async Task Stage_Completed_ReturnsSuccessWithoutAdvance()
    {
        var command = CreateCommand(new ShippingTask());

        var result = await command.Execute(CreateContext(), Payload(0));

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

        var result = await command.Execute(CreateContext(), Payload(0));

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

        var result = await command.Execute(CreateContext(), Payload(0));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.Equal(permanent, failed.NonRetryable);
        Assert.Contains("Service task 'shipping' failed", failed.ErrorMessage);
    }

    [Fact]
    public async Task ConclusionIndex_RunsTheFinally_AndAutoAdvances()
    {
        var command = CreateCommand(new ShippingTask());

        var result = await command.Execute(CreateContext(), Payload(ConclusionIndex));

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

        var result = await command.Execute(CreateContext(), Payload(ConclusionIndex));

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

        // Concluding without advancing releases processing ownership, which is staged on the unit
        // of work — so this step needs a real one rather than a mutator mock.
        var result = await command.Execute(CreateContextWithUnitOfWork(), Payload(ConclusionIndex));

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

        var result = await command.Execute(CreateContext(), Payload(ConclusionIndex));

        var deferred = Assert.IsType<DeferredProcessEngineCommandResult>(result);
        Assert.Equal(TimeSpan.FromMinutes(5), deferred.Delay);
        Assert.Equal("awaiting receipt", deferred.Reason);
    }

    [Fact]
    public async Task StageThrows_ReturnsRetryableFailure()
    {
        var task = new ShippingTask { OnSend = _ => throw new InvalidOperationException("shipping exploded") };
        var command = CreateCommand(task);

        var result = await command.Execute(CreateContext(), Payload(0));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.False(failed.NonRetryable);
        Assert.Equal("shipping exploded", failed.ErrorMessage);
    }

    [Fact]
    public async Task UnknownItemIndex_FailsPermanently_WithThePlainIndexVerdict()
    {
        var command = CreateCommand(new ShippingTask());

        var result = await command.Execute(CreateContext(), Payload(2));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("PipelineItemNotFound", failed.ExceptionType);
        Assert.Contains("no pipeline item at index 2", failed.ErrorMessage, StringComparison.Ordinal);
    }

    [Fact]
    public async Task IndexLessPayload_FailsPermanently_AsAnInvalidPayload()
    {
        var command = CreateCommand(new ShippingTask());

        var result = await command.Execute(CreateContext(), Payload(itemIndex: null));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("InvalidPayloadException", failed.ExceptionType);
        Assert.Contains("names no pipeline item", failed.ErrorMessage, StringComparison.Ordinal);
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
    public async Task ConcludingIndexAgainstSimpleTask_FailsPermanently_AsItemNotFound()
    {
        // Version skew: a workflow enqueued when the task composed a stage — so its conclusion sat at item
        // index 1 — calling back into an app version where the task is a simple IServiceTask, whose whole
        // pipeline is the conclusion at index 0.
        var simple = new SimpleTask();
        var command = CreateCommand(simple);

        var result = await command.Execute(CreateContext(), Payload(ConclusionIndex));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("PipelineItemNotFound", failed.ExceptionType);
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

        var result = await command.Execute(CreateContext(), Payload(0));

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

        await command.Execute(context, Payload(0));

        Assert.NotNull(observed);
        Assert.Equal(context.Payload.WorkflowId, observed.WorkflowId);
        Assert.Equal(context.Payload.StepId, observed.StepId);
        Assert.Same(context.InstanceDataMutator, observed.InstanceDataMutator);
    }

    [Fact]
    public async Task ItemIndexPointingAtAReplyHandler_WithNoRendezvous_FailsAsReceiptMissing()
    {
        var task = new ReplyFirstTask();
        var command = CreateCommand(task);

        var result = await command.Execute(CreateContext(), Payload(1));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxReceiptMissing", failed.ExceptionType);
    }

    /// <summary>
    /// A pipeline whose item 1 is a reply handler rather than a stage — the earliest position a handler
    /// can occupy, since it names a stage composed before it.
    /// </summary>
    private sealed class ReplyFirstTask : IPipelineServiceTask
    {
        public string Type => "shipping";

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage(
                    (_, _) => Task.FromResult(ServiceTaskOpeningStageResult.Completed()),
                    new MailboxOptions { Timeout = TimeSpan.FromDays(1) },
                    out MailboxHandle handle
                )
                .HandleReplies(
                    handle,
                    (_, _) =>
                        Task.FromResult<ServiceTaskStageExchangeResult>(
                            ServiceTaskStageExchangeResult.AwaitNextReply()
                        ),
                    (_, _) => Task.FromResult(ServiceTaskStageResult.Completed())
                )
                .Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()));
    }
}
