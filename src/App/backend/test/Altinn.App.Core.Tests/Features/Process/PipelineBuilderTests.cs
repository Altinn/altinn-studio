using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Moq;

namespace Altinn.App.Core.Tests.Features.Process;

public class PipelineBuilderTests
{
    private static Task<StageResult> SendToArchive(StageContext context) => Task.FromResult(StageResult.Completed());

    private static Task<StageResult> NotifyOwner(StageContext context) => Task.FromResult(StageResult.Completed());

    private static Task<ServiceTaskResult> Prepare(StageContext context) =>
        Task.FromResult(ServiceTaskResult.Completed());

    private static Task<ServiceTaskResult> RequestApproval(StageContext context, ReplyAddress replyAddress) =>
        Task.FromResult(ServiceTaskResult.Completed());

    private static Task<ServiceTaskReplyResult> OnDecision(StageContext context, ServiceTaskReply reply) =>
        Task.FromResult(ServiceTaskReplyResult.AwaitNextReply());

    private static Task<ServiceTaskResult> OnTimeout(StageContext context) =>
        Task.FromResult(ServiceTaskResult.FailedPermanent("no answer"));

#nullable disable
    // Arguments a caller without nullable annotations can pass.
    private static readonly Func<StageContext, Task<StageResult>> _noLifecycleWork = null;
    private static readonly Func<StageContext, Task<ServiceTaskResult>> _noWork = null;
    private static readonly Func<StageContext, ReplyAddress, Task<ServiceTaskResult>> _noSend = null;
    private static readonly Func<StageContext, ServiceTaskReply, Task<ServiceTaskReplyResult>> _noReply = null;

#nullable restore

    // ── Lifecycle ────────────────────────────────────────────────────────────────────────────

    [Fact]
    public void Lifecycle_KeepsTheStagesInCompositionOrder_WithTheirOptionsAndNames()
    {
        var second = new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(5) };

        ProcessTaskPipeline pipeline = new PipelineBuilder.Lifecycle()
            .Stage(SendToArchive)
            .Stage(NotifyOwner, second)
            .Stage(_ => Task.FromResult(StageResult.Completed()))
            .ToPipeline();

        Assert.Equal(["Send to archive", "Notify owner", null], pipeline.Stages.Select(stage => stage.DisplayName));
        Assert.Null(pipeline.Stages[0].StepOptions);
        Assert.Same(second, pipeline.Stages[1].StepOptions);
        Assert.Null(pipeline.Stages[2].StepOptions);
    }

    [Fact]
    public void Lifecycle_WithNoStages_IsAnEmptyPipeline()
    {
        Assert.Empty(new PipelineBuilder.Lifecycle().ToPipeline().Stages);
    }

    [Fact]
    public void Lifecycle_StageWithInvalidOptions_IsRefusedAtComposition()
    {
        var builder = new PipelineBuilder.Lifecycle();

        Assert.Throws<InvalidOperationException>(() =>
            builder.Stage(SendToArchive, new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromSeconds(-5) })
        );
        Assert.Throws<ArgumentNullException>(() => builder.Stage(_noLifecycleWork));
        Assert.Empty(builder.ToPipeline().Stages);
    }

    // ── Service task ─────────────────────────────────────────────────────────────────────────

    [Fact]
    public void ServiceTask_EveryCallAppendsAndReturnsTheSameBuilder()
    {
        var builder = new PipelineBuilder.ServiceTask();

        Assert.Same(builder, builder.Stage(Prepare));
        Assert.Same(builder, builder.ExternalStage(RequestApproval, OnDecision));
        Assert.Same(builder, builder.Stage(Prepare));

        Assert.Collection(
            builder.ToPipeline().Items,
            item => Assert.IsType<ServiceTaskItem.Stage>(item),
            item => Assert.IsType<ServiceTaskItem.ExternalStage>(item),
            item => Assert.IsType<ServiceTaskItem.Stage>(item)
        );
    }

    [Fact]
    public void ServiceTask_Stage_RecordsItsWorkOptionsAndName()
    {
        Func<StageContext, Task<ServiceTaskResult>> work = Prepare;
        var options = new ProcessStepOptions { WaitBudget = TimeSpan.FromHours(48) };

        ServiceTaskItem item = Assert.Single(new PipelineBuilder.ServiceTask().Stage(work, options).ToPipeline().Items);

        var stage = Assert.IsType<ServiceTaskItem.Stage>(item);
        Assert.Same(work, stage.Work);
        Assert.Same(options, stage.StepOptions);
        Assert.Equal("Prepare", stage.DisplayName);
    }

    [Fact]
    public void ServiceTask_ExternalStage_RecordsItsHandlersTimeoutOptionsAndNames()
    {
        Func<StageContext, ReplyAddress, Task<ServiceTaskResult>> send = RequestApproval;
        Func<StageContext, ServiceTaskReply, Task<ServiceTaskReplyResult>> onReply = OnDecision;
        Func<StageContext, Task<ServiceTaskResult>> onTimeout = OnTimeout;
        var options = new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(3) };

        ServiceTaskItem item = Assert.Single(
            new PipelineBuilder.ServiceTask()
                .ExternalStage(send, onReply, TimeSpan.FromDays(3), onTimeout, options)
                .ToPipeline()
                .Items
        );

        var stage = Assert.IsType<ServiceTaskItem.ExternalStage>(item);
        Assert.Same(send, stage.Send);
        Assert.Same(onReply, stage.OnReply);
        Assert.Same(onTimeout, stage.OnTimeout);
        Assert.Equal(TimeSpan.FromDays(3), stage.Timeout);
        Assert.Same(options, stage.StepOptions);
        Assert.Equal("Request approval", stage.DisplayName);
        Assert.Equal("On decision / On timeout", stage.ReplyDisplayName);
    }

    [Fact]
    public void ServiceTask_ExternalStageWithoutTimeoutOrOnTimeout_WaitsFourteenDaysAndHasNoTimeoutHandler()
    {
        var stage = Assert.IsType<ServiceTaskItem.ExternalStage>(
            Assert.Single(
                new PipelineBuilder.ServiceTask().ExternalStage(RequestApproval, OnDecision).ToPipeline().Items
            )
        );

        Assert.Equal(TimeSpan.FromDays(14), stage.Timeout);
        Assert.Equal(PipelineBuilder.ServiceTask.DefaultReplyTimeout, stage.Timeout);
        Assert.Null(stage.OnTimeout);
        Assert.Null(stage.StepOptions);
        Assert.Equal("On decision", stage.ReplyDisplayName);
    }

    [Fact]
    public void ServiceTask_TwoExternalStagesInSequence_AreTwoItems()
    {
        ServiceTaskPipeline pipeline = new PipelineBuilder.ServiceTask()
            .ExternalStage(RequestApproval, OnDecision)
            .ExternalStage(RequestApproval, OnDecision, TimeSpan.FromDays(1))
            .ToPipeline();

        Assert.Equal(
            [TimeSpan.FromDays(14), TimeSpan.FromDays(1)],
            pipeline.Items.Select(item => Assert.IsType<ServiceTaskItem.ExternalStage>(item).Timeout)
        );
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(21 * 24 * 60 + 1)]
    public void ServiceTask_ExternalStageWithATimeoutOutOfRange_IsRefusedAtComposition(int minutes)
    {
        var builder = new PipelineBuilder.ServiceTask();

        ArgumentOutOfRangeException thrown = Assert.Throws<ArgumentOutOfRangeException>(() =>
            builder.ExternalStage(RequestApproval, OnDecision, TimeSpan.FromMinutes(minutes))
        );

        Assert.Equal("timeout", thrown.ParamName);
        Assert.Empty(builder.ToPipeline().Items);
    }

    [Fact]
    public void ServiceTask_ExternalStageWithTheLongestTimeout_Composes()
    {
        var stage = Assert.IsType<ServiceTaskItem.ExternalStage>(
            Assert.Single(
                new PipelineBuilder.ServiceTask()
                    .ExternalStage(RequestApproval, OnDecision, TimeSpan.FromDays(21))
                    .ToPipeline()
                    .Items
            )
        );

        Assert.Equal(PipelineBuilder.ServiceTask.MaxReplyTimeout, stage.Timeout);
    }

    [Fact]
    public void ServiceTask_InvalidArguments_AreRefusedAtComposition()
    {
        var builder = new PipelineBuilder.ServiceTask();
        var invalidOptions = new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromSeconds(-5) };

        Assert.Throws<ArgumentNullException>(() => builder.Stage(_noWork));
        Assert.Throws<InvalidOperationException>(() => builder.Stage(Prepare, invalidOptions));
        Assert.Throws<ArgumentNullException>(() => builder.ExternalStage(_noSend, OnDecision));
        Assert.Throws<ArgumentNullException>(() => builder.ExternalStage(RequestApproval, _noReply));
        Assert.Throws<InvalidOperationException>(() =>
            builder.ExternalStage(RequestApproval, OnDecision, options: invalidOptions)
        );

        Assert.Empty(builder.ToPipeline().Items);
    }

    [Fact]
    public async Task ServiceTask_ExternalStage_HandsTheReplyAddressToTheSend()
    {
        ReplyAddress? seen = null;
        ServiceTaskPipeline pipeline = new PipelineBuilder.ServiceTask()
            .ExternalStage(
                (_, replyAddress) =>
                {
                    seen = replyAddress;
                    return Task.FromResult(ServiceTaskResult.Completed());
                },
                OnDecision
            )
            .ToPipeline();

        var address = new ReplyAddress { Id = Guid.NewGuid(), Deadline = DateTimeOffset.UtcNow.AddDays(3) };
        var stage = Assert.IsType<ServiceTaskItem.ExternalStage>(pipeline.Items[0]);
        await stage.Send(TestContext(), address);

        Assert.Same(address, seen);
    }

    private static StageContext TestContext() =>
        new()
        {
            InstanceDataMutator = Mock.Of<IInstanceDataMutator>(),
            WorkflowId = Guid.NewGuid(),
            StepId = Guid.NewGuid(),
        };
}
