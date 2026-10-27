using Altinn.App.Core.Features.Process;

namespace Altinn.App.Core.Tests.Features.Process;

public class PipelineBuilderTests
{
    private static readonly MailboxOptions _threeDays = new() { Timeout = TimeSpan.FromDays(3) };

    private static Task<StageResult> Plain(StageContext context) => Task.FromResult(StageResult.Completed());

    private static Task<ServiceTaskOpeningStageResult> Send(StageContext context, ServiceTaskMailbox mailbox) =>
        Task.FromResult(ServiceTaskOpeningStageResult.Completed());

    [Fact]
    public void Build_KeepsTheStagesInCompositionOrder_WithTheirOptions()
    {
        var second = new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(5) };

        Pipeline pipeline = new PipelineBuilder().Stage(Plain).Stage(Plain, second).Build();

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
}
