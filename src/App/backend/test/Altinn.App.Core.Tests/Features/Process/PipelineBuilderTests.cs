using Altinn.App.Core.Features.Process;

namespace Altinn.App.Core.Tests.Features.Process;

public class PipelineBuilderTests
{
    private static readonly MailboxOptions _threeDays = new() { Timeout = TimeSpan.FromDays(3) };

    private static Task<StageResult> Plain(StageContext context) => Task.FromResult(StageResult.Completed());

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

    [Fact]
    public void Build_KeepsTheStagesInCompositionOrder_WithTheirOptions()
    {
        var second = new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(5) };

        ProcessTaskPipeline pipeline = new PipelineBuilder().Stage(Plain).Stage(Plain, second).Build();

        Assert.Equal(2, pipeline.Stages.Count);
        Assert.Null(pipeline.Stages[0].StepOptions);
        Assert.Same(second, pipeline.Stages[1].StepOptions);
    }

    [Fact]
    public void Build_WithNoStages_IsAnEmptyPipeline()
    {
        Assert.Empty(new PipelineBuilder().Build().Stages);
    }

    [Fact]
    public void Build_AfterOpeningAMailbox_IsRefusedAtComposition()
    {
        // A reply is answered after the transition commits, which only a service task's conclusion does.
        PipelineBuilder builder = new PipelineBuilder().Stage(Send, _threeDays, out MailboxHandle _);

        InvalidOperationException thrown = Assert.Throws<InvalidOperationException>(() => builder.Build());

        Assert.Contains("opens a mailbox", thrown.Message, StringComparison.Ordinal);
        Assert.Contains(nameof(PipelineBuilder.ConcludeOnReplies), thrown.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void TwoChainsOnOneBuilder_AreRefusedAtTheSecondChain()
    {
        // Composing one complete chain per branch is fine when only the chain returned is built. Building both on
        // the one builder would hand the second chain the first chain's stages as well.
        var builder = new PipelineBuilder();
        builder.Stage(Plain).Finally(Conclude);

        InvalidOperationException thrown = Assert.Throws<InvalidOperationException>(() =>
            builder.Stage(Plain).Finally(Conclude)
        );

        Assert.Contains("already ended by Finally", thrown.Message, StringComparison.Ordinal);
    }

    public static TheoryData<string> CallsAfterAnEnding =>
        new() { "Stage", "Stage opening a mailbox", "HandleReplies", "Finally", "ConcludeOnReplies", "Build" };

    [Theory]
    [MemberData(nameof(CallsAfterAnEnding))]
    public void EveryCall_AfterTheBuilderEnded_Throws(string call)
    {
        var builder = new PipelineBuilder();
        builder.Stage(Send, _threeDays, out MailboxHandle handle).ConcludeOnReplies(handle, OnMessage, OnClosed);

        System.Action composing = call switch
        {
            "Stage" => () => builder.Stage(Plain),
            "Stage opening a mailbox" => () => builder.Stage(Send, _threeDays, out MailboxHandle _),
            "HandleReplies" => () => builder.HandleReplies(handle, OnSegmentMessage, OnSegmentClosed),
            "Finally" => () => builder.Finally(Conclude),
            "ConcludeOnReplies" => () => builder.ConcludeOnReplies(handle, OnMessage, OnClosed),
            "Build" => () => builder.Build(),
            _ => throw new ArgumentOutOfRangeException(nameof(call), call, null),
        };

        InvalidOperationException thrown = Assert.Throws<InvalidOperationException>(composing);

        Assert.Contains("already ended by ConcludeOnReplies", thrown.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void AnEndingThatThrows_StillEndsTheBuilder()
    {
        // A Define method that catches the builder's exception and composes on would otherwise return a pipeline
        // built partly by the call that failed.
        var builder = new PipelineBuilder();
        builder.Stage(Send, _threeDays, out MailboxHandle handle);
        Assert.Throws<InvalidOperationException>(() => builder.Finally(Conclude));

        InvalidOperationException thrown = Assert.Throws<InvalidOperationException>(() =>
            builder.HandleReplies(handle, OnSegmentMessage, OnSegmentClosed)
        );

        Assert.Contains("already ended by Finally", thrown.Message, StringComparison.Ordinal);
    }
}
