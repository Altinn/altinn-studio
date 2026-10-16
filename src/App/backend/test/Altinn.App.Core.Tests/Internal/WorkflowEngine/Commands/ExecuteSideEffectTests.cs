using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands;

/// <summary>
/// <see cref="ExecuteSideEffect"/>: one item of a side effect's pipeline per step, mapped the way a service
/// task's items are, except that a side effect never moves the process, cannot change instance data, and
/// cannot open a mailbox yet.
/// </summary>
public class ExecuteSideEffectTests
{
    private const string Name = "shipping";

    /// <summary>A send→check side effect whose behaviour each test scripts: the send at 0, the check at 1.</summary>
    private sealed class ShippingSideEffect : ISideEffect
    {
        public string Name => ExecuteSideEffectTests.Name;

        public Func<ServiceTaskContext, Task<ServiceTaskStageResult>> OnSend { get; init; } =
            _ => Task.FromResult(ServiceTaskStageResult.Completed());

        public Func<ServiceTaskContext, Task<ServiceTaskResult>> OnCheck { get; init; } =
            _ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline.Stage(ctx => OnSend(ctx)).Finally(ctx => OnCheck(ctx));
    }

    /// <summary>A send→receive side effect: the stage at 0 opens a mailbox, the terminal at 1 answers it.</summary>
    private sealed class MailboxSideEffect : ISideEffect
    {
        public string Name => ExecuteSideEffectTests.Name;

        public ServiceTaskMailbox? Opened { get; private set; }

        public Func<ServiceTaskReply, ServiceTaskExchangeResult> OnMessage { get; init; } =
            _ => ServiceTaskResult.Success();

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage(
                    (_, mailbox) =>
                    {
                        Opened = mailbox;
                        return Task.FromResult(ServiceTaskOpeningStageResult.Completed());
                    },
                    new MailboxOptions { Timeout = TimeSpan.FromDays(1) },
                    out MailboxHandle handle
                )
                .ConcludeOnReplies(
                    handle,
                    (_, reply) => Task.FromResult(OnMessage(reply)),
                    (_, _) => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success())
                );
    }

    private static readonly Guid _mailboxId = new("018f4e00-0000-7000-8000-0000000000aa");

    private static readonly MailboxDeliveryEnvelope _envelope = TestMailboxDeliveryEnvelope.Create();

    private static AppCallbackMailbox Delivered(string ownerKey) =>
        new()
        {
            Id = _mailboxId,
            Seq = 0,
            Delivery = new AppCallbackMailboxDelivery
            {
                IdempotencyKey = "receipt-1",
                Payload = _envelope.Wrap("<receipt>ok</receipt>", _mailboxId, ownerKey, "receipt-1"),
                AcceptedAt = new DateTimeOffset(2026, 8, 19, 9, 30, 0, TimeSpan.Zero),
            },
        };

    private static ProcessEngineCommandContext WithMailbox(
        ProcessEngineCommandContext context,
        AppCallbackMailbox mailbox
    ) => context with { Payload = context.Payload with { Mailbox = mailbox } };

    private static ExecuteSideEffect CreateCommand(params ISideEffect[] sideEffects)
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        foreach (ISideEffect sideEffect in sideEffects)
        {
            services.AddSingleton(sideEffect);
        }

        return new ExecuteSideEffect(
            services.BuildServiceProvider().GetRequiredService<AppImplementationFactory>(),
            _envelope
        );
    }

    private static Instance CreateInstance() =>
        new()
        {
            Id = "1337/2b3e9260-24d9-4c0a-8b93-ef2c9c7dcbde",
            Org = "ttd",
            AppId = "ttd/test-app",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
            Data = [],
        };

    private static ProcessEngineCommandContext CreateContext(
        WorkflowCallbackStateCarry? carry = null,
        IInstanceDataMutator? mutator = null,
        bool isFinalWaitCheck = false
    )
    {
        if (mutator is null)
        {
            var mutatorMock = new Mock<IInstanceDataMutator>();
            mutatorMock.Setup(x => x.Instance).Returns(CreateInstance());
            mutator = mutatorMock.Object;
        }

        return new ProcessEngineCommandContext
        {
            StateCarry = carry ?? new(),
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, Guid.NewGuid()),
            InstanceDataMutator = mutator,
            CancellationToken = CancellationToken.None,
            Payload = new AppCallbackPayload
            {
                CommandKey = ExecuteSideEffect.Key,
                Actor = new Actor { UserId = 1337 },
                ExecutionReferenceTime = new DateTimeOffset(2025, 3, 14, 9, 26, 53, TimeSpan.Zero),
                State = "{}",
                WorkflowId = Guid.NewGuid(),
                StepId = Guid.NewGuid(),
                IsFinalWaitCheck = isFinalWaitCheck,
            },
        };
    }

    private static ExecuteSideEffectPayload Payload(int? itemIndex, string? input = null) =>
        new(Name, itemIndex, input);

    private static string ValuesKey => WorkflowCallbackStateCarry.SideEffectValuesKey(Name);

    [Fact]
    public async Task Stage_Completed_SucceedsWithoutMovingTheProcess()
    {
        ProcessEngineCommandResult result = await CreateCommand(new ShippingSideEffect())
            .Execute(CreateContext(), Payload(0));

        var success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.Null(success.ProcessNextContinuation);
        Assert.Null(success.MailboxContinuation);
    }

    [Fact]
    public async Task Conclusion_Success_EndsTheWorkflowWithoutMovingTheProcess()
    {
        ProcessEngineCommandResult result = await CreateCommand(new ShippingSideEffect())
            .Execute(CreateContext(), Payload(1));

        var success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.Null(success.ProcessNextContinuation);
    }

    [Fact]
    public async Task Conclusion_SuccessWithAnAction_FailsPermanently()
    {
        var sideEffect = new ShippingSideEffect
        {
            OnCheck = _ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success("reject")),
        };

        ProcessEngineCommandResult result = await CreateCommand(sideEffect).Execute(CreateContext(), Payload(1));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("SideEffectActionUnsupported", failed.ExceptionType);
        Assert.Contains("'reject'", failed.ErrorMessage, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Conclusion_Defer_ParksTheStepWithItsReason()
    {
        var sideEffect = new ShippingSideEffect
        {
            OnCheck = _ =>
                Task.FromResult<ServiceTaskResult>(
                    ServiceTaskResult.Defer(TimeSpan.FromMinutes(5), "Waiting for delivery")
                ),
        };

        ProcessEngineCommandResult result = await CreateCommand(sideEffect).Execute(CreateContext(), Payload(1));

        var deferred = Assert.IsType<DeferredProcessEngineCommandResult>(result);
        Assert.Equal(TimeSpan.FromMinutes(5), deferred.Delay);
        Assert.Equal("Waiting for delivery", deferred.Reason);
    }

    [Fact]
    public async Task Conclusion_SeesTheWaitClock()
    {
        bool? isFinalCheck = null;
        var sideEffect = new ShippingSideEffect
        {
            OnCheck = context =>
            {
                isFinalCheck = context.Wait.IsFinalCheck;
                return Task.FromResult<ServiceTaskResult>(ServiceTaskResult.FailedPermanent("Never delivered"));
            },
        };

        await CreateCommand(sideEffect).Execute(CreateContext(isFinalWaitCheck: true), Payload(1));

        Assert.True(isFinalCheck);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Stage_Failure_IsReportedAsTheSideEffectsOwn(bool permanent)
    {
        var sideEffect = new ShippingSideEffect
        {
            OnSend = _ =>
                Task.FromResult(
                    permanent
                        ? ServiceTaskStageResult.FailedPermanent("Rejected")
                        : ServiceTaskStageResult.FailedRetryable("Busy")
                ),
        };

        ProcessEngineCommandResult result = await CreateCommand(sideEffect).Execute(CreateContext(), Payload(0));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.Equal(permanent, failed.NonRetryable);
        Assert.Equal(ExecuteSideEffect.FailedReasonCode, failed.ExceptionType);
        Assert.StartsWith($"Side effect '{Name}' failed: ", failed.ErrorMessage, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Stage_Throwing_IsRetried()
    {
        var sideEffect = new ShippingSideEffect { OnSend = _ => throw new HttpRequestException("Down") };

        ProcessEngineCommandResult result = await CreateCommand(sideEffect).Execute(CreateContext(), Payload(0));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.False(failed.NonRetryable);
        Assert.Equal(nameof(HttpRequestException), failed.ExceptionType);
    }

    private sealed record Recipient(string To, int Attempt);

    [Fact]
    public async Task Execute_TheInputItWasStartedWith_IsReadBack()
    {
        Recipient? seen = null;
        var sideEffect = new ShippingSideEffect
        {
            OnSend = context =>
            {
                seen = context.GetInput<Recipient>();
                return Task.FromResult(ServiceTaskStageResult.Completed());
            },
        };

        await CreateCommand(sideEffect)
            .Execute(CreateContext(), Payload(0, input: SideEffectInput.Serialize(new Recipient("owner", 2))));

        Assert.Equal(new Recipient("owner", 2), seen);
    }

    [Fact]
    public async Task Stage_RecordedValues_TravelToTheConclusionInTheCarry()
    {
        var carry = new WorkflowCallbackStateCarry();
        var sideEffect = new ShippingSideEffect
        {
            OnSend = context =>
            {
                context.Values.Set("shipmentId", "42");
                return Task.FromResult(ServiceTaskStageResult.Completed());
            },
            OnCheck = context =>
                Task.FromResult<ServiceTaskResult>(
                    context.Values.Get("shipmentId") == "42"
                        ? ServiceTaskResult.Success()
                        : ServiceTaskResult.FailedPermanent("The send stage's value did not arrive")
                ),
        };
        ExecuteSideEffect command = CreateCommand(sideEffect);

        Assert.IsType<SuccessfulProcessEngineCommandResult>(await command.Execute(CreateContext(carry), Payload(0)));
        Assert.Equal("42", carry.FindValues(ValuesKey)?["shipmentId"]);

        Assert.IsType<SuccessfulProcessEngineCommandResult>(await command.Execute(CreateContext(carry), Payload(1)));
    }

    [Fact]
    public async Task Stage_RecordingValuesAndDeferring_FailsPermanently()
    {
        var carry = new WorkflowCallbackStateCarry();
        var sideEffect = new ShippingSideEffect
        {
            OnSend = context =>
            {
                context.Values.Set("shipmentId", "42");
                return Task.FromResult(ServiceTaskStageResult.Defer(TimeSpan.FromMinutes(1)));
            },
        };

        ProcessEngineCommandResult result = await CreateCommand(sideEffect).Execute(CreateContext(carry), Payload(0));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("PipelineValuesRecordedOnDeferral", failed.ExceptionType);
        Assert.Null(carry.FindValues(ValuesKey));
    }

    /// <summary>
    /// The first item starts with nothing, whatever the carry holds: nothing an earlier run of the same side
    /// effect left behind reaches a new one.
    /// </summary>
    [Fact]
    public async Task FirstItem_StartsWithNoValues_AndDropsStaleOnes()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordValues(ValuesKey, new Dictionary<string, string> { ["shipmentId"] = "stale" });
        string? seen = "unset";
        var sideEffect = new ShippingSideEffect
        {
            OnSend = context =>
            {
                seen = context.Values.Get("shipmentId");
                return Task.FromResult(ServiceTaskStageResult.Completed());
            },
        };

        await CreateCommand(sideEffect).Execute(CreateContext(carry), Payload(0));

        Assert.Null(seen);
        Assert.Null(carry.FindValues(ValuesKey));
    }

    [Fact]
    public async Task Execute_ChangingInstanceData_FailsPermanently()
    {
        Instance instance = CreateInstance();
        InstanceDataUnitOfWork unitOfWork = CreateUnitOfWork(instance);
        var sideEffect = new ShippingSideEffect
        {
            OnSend = context =>
            {
                context.InstanceDataMutator.AddBinaryDataElement(
                    "receipt",
                    "text/plain",
                    "receipt.txt",
                    new byte[] { 1 }
                );
                return Task.FromResult(ServiceTaskStageResult.Completed());
            },
        };

        ProcessEngineCommandResult result = await CreateCommand(sideEffect)
            .Execute(CreateContext(mutator: unitOfWork), Payload(0));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("SideEffectChangedInstanceData", failed.ExceptionType);
    }

    /// <summary>
    /// A side effect opens a mailbox the way a service task does: the stage is handed the minted mailbox, owned
    /// by the side effect, and completing it hands the receive leg to the relay, for the side effect.
    /// </summary>
    [Fact]
    public async Task MailboxOpeningStage_IsHandedItsMailbox_AndHandsTheReceiveLegToTheRelay()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(0, _mailboxId, new DateTimeOffset(2026, 8, 20, 9, 0, 0, TimeSpan.Zero));
        var sideEffect = new MailboxSideEffect();

        ProcessEngineCommandResult result = await CreateCommand(sideEffect)
            .Execute(CreateContext(carry), Payload(0, input: "{}"));

        Assert.Equal(_mailboxId, sideEffect.Opened?.Id);
        Assert.Equal(MailboxOwner.SideEffect(Name), sideEffect.Opened?.Owner);
        var success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.Null(success.ProcessNextContinuation);
        var continuing = Assert.IsType<MailboxContinuation.ContinueAfterStage>(success.MailboxContinuation);
        Assert.Equal(new PipelineHost.SideEffect(Name, "{}"), continuing.Host);
        Assert.Equal(_mailboxId, continuing.Handover.Target?.MailboxId);
        Assert.Equal([$"{ExecuteSideEffect.Key}: 1"], continuing.Handover.Plan.Steps.Select(s => s.OperationId));
    }

    [Fact]
    public async Task Reply_ThatConcludes_ClosesTheMailboxWithoutMovingTheProcess()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(0, _mailboxId, new DateTimeOffset(2026, 8, 20, 9, 0, 0, TimeSpan.Zero));

        ProcessEngineCommandResult result = await CreateCommand(new MailboxSideEffect())
            .Execute(WithMailbox(CreateContext(carry), Delivered(MailboxOwner.SideEffect(Name).Key)), Payload(1));

        var success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.Null(success.ProcessNextContinuation);
        var conclude = Assert.IsType<MailboxContinuation.Conclude>(success.MailboxContinuation);
        Assert.Equal([_mailboxId], conclude.MailboxIds);
        Assert.Null(carry.FindMailbox(0));
    }

    [Fact]
    public async Task Reply_ThatConcludesWithAnAction_IsRefused_AndStillClosesTheMailbox()
    {
        var sideEffect = new MailboxSideEffect { OnMessage = _ => ServiceTaskResult.Success("reject") };

        ProcessEngineCommandResult result = await CreateCommand(sideEffect)
            .Execute(WithMailbox(CreateContext(), Delivered(MailboxOwner.SideEffect(Name).Key)), Payload(1));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("SideEffectActionUnsupported", failed.ExceptionType);
        var conclude = Assert.IsType<MailboxContinuation.Conclude>(failed.MailboxContinuation);
        Assert.Equal([_mailboxId], conclude.MailboxIds);
    }

    /// <summary>A message forwarded for a service task of the same name is not one the side effect can read.</summary>
    [Fact]
    public async Task Reply_ForwardedForAServiceTask_IsRefused()
    {
        ProcessEngineCommandResult result = await CreateCommand(new MailboxSideEffect())
            .Execute(WithMailbox(CreateContext(), Delivered(MailboxOwner.ServiceTask(Name).Key)), Payload(1));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxDeliveryEnvelopeInvalid", failed.ExceptionType);
    }

    [Fact]
    public async Task Execute_IndexPastThePipeline_FailsPermanently()
    {
        ProcessEngineCommandResult result = await CreateCommand(new ShippingSideEffect())
            .Execute(CreateContext(), Payload(2));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("PipelineItemNotFound", failed.ExceptionType);
    }

    [Fact]
    public async Task Execute_NoItemIndex_FailsPermanently()
    {
        ProcessEngineCommandResult result = await CreateCommand(new ShippingSideEffect())
            .Execute(CreateContext(), Payload(null));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("InvalidPayloadException", failed.ExceptionType);
    }

    /// <summary>A side effect missing from this deployment may be present on the next one, so it is retried.</summary>
    [Fact]
    public async Task Execute_UnregisteredSideEffect_IsRetried()
    {
        ProcessEngineCommandResult result = await CreateCommand().Execute(CreateContext(), Payload(0));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.False(failed.NonRetryable);
        Assert.Contains($"'{Name}'", failed.ErrorMessage, StringComparison.Ordinal);
    }

    private static InstanceDataUnitOfWork CreateUnitOfWork(Instance instance)
    {
        var dataClient = new Mock<IDataClientWithStorageMetadata>();
        IInstanceMutationClient mutationClient = dataClient.As<IInstanceMutationClient>().Object;
        return new InstanceDataUnitOfWork(
            instance,
            new StorageVersionMetadata(InstanceVersion: 12, ProcessStateVersion: 8),
            dataClient.Object,
            mutationClient,
            Mock.Of<IInstanceClientWithStorageMetadata>(),
            new ApplicationMetadata("ttd/test-app") { DataTypes = [new DataType { Id = "receipt" }] },
            Mock.Of<ITranslationService>(),
            new ModelSerializationService(null!),
            Mock.Of<IAppResources>(),
            Options.Create(new FrontEndSettings()),
            taskId: instance.Process?.CurrentTask?.ElementId,
            language: null
        );
    }
}
