using Altinn.App.Core.Features.Process;

namespace Altinn.App.Core.Tests.Features.Process;

public class PipelineBuilderTests
{
    private const string EndedByStage = "already ended by a Stage whose work returns ServiceTaskResult";
    private const string EndedByReplies = "already ended by a HandleReplies whose handlers return ServiceTaskResult";

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

    // ── Lifecycle ────────────────────────────────────────────────────────────────────────────

    [Fact]
    public void Lifecycle_KeepsTheStagesInCompositionOrder_WithTheirOptions()
    {
        var second = new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(5) };

        ProcessTaskPipeline pipeline = new PipelineBuilder.Lifecycle().Stage(Plain).Stage(Plain, second).ToPipeline();

        Assert.Equal(2, pipeline.Stages.Count);
        Assert.Null(pipeline.Stages[0].StepOptions);
        Assert.Same(second, pipeline.Stages[1].StepOptions);
    }

    [Fact]
    public void Lifecycle_WithNoStages_IsAnEmptyPipeline()
    {
        Assert.Empty(new PipelineBuilder.Lifecycle().ToPipeline().Stages);
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
    public void AConcludeOnRepliesThatThrows_StillEndsTheBuilder()
    {
        // The case ending early exists for: ConcludeOnReplies marks its mailbox answered before it finds another one
        // unanswered. Were the builder still open, a caller that caught this could answer the other mailbox and end
        // with Finally, returning a pipeline in which nothing answers the first.
        var builder = new PipelineBuilder();
        builder.Stage(Send, _threeDays, out MailboxHandle first).Stage(Send, _threeDays, out MailboxHandle second);
        Assert.Throws<InvalidOperationException>(() => builder.ConcludeOnReplies(first, OnMessage, OnClosed));

        InvalidOperationException thrown = Assert.Throws<InvalidOperationException>(() =>
            builder.HandleReplies(second, OnSegmentMessage, OnSegmentClosed)
        );

        Assert.Contains("already ended by ConcludeOnReplies", thrown.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void ABuildThatThrows_StillEndsTheBuilder()
    {
        var builder = new PipelineBuilder();
        builder.Stage(Send, _threeDays, out MailboxHandle handle);
        Assert.Throws<InvalidOperationException>(() => builder.Build());

        InvalidOperationException thrown = Assert.Throws<InvalidOperationException>(() =>
            builder.ConcludeOnReplies(handle, OnMessage, OnClosed)
        );

        Assert.Contains("already ended by Build", thrown.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Build_EndsTheBuilder()
    {
        var builder = new PipelineBuilder();
        builder.Stage(Plain).Build();

        InvalidOperationException thrown = Assert.Throws<InvalidOperationException>(() => builder.Stage(Plain));

        Assert.Contains("already ended by Build", thrown.Message, StringComparison.Ordinal);
    }

    public static TheoryData<string> TerminalsWithAnInvalidArgument =>
        new() { "Finally with invalid options", "ConcludeOnReplies with invalid options" };

    [Theory]
    [MemberData(nameof(TerminalsWithAnInvalidArgument))]
    public void ATerminalWithAnInvalidArgument_AfterTheBuilderEnded_SaysTheBuilderEnded(string call)
    {
        // Stage and HandleReplies check the ending before their arguments; the terminals check it after. So a
        // second ending with a bad argument reports the argument, and only once that is fixed the real mistake.
        var builder = new PipelineBuilder();
        builder.Stage(Send, _threeDays, out MailboxHandle handle).ConcludeOnReplies(handle, OnMessage, OnClosed);
        var invalidOptions = new ProcessStepOptions { WaitBudget = TimeSpan.Zero };

        System.Action composing = call switch
        {
            "Finally with invalid options" => () => builder.Finally(Conclude, invalidOptions),
            "ConcludeOnReplies with invalid options" => () =>
                builder.ConcludeOnReplies(handle, OnMessage, OnClosed, invalidOptions),
            _ => throw new ArgumentOutOfRangeException(nameof(call), call, null),
        };

        InvalidOperationException thrown = Assert.Throws<InvalidOperationException>(composing);

        Assert.Contains("already ended by ConcludeOnReplies", thrown.Message, StringComparison.Ordinal);
    }
}
