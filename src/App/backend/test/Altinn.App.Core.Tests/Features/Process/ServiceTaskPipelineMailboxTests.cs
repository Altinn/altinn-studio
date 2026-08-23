using Altinn.App.Core.Features.Process;
using Xunit;

namespace Altinn.App.Core.Tests.Features.Process;

/// <summary>
/// Composition of a mailbox exchange: what the mailbox-opening <c>Stage</c> overload records, what the reply
/// terminals record, and the four mistakes the builder refuses eagerly — a second mailbox, a handle from
/// another pipeline, a handle answered twice, and a mailbox nothing answers.
/// </summary>
public class ServiceTaskPipelineMailboxTests
{
    private static readonly MailboxOptions ThreeDays = new() { Timeout = TimeSpan.FromDays(3) };

    private static Task<ServiceTaskStageResult> Send(ServiceTaskContext context, ServiceTaskMailbox mailbox) =>
        Task.FromResult(ServiceTaskStageResult.Completed());

    private static Task<ServiceTaskResult> Conclude(ServiceTaskContext context, ServiceTaskReply reply) =>
        Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());

    private static Task<ServiceTaskExchangeResult> Handle(ServiceTaskContext context, ServiceTaskReply reply) =>
        Task.FromResult<ServiceTaskExchangeResult>(ServiceTaskExchangeResult.AwaitNextReply());

    private static Task<ServiceTaskResult> Closed(ServiceTaskContext context, MailboxClosedReason reason) =>
        Task.FromResult<ServiceTaskResult>(ServiceTaskResult.FailedPermanent("no answer"));

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

        Assert.Equal(["SendToArchive", "RecordDispatch"], pipeline.Stages.Select(s => s.Name));
        Assert.Equal(TimeSpan.FromDays(3), pipeline.FindStage("SendToArchive")!.OpensMailbox!.Timeout);
        Assert.Null(pipeline.FindStage("RecordDispatch")!.OpensMailbox);
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
    public void ConcludeOnReply_RecordsTheSameExchangeShapeWithTheHandlerWrapped()
    {
        // Single and multi are the same model: the compile-time split already happened at the API boundary.
        var options = new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(3) };

        ServiceTaskPipeline pipeline = ComposeStages(new ServiceTaskPipelineBuilder(), out MailboxHandle handle)
            .ConcludeOnReply(handle, Conclude, Closed, options);

        var exchange = Assert.IsType<PipelineConclusion.ReplyExchange>(pipeline.Conclusion);
        Assert.Equal("SendToArchive", exchange.OpeningStageName);
        Assert.Same(options, exchange.StepOptions);
    }

    [Fact]
    public async Task ConcludeOnReply_WrappedHandler_ForwardsArgumentsAndResult()
    {
        ServiceTaskContext? seenContext = null;
        ServiceTaskReply? seenReply = null;
        ServiceTaskResult answer = ServiceTaskResult.Success("reject");

        ServiceTaskPipeline pipeline = ComposeStages(new ServiceTaskPipelineBuilder(), out MailboxHandle handle)
            .ConcludeOnReply(
                handle,
                (context, reply) =>
                {
                    seenContext = context;
                    seenReply = reply;
                    return Task.FromResult(answer);
                },
                Closed
            );

        var exchange = Assert.IsType<PipelineConclusion.ReplyExchange>(pipeline.Conclusion);
        ServiceTaskContext context = TestContext();
        var reply = new ServiceTaskReply
        {
            Payload = "<receipt/>",
            IdempotencyKey = "source-message-7",
            AcceptedAt = DateTimeOffset.UtcNow,
            Position = 2,
        };

        ServiceTaskExchangeResult result = await exchange.OnMessage(context, reply);

        Assert.Same(context, seenContext);
        Assert.Same(reply, seenReply);
        Assert.Same(answer, result);
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
        await pipeline.FindStage("SendToArchive")!.Work(TestContext(), mailbox);

        Assert.Same(mailbox, seen);
    }

    [Fact]
    public void SecondMailbox_Throws()
    {
        InvalidOperationException exception = Assert.Throws<InvalidOperationException>(() =>
            new ServiceTaskPipelineBuilder()
                .Stage("SendToArchive", Send, ThreeDays, out MailboxHandle _)
                .Stage("SendToRegistry", Send, ThreeDays, out MailboxHandle _)
        );

        Assert.Contains(
            "already opens a mailbox from stage 'SendToArchive'",
            exception.Message,
            StringComparison.Ordinal
        );
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
            builder.ConcludeOnReply(handle, Conclude, Closed)
        );

        Assert.Contains("is already answered by a reply terminal", exception.Message, StringComparison.Ordinal);
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
    public void FinallyAfterAReplyTerminal_StillThrows()
    {
        // A pipeline with a mailbox-opening stage has no valid final step, whether or not a terminal already
        // answered the handle: the stage would send an address nothing reads.
        var builder = new ServiceTaskPipelineBuilder();
        builder.Stage("SendToArchive", Send, ThreeDays, out MailboxHandle handle);
        builder.ConcludeOnReplies(handle, Handle, Closed);

        Assert.Throws<InvalidOperationException>(() =>
            builder.Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()))
        );
    }

    [Fact]
    public void NoMailbox_FinallyStillEndsThePipeline()
    {
        ServiceTaskPipeline pipeline = new ServiceTaskPipelineBuilder()
            .Stage("SendToArchive", _ => Task.FromResult(ServiceTaskStageResult.Completed()))
            .Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()));

        Assert.IsType<PipelineConclusion.FinalStep>(pipeline.Conclusion);
        Assert.Null(pipeline.FindStage("SendToArchive")!.OpensMailbox);
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
