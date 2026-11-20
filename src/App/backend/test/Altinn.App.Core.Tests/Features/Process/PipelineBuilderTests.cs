using Altinn.App.Core.Features.Process;

namespace Altinn.App.Core.Tests.Features.Process;

public class PipelineBuilderTests
{
    private const string EndedByStage = "already ended by a Stage whose work returns ServiceTaskResult";
    private const string EndedByReplies = "already ended by a HandleReplies whose handlers end the task";

    private static readonly MailboxOptions _threeDays = new() { Timeout = TimeSpan.FromDays(3) };

    private static Task<StageResult> Plain(StageContext context) => Task.FromResult(StageResult.Completed());

    private static Task<StageResult> SendToArchive(StageContext context) => Task.FromResult(StageResult.Completed());

    private static Task<StageResult> NotifyOwner(StageContext context) => Task.FromResult(StageResult.Completed());

    private static Task<ServiceTaskOpeningStageResult> Send(StageContext context, ServiceTaskMailbox mailbox) =>
        Task.FromResult(ServiceTaskOpeningStageResult.Completed());

    private static Task<ServiceTaskResult> Conclude(StageContext context) =>
        Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());

    private static Task<ServiceTaskExchangeResult> OnMessage(StageContext context, ServiceTaskReply reply) =>
        Task.FromResult<ServiceTaskExchangeResult>(ServiceTaskResult.Success());

    private static Task<ServiceTaskResult> OnClosed(StageContext context, MailboxClosedReason reason) =>
        Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());

    private static Task<StageExchangeResult> OnSegmentMessage(StageContext context, ServiceTaskReply reply) =>
        Task.FromResult<StageExchangeResult>(StageResult.Completed());

    private static Task<StageResult> OnSegmentClosed(StageContext context, MailboxClosedReason reason) =>
        Task.FromResult(StageResult.Completed());

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
            builder.Stage(Plain, new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromSeconds(-5) })
        );
        Assert.Empty(builder.ToPipeline().Stages);
    }

    // ── Service task: the return type picks the overload ─────────────────────────────────────

    [Fact]
    public void ServiceTask_AStageWhoseWorkReturnsStageResult_CarriesOn()
    {
        var builder = new PipelineBuilder.ServiceTask();

        PipelineBuilder.ServiceTask returned = builder.Stage(Plain);

        Assert.Same(builder, returned);
        Assert.IsType<PipelineStage.Plain>(returned.Stage(Conclude).Items[0]);
    }

    [Fact]
    public void ServiceTask_AStageWhoseWorkReturnsServiceTaskResult_EndsThePipelineWithAFinalConclusion()
    {
        Func<StageContext, Task<ServiceTaskResult>> conclude = Conclude;
        var options = new ProcessStepOptions { WaitBudget = TimeSpan.FromHours(48) };

        ServiceTaskPipeline pipeline = new PipelineBuilder.ServiceTask().Stage(Plain).Stage(conclude, options);

        Assert.Equal(2, pipeline.Items.Count);
        Assert.IsType<PipelineStage.Plain>(pipeline.Items[0]);
        var final = Assert.IsType<PipelineConclusion.Final>(pipeline.Items[1]);
        Assert.Same(conclude, final.Work);
        Assert.Same(options, final.StepOptions);
        Assert.Equal("Conclude", final.DisplayName);
    }

    [Fact]
    public void ServiceTask_AHandleRepliesWhoseHandlersReturnServiceTaskResult_EndsThePipelineWithAReplyExchange()
    {
        Func<StageContext, ServiceTaskReply, Task<ServiceTaskExchangeResult>> onMessage = OnMessage;
        Func<StageContext, MailboxClosedReason, Task<ServiceTaskResult>> onClosed = OnClosed;
        var options = new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(3) };

        ServiceTaskPipeline pipeline = new PipelineBuilder.ServiceTask()
            .Stage(Plain)
            .Stage(Send, _threeDays, out MailboxHandle handle)
            .HandleReplies(handle, onMessage, onClosed, options);

        Assert.Equal(3, pipeline.Items.Count);
        var exchange = Assert.IsType<PipelineConclusion.ReplyExchange>(pipeline.Items[2]);
        Assert.Equal(1, exchange.OpeningIndex);
        Assert.Same(onMessage, exchange.OnMessage);
        Assert.Same(onClosed, exchange.OnClosed);
        Assert.Same(options, exchange.StepOptions);
        Assert.Equal("On message / On closed", exchange.DisplayName);
    }

    [Fact]
    public void ServiceTask_AHandleRepliesWhoseHandlersReturnStageResult_AddsAReplySegment_AndCarriesOn()
    {
        var builder = new PipelineBuilder.ServiceTask();
        builder.Stage(Send, _threeDays, out MailboxHandle handle);

        PipelineBuilder.ServiceTask returned = builder.HandleReplies(handle, OnSegmentMessage, OnSegmentClosed);

        Assert.Same(builder, returned);
        ServiceTaskPipeline pipeline = returned.Stage(Plain).Stage(Conclude);
        Assert.Collection(
            pipeline.Items,
            item => Assert.IsType<PipelineStage.MailboxOpening>(item),
            item => Assert.Equal(0, Assert.IsType<ReplySegment>(item).OpeningIndex),
            item => Assert.IsType<PipelineStage.Plain>(item),
            item => Assert.IsType<PipelineConclusion.Final>(item)
        );
    }

    // ── Service task: one ending per builder ─────────────────────────────────────────────────

    [Fact]
    public void TwoChainsOnOneBuilder_AreRefusedAtTheSecondChain()
    {
        // Composing one complete chain per branch is fine when only the chain returned is built. Building both on
        // the one builder would hand the second chain the first chain's stages as well.
        var builder = new PipelineBuilder.ServiceTask();
        builder.Stage(Plain).Stage(Conclude);

        InvalidOperationException thrown = Assert.Throws<InvalidOperationException>(() =>
            builder.Stage(Plain).Stage(Conclude)
        );

        Assert.Contains(EndedByStage, thrown.Message, StringComparison.Ordinal);
        Assert.Contains("so Stage cannot add to it", thrown.Message, StringComparison.Ordinal);
    }

    public static TheoryData<string, string> CallsAfterAnEnding =>
        new()
        {
            { "Stage", "Stage" },
            { "Stage opening a mailbox", "Stage" },
            { "carry-on HandleReplies", "HandleReplies" },
            { "ending Stage", "Stage" },
            { "ending HandleReplies", "HandleReplies" },
        };

    [Theory]
    [MemberData(nameof(CallsAfterAnEnding))]
    public void EveryCall_AfterTheBuilderEnded_Throws_NamingTheEndingAndTheCall(string call, string calledMethod)
    {
        var builder = new PipelineBuilder.ServiceTask();
        builder.Stage(Send, _threeDays, out MailboxHandle handle).HandleReplies(handle, OnMessage, OnClosed);

        System.Action composing = call switch
        {
            "Stage" => () => builder.Stage(Plain),
            "Stage opening a mailbox" => () => builder.Stage(Send, _threeDays, out MailboxHandle _),
            "carry-on HandleReplies" => () => builder.HandleReplies(handle, OnSegmentMessage, OnSegmentClosed),
            "ending Stage" => () => builder.Stage(Conclude),
            "ending HandleReplies" => () => builder.HandleReplies(handle, OnMessage, OnClosed),
            _ => throw new ArgumentOutOfRangeException(nameof(call), call, null),
        };

        InvalidOperationException thrown = Assert.Throws<InvalidOperationException>(composing);

        Assert.Contains(EndedByReplies, thrown.Message, StringComparison.Ordinal);
        Assert.Contains($"so {calledMethod} cannot add to it", thrown.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void AnEndingThatThrows_StillEndsTheBuilder()
    {
        // A Define method that catches the builder's exception and composes on would otherwise return a pipeline
        // built partly by the call that failed.
        var builder = new PipelineBuilder.ServiceTask();
        builder.Stage(Send, _threeDays, out MailboxHandle handle);
        Assert.Throws<InvalidOperationException>(() => builder.Stage(Conclude));

        InvalidOperationException thrown = Assert.Throws<InvalidOperationException>(() =>
            builder.HandleReplies(handle, OnSegmentMessage, OnSegmentClosed)
        );

        Assert.Contains(EndedByStage, thrown.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void AnEndingHandleRepliesThatThrows_StillEndsTheBuilder()
    {
        // The case ending early exists for: an ending HandleReplies marks its mailbox answered before it finds another
        // one unanswered. Were the builder still open, a caller that caught this could answer the other mailbox and
        // end with a Stage, returning a pipeline in which nothing answers the first.
        var builder = new PipelineBuilder.ServiceTask();
        builder.Stage(Send, _threeDays, out MailboxHandle first).Stage(Send, _threeDays, out MailboxHandle second);
        Assert.Throws<InvalidOperationException>(() => builder.HandleReplies(first, OnMessage, OnClosed));

        InvalidOperationException thrown = Assert.Throws<InvalidOperationException>(() =>
            builder.HandleReplies(second, OnSegmentMessage, OnSegmentClosed)
        );

        Assert.Contains(EndedByReplies, thrown.Message, StringComparison.Ordinal);
    }

    public static TheoryData<string> EndingsWithInvalidOptions =>
        new() { "Stage with invalid options", "HandleReplies with invalid options" };

    [Theory]
    [MemberData(nameof(EndingsWithInvalidOptions))]
    public void AnEndingWithInvalidOptions_AfterTheBuilderEnded_SaysTheBuilderEnded(string call)
    {
        // Every call checks the ending before its arguments, so a second ending with a bad argument reports the
        // ending, the real mistake, rather than the argument.
        var builder = new PipelineBuilder.ServiceTask();
        builder.Stage(Send, _threeDays, out MailboxHandle handle).HandleReplies(handle, OnMessage, OnClosed);
        var invalidOptions = new ProcessStepOptions { WaitBudget = TimeSpan.Zero };

        System.Action composing = call switch
        {
            "Stage with invalid options" => () => builder.Stage(Conclude, invalidOptions),
            "HandleReplies with invalid options" => () =>
                builder.HandleReplies(handle, OnMessage, OnClosed, invalidOptions),
            _ => throw new ArgumentOutOfRangeException(nameof(call), call, null),
        };

        InvalidOperationException thrown = Assert.Throws<InvalidOperationException>(composing);

        Assert.Contains(EndedByReplies, thrown.Message, StringComparison.Ordinal);
    }
}
