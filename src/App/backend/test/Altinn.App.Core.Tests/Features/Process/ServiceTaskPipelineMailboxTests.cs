using Altinn.App.Core.Features.Process;
using Xunit;

namespace Altinn.App.Core.Tests.Features.Process;

/// <summary>
/// Composition of mailbox exchanges: what the mailbox-opening <c>Stage</c> overload records, what the two
/// handler positions record, that several exchanges compose in whatever order their handlers are written, and
/// the mistakes the builder refuses eagerly — a handle from another pipeline, a handle answered twice, and a
/// mailbox left unanswered when a terminal ends the composition.
/// </summary>
public class ServiceTaskPipelineMailboxTests
{
    private static readonly MailboxOptions ThreeDays = new() { Timeout = TimeSpan.FromDays(3) };

    private static Task<ServiceTaskStageResult> Send(ServiceTaskContext context, ServiceTaskMailbox mailbox) =>
        Task.FromResult(ServiceTaskStageResult.Completed());

    private static Task<ServiceTaskExchangeResult> Handle(ServiceTaskContext context, ServiceTaskReply reply) =>
        Task.FromResult<ServiceTaskExchangeResult>(ServiceTaskExchangeResult.AwaitNextReply());

    private static Task<ServiceTaskResult> Closed(ServiceTaskContext context, MailboxClosedReason reason) =>
        Task.FromResult<ServiceTaskResult>(ServiceTaskResult.FailedPermanent("no answer"));

    private static Task<ServiceTaskStageExchangeResult> HandleSegment(
        ServiceTaskContext context,
        ServiceTaskReply reply
    ) => Task.FromResult<ServiceTaskStageExchangeResult>(ServiceTaskStageExchangeResult.AwaitNextReply());

    private static Task<ServiceTaskStageResult> ClosedSegment(ServiceTaskContext context, MailboxClosedReason reason) =>
        Task.FromResult(ServiceTaskStageResult.Completed());

    /// <summary>The running shape: a send that opens the mailbox, then an unrelated stage, then the terminal.</summary>
    private static ServiceTaskPipelineBuilder ComposeStages(
        ServiceTaskPipelineBuilder builder,
        out MailboxHandle handle
    ) =>
        builder
            .Stage("SendToArchive", Send, ThreeDays, out handle)
            .Stage("RecordDispatch", _ => Task.FromResult(ServiceTaskStageResult.Completed()));

    /// <summary>A pipeline task whose <c>Define</c> the test scripts, so composition mistakes can be
    /// pushed through the runtime's own resolution path.</summary>
    private sealed class ScriptedTask(Func<ServiceTaskPipelineBuilder, ServiceTaskPipeline> define)
        : IPipelineServiceTask
    {
        public string Type => "archiving";

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) => define(pipeline);
    }

    [Fact]
    public void MailboxStage_RecordsTheDeclarationOnTheStageThatOpensIt()
    {
        ServiceTaskPipeline pipeline = ComposeStages(new ServiceTaskPipelineBuilder(), out MailboxHandle handle)
            .ConcludeOnReplies(handle, Handle, Closed);

        Assert.Equal(
            ["SendToArchive", "RecordDispatch"],
            pipeline.Items.OfType<ServiceTaskStage>().Select(s => s.Name)
        );
        var opening = Assert.IsType<ServiceTaskStage.MailboxOpening>(pipeline.FindStage("SendToArchive"));
        Assert.Equal(TimeSpan.FromDays(3), opening.Declaration.Timeout);
        Assert.IsType<ServiceTaskStage.Plain>(pipeline.FindStage("RecordDispatch"));
    }

    [Fact]
    public void ConcludeOnReplies_RecordsAnExchangeKeyedOnTheOpeningStage()
    {
        ServiceTaskPipeline pipeline = ComposeStages(new ServiceTaskPipelineBuilder(), out MailboxHandle handle)
            .ConcludeOnReplies(handle, Handle, Closed);

        var exchange = Assert.IsType<PipelineConclusion.ReplyExchange>(pipeline.Conclusion);
        Assert.Equal("SendToArchive", exchange.OpeningStageName);
        Assert.Null(exchange.StepOptions);
    }

    [Fact]
    public void ConcludeOnReplies_RecordsTheStepOptionsItWasGiven()
    {
        var options = new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(3) };

        ServiceTaskPipeline pipeline = ComposeStages(new ServiceTaskPipelineBuilder(), out MailboxHandle handle)
            .ConcludeOnReplies(handle, Handle, Closed, options);

        var exchange = Assert.IsType<PipelineConclusion.ReplyExchange>(pipeline.Conclusion);
        Assert.Same(options, exchange.StepOptions);
    }

    [Fact]
    public async Task MailboxStage_HandsTheMintedMailboxToTheWork()
    {
        ServiceTaskMailbox? seen = null;
        ServiceTaskPipeline pipeline = new ServiceTaskPipelineBuilder()
            .Stage(
                "SendToArchive",
                (_, mailbox) =>
                {
                    seen = mailbox;
                    return Task.FromResult(ServiceTaskStageResult.Completed());
                },
                ThreeDays,
                out MailboxHandle handle
            )
            .ConcludeOnReplies(handle, Handle, Closed);

        var mailbox = new ServiceTaskMailbox { Id = Guid.NewGuid(), Deadline = DateTimeOffset.UtcNow.AddDays(3) };
        var opening = Assert.IsType<ServiceTaskStage.MailboxOpening>(pipeline.FindStage("SendToArchive"));
        await opening.Work(TestContext(), mailbox);

        Assert.Same(mailbox, seen);
    }

    [Fact]
    public void TwoExchanges_ComposeAsItemsInCompositionOrder()
    {
        // The archive-then-journal shape: the first exchange is answered mid-pipeline and the pipeline carries
        // on to open, and end on, the second.
        ServiceTaskPipeline pipeline = new ServiceTaskPipelineBuilder()
            .Stage("SendToArchive", Send, ThreeDays, out MailboxHandle archive)
            .HandleReplies(archive, HandleSegment, ClosedSegment)
            .Stage("SendToJournal", Send, ThreeDays, out MailboxHandle journal)
            .ConcludeOnReplies(journal, Handle, Closed);

        Assert.Collection(
            pipeline.Items,
            item => Assert.Equal("SendToArchive", Assert.IsType<ServiceTaskStage.MailboxOpening>(item).Name),
            item => Assert.Equal("SendToArchive", Assert.IsType<ReplySegment>(item).OpeningStageName),
            item => Assert.Equal("SendToJournal", Assert.IsType<ServiceTaskStage.MailboxOpening>(item).Name)
        );
        Assert.Equal(
            "SendToJournal",
            Assert.IsType<PipelineConclusion.ReplyExchange>(pipeline.Conclusion).OpeningStageName
        );
    }

    [Fact]
    public void HandleReplies_RecordsTheHandlersAgainstTheExchangeTheyAnswer()
    {
        Func<ServiceTaskContext, ServiceTaskReply, Task<ServiceTaskStageExchangeResult>> onMessage = HandleSegment;
        Func<ServiceTaskContext, MailboxClosedReason, Task<ServiceTaskStageResult>> onClosed = ClosedSegment;
        var options = new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(3) };

        ServiceTaskPipeline pipeline = new ServiceTaskPipelineBuilder()
            .Stage("SendToArchive", Send, ThreeDays, out MailboxHandle archive)
            .HandleReplies(archive, onMessage, onClosed, options)
            .Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()));

        ReplySegment segment = Assert.Single(pipeline.Items.OfType<ReplySegment>());
        Assert.Equal("SendToArchive", segment.OpeningStageName);
        Assert.Same(onMessage, segment.OnMessage);
        Assert.Same(onClosed, segment.OnClosed);
        Assert.Same(options, segment.StepOptions);
    }

    [Fact]
    public void HandlersComposeInWhicheverOrderTheAuthorChose()
    {
        // Both sends up front, and the exchanges answered in the opposite order. Legal by design: handler
        // order is exchange order, and it is the author's call — nothing here validates it against the sends.
        var builder = new ServiceTaskPipelineBuilder();
        builder.Stage("SendToArchive", Send, ThreeDays, out MailboxHandle archive);
        builder.Stage("SendToJournal", Send, ThreeDays, out MailboxHandle journal);

        ServiceTaskPipeline pipeline = builder
            .HandleReplies(journal, HandleSegment, ClosedSegment)
            .ConcludeOnReplies(archive, Handle, Closed);

        Assert.Equal("SendToJournal", Assert.Single(pipeline.Items.OfType<ReplySegment>()).OpeningStageName);
        Assert.Equal(
            "SendToArchive",
            Assert.IsType<PipelineConclusion.ReplyExchange>(pipeline.Conclusion).OpeningStageName
        );
    }

    [Fact]
    public void AnsweredExchangeFollowedByStagesAndFinally_Composes()
    {
        // A reply handled mid-pipeline, with ordinary work after it and a final step to conclude: the shape a
        // mailbox pipeline could not have while the exchange had to be the conclusion.
        ServiceTaskPipeline pipeline = new ServiceTaskPipelineBuilder()
            .Stage("SendToArchive", Send, ThreeDays, out MailboxHandle archive)
            .HandleReplies(archive, HandleSegment, ClosedSegment)
            .Stage("RecordReceipt", _ => Task.FromResult(ServiceTaskStageResult.Completed()))
            .Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()));

        Assert.IsType<PipelineConclusion.FinalStep>(pipeline.Conclusion);
        Assert.Equal(["SendToArchive", "RecordReceipt"], pipeline.Items.OfType<ServiceTaskStage>().Select(s => s.Name));
    }

    [Fact]
    public void TerminalLeavingAnotherMailboxUnanswered_ThrowsNamingTheFirstStage()
    {
        // Two mailboxes go unanswered, so the message has a choice: it names the first one composed.
        var builder = new ServiceTaskPipelineBuilder();
        builder.Stage("SendToArchive", Send, ThreeDays, out MailboxHandle _);
        builder.Stage("SendToRegistry", Send, ThreeDays, out MailboxHandle _);
        builder.Stage("SendToJournal", Send, ThreeDays, out MailboxHandle journal);

        InvalidOperationException exception = Assert.Throws<InvalidOperationException>(() =>
            builder.ConcludeOnReplies(journal, Handle, Closed)
        );

        Assert.Contains("Stage 'SendToArchive' opens a mailbox", exception.Message, StringComparison.Ordinal);
        Assert.DoesNotContain("SendToRegistry", exception.Message, StringComparison.Ordinal);
        Assert.Contains(
            nameof(ServiceTaskPipelineBuilder.ConcludeOnReplies),
            exception.Message,
            StringComparison.Ordinal
        );
        Assert.Contains(nameof(ServiceTaskPipelineBuilder.HandleReplies), exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void HandleFromAnotherPipeline_Throws()
    {
        // Not a hypothetical: a task that caches a handle from a previous Define call lands here.
        new ServiceTaskPipelineBuilder().Stage("SendToArchive", Send, ThreeDays, out MailboxHandle foreign);
        var builder = new ServiceTaskPipelineBuilder();
        builder.Stage("SendToArchive", Send, ThreeDays, out MailboxHandle _);

        ArgumentException exception = Assert.Throws<ArgumentException>(() =>
            builder.ConcludeOnReplies(foreign, Handle, Closed)
        );

        Assert.Contains("belongs to another task's pipeline", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void HandleAnsweredTwice_Throws()
    {
        var builder = new ServiceTaskPipelineBuilder();
        builder.Stage("SendToArchive", Send, ThreeDays, out MailboxHandle handle);
        builder.ConcludeOnReplies(handle, Handle, Closed);

        InvalidOperationException exception = Assert.Throws<InvalidOperationException>(() =>
            builder.ConcludeOnReplies(handle, Handle, Closed)
        );

        Assert.Contains(
            "The mailbox opened by stage 'SendToArchive' is already answered",
            exception.Message,
            StringComparison.Ordinal
        );
    }

    [Fact]
    public void HandleAnsweredTwiceByHandleReplies_Throws()
    {
        var builder = new ServiceTaskPipelineBuilder();
        builder.Stage("SendToArchive", Send, ThreeDays, out MailboxHandle handle);
        builder.HandleReplies(handle, HandleSegment, ClosedSegment);

        InvalidOperationException exception = Assert.Throws<InvalidOperationException>(() =>
            builder.HandleReplies(handle, HandleSegment, ClosedSegment)
        );

        Assert.Contains("is already answered", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void HandleAnsweredByBothPositions_Throws()
    {
        // Interleaving — the same exchange read by a segment and then by the terminal — stays out: the handle
        // is consumed once, whichever position consumes it.
        var builder = new ServiceTaskPipelineBuilder();
        builder.Stage("SendToArchive", Send, ThreeDays, out MailboxHandle handle);
        builder.HandleReplies(handle, HandleSegment, ClosedSegment);

        InvalidOperationException exception = Assert.Throws<InvalidOperationException>(() =>
            builder.ConcludeOnReplies(handle, Handle, Closed)
        );

        Assert.Contains(
            "The mailbox opened by stage 'SendToArchive' is already answered",
            exception.Message,
            StringComparison.Ordinal
        );
    }

    [Fact]
    public void HandleRepliesWithAHandleFromAnotherPipeline_Throws()
    {
        new ServiceTaskPipelineBuilder().Stage("SendToArchive", Send, ThreeDays, out MailboxHandle foreign);
        var builder = new ServiceTaskPipelineBuilder();
        builder.Stage("SendToArchive", Send, ThreeDays, out MailboxHandle _);

        ArgumentException exception = Assert.Throws<ArgumentException>(() =>
            builder.HandleReplies(foreign, HandleSegment, ClosedSegment)
        );

        Assert.Contains("belongs to another task's pipeline", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void MailboxOpenedButFinallyEndsThePipeline_Throws()
    {
        var builder = new ServiceTaskPipelineBuilder();
        builder.Stage("SendToArchive", Send, ThreeDays, out MailboxHandle _);

        InvalidOperationException exception = Assert.Throws<InvalidOperationException>(() =>
            builder.Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()))
        );

        Assert.Contains("Stage 'SendToArchive' opens a mailbox", exception.Message, StringComparison.Ordinal);
        Assert.Contains(
            nameof(ServiceTaskPipelineBuilder.ConcludeOnReplies),
            exception.Message,
            StringComparison.Ordinal
        );
    }

    [Fact]
    public void FinallyAfterAReplyTerminal_StillThrowsBecauseThatAnswerLeftWithItsOwnPipeline()
    {
        // The one test that pins the difference between "answered by a handler in this pipeline" and "answered
        // by a terminal, in the pipeline that terminal returned". Collapse the builder's mark to a plain bool
        // and this composition starts succeeding, handing back a pipeline that opens a mailbox and answers it
        // nowhere — every other test here passes either way.
        var builder = new ServiceTaskPipelineBuilder();
        builder.Stage("SendToArchive", Send, ThreeDays, out MailboxHandle handle);
        builder.ConcludeOnReplies(handle, Handle, Closed);

        InvalidOperationException exception = Assert.Throws<InvalidOperationException>(() =>
            builder.Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()))
        );

        // And it says what actually went wrong — two pipelines from one builder — rather than telling the author
        // to answer a mailbox they just answered.
        Assert.Contains(
            "The mailbox opened by stage 'SendToArchive' is answered by an earlier ConcludeOnReplies",
            exception.Message,
            StringComparison.Ordinal
        );
        Assert.Contains("returns a different pipeline", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void NoMailbox_FinallyStillEndsThePipeline()
    {
        ServiceTaskPipeline pipeline = new ServiceTaskPipelineBuilder()
            .Stage("SendToArchive", _ => Task.FromResult(ServiceTaskStageResult.Completed()))
            .Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()));

        Assert.IsType<PipelineConclusion.FinalStep>(pipeline.Conclusion);
        Assert.IsType<ServiceTaskStage.Plain>(pipeline.FindStage("SendToArchive"));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void NonPositiveTimeout_Throws(int hours)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() =>
            new ServiceTaskPipelineBuilder().Stage(
                "SendToArchive",
                Send,
                new MailboxOptions { Timeout = TimeSpan.FromHours(hours) },
                out MailboxHandle _
            )
        );
    }

    [Fact]
    public void NullArguments_Throw()
    {
        Assert.Throws<ArgumentNullException>(() =>
            new ServiceTaskPipelineBuilder().Stage("SendToArchive", Send, null!, out MailboxHandle _)
        );
        Assert.Throws<ArgumentNullException>(() =>
            new ServiceTaskPipelineBuilder().Stage("SendToArchive", null!, ThreeDays, out MailboxHandle _)
        );

        var builder = new ServiceTaskPipelineBuilder();
        builder.Stage("SendToArchive", Send, ThreeDays, out MailboxHandle handle);
        Assert.Throws<ArgumentNullException>(() => builder.ConcludeOnReplies(null!, Handle, Closed));
        Assert.Throws<ArgumentNullException>(() => builder.ConcludeOnReplies(handle, null!, Closed));
        Assert.Throws<ArgumentNullException>(() => builder.ConcludeOnReplies(handle, Handle, null!));

        Assert.Throws<ArgumentNullException>(() => builder.HandleReplies(null!, HandleSegment, ClosedSegment));
        Assert.Throws<ArgumentNullException>(() => builder.HandleReplies(handle, null!, ClosedSegment));
        Assert.Throws<ArgumentNullException>(() => builder.HandleReplies(handle, HandleSegment, null!));
    }

    [Fact]
    public void ResolvePipeline_MailboxPipeline_Resolves()
    {
        var task = new ScriptedTask(builder =>
            ComposeStages(builder, out MailboxHandle handle).ConcludeOnReplies(handle, Handle, Closed)
        );

        for (int i = 0; i < 2; i++)
        {
            var exchange = Assert.IsType<PipelineConclusion.ReplyExchange>(task.ResolvePipeline().Conclusion);
            Assert.Equal("SendToArchive", exchange.OpeningStageName);
        }
    }

    [Fact]
    public void ResolvePipeline_DefineCachesThePipeline_StillResolves()
    {
        // Caching violates Define's contract but must not become a hard error: the pipeline is immutable, and
        // this call's builder issued no handle of its own.
        ServiceTaskPipeline cached = ComposeStages(new ServiceTaskPipelineBuilder(), out MailboxHandle handle)
            .ConcludeOnReplies(handle, Handle, Closed);
        var task = new ScriptedTask(_ => cached);

        Assert.Same(cached, task.ResolvePipeline());
        Assert.Same(cached, task.ResolvePipeline());
    }

    private static ServiceTaskContext TestContext() =>
        new()
        {
            InstanceDataMutator = null!,
            WorkflowId = Guid.NewGuid(),
            StepId = Guid.NewGuid(),
        };
}
