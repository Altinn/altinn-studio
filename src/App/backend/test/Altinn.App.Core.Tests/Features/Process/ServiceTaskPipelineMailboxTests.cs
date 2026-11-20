using Altinn.App.Core.Features.Process;
using Xunit;

namespace Altinn.App.Core.Tests.Features.Process;

/// <summary>
/// Composition of mailbox exchanges: what the mailbox-opening <c>Stage</c> overload records, what the two
/// <c>HandleReplies</c> overloads record, that several exchanges compose in whatever order their handlers are
/// written, and the mistakes the builder refuses eagerly — a handle from another pipeline, a handle answered twice,
/// and a mailbox left unanswered when an ending step ends the composition.
/// </summary>
public class ServiceTaskPipelineMailboxTests
{
    private static readonly MailboxOptions _threeDays = new() { Timeout = TimeSpan.FromDays(3) };

    private static Task<ServiceTaskOpeningStageResult> Send(StageContext context, ServiceTaskMailbox mailbox) =>
        Task.FromResult(ServiceTaskOpeningStageResult.Completed());

    private static Task<ServiceTaskExchangeResult> Handle(StageContext context, ServiceTaskReply reply) =>
        Task.FromResult<ServiceTaskExchangeResult>(ServiceTaskExchangeResult.AwaitNextReply());

    private static Task<ServiceTaskResult> Closed(StageContext context, MailboxClosedReason reason) =>
        Task.FromResult<ServiceTaskResult>(ServiceTaskResult.FailedPermanent("no answer"));

    private static Task<StageExchangeResult> HandleSegment(StageContext context, ServiceTaskReply reply) =>
        Task.FromResult<StageExchangeResult>(StageExchangeResult.AwaitNextReply());

    private static Task<StageResult> ClosedSegment(StageContext context, MailboxClosedReason reason) =>
        Task.FromResult(StageResult.Completed());

    /// <summary>The running shape: a send that opens the mailbox at item index 0, then an unrelated stage, then the ending.</summary>
    private static PipelineBuilder.ServiceTask ComposeStages(
        PipelineBuilder.ServiceTask builder,
        out MailboxHandle handle
    ) => builder.Stage(Send, _threeDays, out handle).Stage(_ => Task.FromResult(StageResult.Completed()));

    /// <summary>A pipeline task whose <c>DefineExecute</c> the test scripts, so composition mistakes can be
    /// pushed through the runtime's own resolution path.</summary>
    private sealed class ScriptedTask(Func<PipelineBuilder.ServiceTask, ServiceTaskPipeline> define) : IServiceTask
    {
        public string Type => "archiving";

        public ServiceTaskPipeline DefineExecute(PipelineBuilder.ServiceTask pipeline) => define(pipeline);
    }

    [Fact]
    public void MailboxStage_RecordsTheDeclarationOnTheStageThatOpensIt()
    {
        ServiceTaskPipeline pipeline = ComposeStages(new PipelineBuilder.ServiceTask(), out MailboxHandle handle)
            .HandleReplies(handle, Handle, Closed);

        // Two stages plus the conclusion, which is the list's last item.
        Assert.Equal(3, pipeline.Items.Count);
        Assert.IsType<PipelineStage.Plain>(pipeline.Items[1]);
        var opening = Assert.IsType<PipelineStage.MailboxOpening>(pipeline.Items[0]);
        Assert.Equal(TimeSpan.FromDays(3), opening.Declaration.Timeout);
        Assert.Equal(0, handle.OpeningIndex);
    }

    [Fact]
    public void MailboxHandle_CarriesTheOpeningItemsIndex()
    {
        ComposeStages(new PipelineBuilder.ServiceTask(), out MailboxHandle handle);

        Assert.Equal(0, handle.OpeningIndex);

        new PipelineBuilder.ServiceTask()
            .Stage(Send, _threeDays, out MailboxHandle first)
            .Stage(Send, _threeDays, out MailboxHandle second);
        Assert.Equal(0, first.OpeningIndex);
        Assert.Equal(1, second.OpeningIndex);
    }

    [Fact]
    public void EndingHandleReplies_RecordsAnExchangeKeyedOnTheOpeningIndex()
    {
        ServiceTaskPipeline pipeline = ComposeStages(new PipelineBuilder.ServiceTask(), out MailboxHandle handle)
            .HandleReplies(handle, Handle, Closed);

        var exchange = Assert.IsType<PipelineConclusion.ReplyExchange>(pipeline.Items[^1]);
        Assert.Equal(0, exchange.OpeningIndex);
        Assert.Null(exchange.StepOptions);
    }

    [Fact]
    public void EndingHandleReplies_RecordsTheStepOptionsItWasGiven()
    {
        var options = new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(3) };

        ServiceTaskPipeline pipeline = ComposeStages(new PipelineBuilder.ServiceTask(), out MailboxHandle handle)
            .HandleReplies(handle, Handle, Closed, options);

        var exchange = Assert.IsType<PipelineConclusion.ReplyExchange>(pipeline.Items[^1]);
        Assert.Same(options, exchange.StepOptions);
    }

    [Fact]
    public async Task MailboxStage_HandsTheMintedMailboxToTheWork()
    {
        ServiceTaskMailbox? seen = null;
        ServiceTaskPipeline pipeline = new PipelineBuilder.ServiceTask()
            .Stage(
                (_, mailbox) =>
                {
                    seen = mailbox;
                    return Task.FromResult(ServiceTaskOpeningStageResult.Completed());
                },
                _threeDays,
                out MailboxHandle handle
            )
            .HandleReplies(handle, Handle, Closed);

        var mailbox = new ServiceTaskMailbox { Id = Guid.NewGuid(), Deadline = DateTimeOffset.UtcNow.AddDays(3) };
        var opening = Assert.IsType<PipelineStage.MailboxOpening>(pipeline.Items[0]);
        await opening.Work(TestContext(), mailbox);

        Assert.Same(mailbox, seen);
    }

    [Fact]
    public void TwoExchanges_ComposeAsItemsInCompositionOrder()
    {
        // The archive-then-journal shape: the first exchange is answered mid-pipeline and the pipeline carries
        // on to open, and end on, the second.
        ServiceTaskPipeline pipeline = new PipelineBuilder.ServiceTask()
            .Stage(Send, _threeDays, out MailboxHandle archive)
            .HandleReplies(archive, HandleSegment, ClosedSegment)
            .Stage(Send, _threeDays, out MailboxHandle journal)
            .HandleReplies(journal, Handle, Closed);

        Assert.Collection(
            pipeline.Items,
            item => Assert.IsType<PipelineStage.MailboxOpening>(item),
            item => Assert.Equal(0, Assert.IsType<ReplySegment>(item).OpeningIndex),
            item => Assert.IsType<PipelineStage.MailboxOpening>(item),
            item => Assert.Equal(2, Assert.IsType<PipelineConclusion.ReplyExchange>(item).OpeningIndex)
        );
    }

    [Fact]
    public void HandleReplies_RecordsTheHandlersAgainstTheExchangeTheyAnswer()
    {
        Func<StageContext, ServiceTaskReply, Task<StageExchangeResult>> onMessage = HandleSegment;
        Func<StageContext, MailboxClosedReason, Task<StageResult>> onClosed = ClosedSegment;
        var options = new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(3) };

        ServiceTaskPipeline pipeline = new PipelineBuilder.ServiceTask()
            .Stage(Send, _threeDays, out MailboxHandle archive)
            .HandleReplies(archive, onMessage, onClosed, options)
            .Stage(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()));

        ReplySegment segment = Assert.Single(pipeline.Items.OfType<ReplySegment>());
        Assert.Equal(0, segment.OpeningIndex);
        Assert.Same(onMessage, segment.OnMessage);
        Assert.Same(onClosed, segment.OnClosed);
        Assert.Same(options, segment.StepOptions);
    }

    [Fact]
    public void HandlersComposeInWhicheverOrderTheAuthorChose()
    {
        // Both sends up front, and the exchanges answered in the opposite order. Legal by design: handler
        // order is exchange order, and it is the author's call — nothing here validates it against the sends.
        var builder = new PipelineBuilder.ServiceTask();
        builder.Stage(Send, _threeDays, out MailboxHandle archive);
        builder.Stage(Send, _threeDays, out MailboxHandle journal);

        ServiceTaskPipeline pipeline = builder
            .HandleReplies(journal, HandleSegment, ClosedSegment)
            .HandleReplies(archive, Handle, Closed);

        Assert.Equal(1, Assert.Single(pipeline.Items.OfType<ReplySegment>()).OpeningIndex);
        Assert.Equal(0, Assert.IsType<PipelineConclusion.ReplyExchange>(pipeline.Items[^1]).OpeningIndex);
    }

    [Fact]
    public void AnsweredExchangeFollowedByStagesAndAnEndingStage_Composes()
    {
        // A reply handled mid-pipeline, with ordinary work after it and an ending stage to conclude: the shape a
        // mailbox pipeline could not have while the exchange had to be the conclusion.
        ServiceTaskPipeline pipeline = new PipelineBuilder.ServiceTask()
            .Stage(Send, _threeDays, out MailboxHandle archive)
            .HandleReplies(archive, HandleSegment, ClosedSegment)
            .Stage(_ => Task.FromResult(StageResult.Completed()))
            .Stage(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()));

        Assert.Equal(4, pipeline.Items.Count);
        Assert.IsType<PipelineStage.Plain>(pipeline.Items[2]);
        Assert.IsType<PipelineConclusion.Final>(pipeline.Items[3]);
    }

    [Fact]
    public void EndingLeavingAnotherMailboxUnanswered_ThrowsNamingTheFirstIndex()
    {
        // Two mailboxes go unanswered, so the message has a choice: it names the first one composed.
        var builder = new PipelineBuilder.ServiceTask();
        builder.Stage(Send, _threeDays, out MailboxHandle _);
        builder.Stage(Send, _threeDays, out MailboxHandle _);
        builder.Stage(Send, _threeDays, out MailboxHandle journal);

        InvalidOperationException exception = Assert.Throws<InvalidOperationException>(() =>
            builder.HandleReplies(journal, Handle, Closed)
        );

        Assert.Contains("opened at index 0", exception.Message, StringComparison.Ordinal);
        Assert.DoesNotContain("index 1", exception.Message, StringComparison.Ordinal);
        Assert.Contains(
            "ends here with a HandleReplies whose handlers end the task",
            exception.Message,
            StringComparison.Ordinal
        );
        Assert.Contains(
            $"Answer it with {nameof(PipelineBuilder.ServiceTask.HandleReplies)}",
            exception.Message,
            StringComparison.Ordinal
        );
    }

    [Fact]
    public void HandleFromAnotherPipeline_Throws()
    {
        // Not a hypothetical: a task that caches a handle from a previous DefineExecute call lands here.
        new PipelineBuilder.ServiceTask().Stage(Send, _threeDays, out MailboxHandle foreign);
        var builder = new PipelineBuilder.ServiceTask();
        builder.Stage(Send, _threeDays, out MailboxHandle _);

        ArgumentException exception = Assert.Throws<ArgumentException>(() =>
            builder.HandleReplies(foreign, Handle, Closed)
        );

        Assert.Contains("belongs to another task's pipeline", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void HandleAnsweredTwiceByHandleReplies_Throws()
    {
        var builder = new PipelineBuilder.ServiceTask();
        builder.Stage(Send, _threeDays, out MailboxHandle handle);
        builder.HandleReplies(handle, HandleSegment, ClosedSegment);

        InvalidOperationException exception = Assert.Throws<InvalidOperationException>(() =>
            builder.HandleReplies(handle, HandleSegment, ClosedSegment)
        );

        Assert.Contains("is already answered", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void HandleAnsweredByBothPositions_Throws()
    {
        // Interleaving — the same exchange read by a segment and then by the ending — stays out: the handle
        // is consumed once, whichever overload consumes it.
        var builder = new PipelineBuilder.ServiceTask();
        builder.Stage(Send, _threeDays, out MailboxHandle handle);
        builder.HandleReplies(handle, HandleSegment, ClosedSegment);

        InvalidOperationException exception = Assert.Throws<InvalidOperationException>(() =>
            builder.HandleReplies(handle, Handle, Closed)
        );

        Assert.Contains(
            $"The mailbox opened at index {handle.OpeningIndex} is already answered",
            exception.Message,
            StringComparison.Ordinal
        );
    }

    [Fact]
    public void HandleRepliesWithAHandleFromAnotherPipeline_Throws()
    {
        new PipelineBuilder.ServiceTask().Stage(Send, _threeDays, out MailboxHandle foreign);
        var builder = new PipelineBuilder.ServiceTask();
        builder.Stage(Send, _threeDays, out MailboxHandle _);

        ArgumentException exception = Assert.Throws<ArgumentException>(() =>
            builder.HandleReplies(foreign, HandleSegment, ClosedSegment)
        );

        Assert.Contains("belongs to another task's pipeline", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void MailboxOpenedButAnEndingStageEndsThePipeline_Throws()
    {
        var builder = new PipelineBuilder.ServiceTask();
        builder.Stage(Send, _threeDays, out MailboxHandle _);

        InvalidOperationException exception = Assert.Throws<InvalidOperationException>(() =>
            builder.Stage(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()))
        );

        Assert.Contains("opened at index 0", exception.Message, StringComparison.Ordinal);
        Assert.Contains("nothing answers it", exception.Message, StringComparison.Ordinal);
        Assert.Contains(
            "ends here with a Stage whose work returns ServiceTaskResult",
            exception.Message,
            StringComparison.Ordinal
        );
    }

    [Fact]
    public void NoMailbox_AnEndingStageStillEndsThePipeline()
    {
        ServiceTaskPipeline pipeline = new PipelineBuilder.ServiceTask()
            .Stage(_ => Task.FromResult(StageResult.Completed()))
            .Stage(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()));

        Assert.IsType<PipelineStage.Plain>(pipeline.Items[0]);
        Assert.IsType<PipelineConclusion.Final>(pipeline.Items[1]);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void NonPositiveTimeout_Throws(int hours)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() =>
            new PipelineBuilder.ServiceTask().Stage(
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
            new PipelineBuilder.ServiceTask().Stage(Send, null!, out MailboxHandle _)
        );
        Assert.Throws<ArgumentNullException>(() =>
            new PipelineBuilder.ServiceTask().Stage(null!, _threeDays, out MailboxHandle _)
        );

        var builder = new PipelineBuilder.ServiceTask();
        builder.Stage(Send, _threeDays, out MailboxHandle handle);
        Assert.Throws<ArgumentNullException>(() => builder.HandleReplies(null!, Handle, Closed));
        Assert.Throws<ArgumentNullException>(() => builder.HandleReplies(handle, null!, Closed));
        Assert.Throws<ArgumentNullException>(() => builder.HandleReplies(handle, Handle, null!));

        Assert.Throws<ArgumentNullException>(() => builder.HandleReplies(null!, HandleSegment, ClosedSegment));
        Assert.Throws<ArgumentNullException>(() => builder.HandleReplies(handle, null!, ClosedSegment));
        Assert.Throws<ArgumentNullException>(() => builder.HandleReplies(handle, HandleSegment, null!));

        Assert.Throws<ArgumentNullException>(() => builder.Stage((Func<StageContext, Task<StageResult>>)null!));
        Assert.Throws<ArgumentNullException>(() =>
            builder.Stage((Func<StageContext, Task<ServiceTaskResult>>)null!, new ProcessStepOptions())
        );
    }

    [Fact]
    public void ResolvePipeline_MailboxPipeline_Resolves()
    {
        var task = new ScriptedTask(builder =>
            ComposeStages(builder, out MailboxHandle handle).HandleReplies(handle, Handle, Closed)
        );

        for (int i = 0; i < 2; i++)
        {
            var exchange = Assert.IsType<PipelineConclusion.ReplyExchange>(task.ResolvePipeline().Items[^1]);
            Assert.Equal(0, exchange.OpeningIndex);
        }
    }

    [Fact]
    public void ResolvePipeline_DefineCachesThePipeline_StillResolves()
    {
        // Caching violates DefineExecute's contract but must not become a hard error: the pipeline is immutable, and
        // this call's builder issued no handle of its own.
        ServiceTaskPipeline cached = ComposeStages(new PipelineBuilder.ServiceTask(), out MailboxHandle handle)
            .HandleReplies(handle, Handle, Closed);
        var task = new ScriptedTask(_ => cached);

        Assert.Same(cached, task.ResolvePipeline());
        Assert.Same(cached, task.ResolvePipeline());
    }

    private static StageContext TestContext() =>
        new()
        {
            InstanceDataMutator = null!,
            WorkflowId = Guid.NewGuid(),
            StepId = Guid.NewGuid(),
        };
}
