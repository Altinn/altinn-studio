using Altinn.App.Core.Features.Process;
using Xunit;

namespace Altinn.App.Core.Tests.Features.Process;

/// <summary>
/// Composition of <see cref="ServiceTaskPipeline.WithReplyFrom"/>: what it accepts, what it refuses eagerly, and
/// the two properties the shape rests on — that it returns a new pipeline rather than changing the one it was
/// called on, and that discarding that return value is caught instead of silently dropping the mailbox.
/// </summary>
public class ServiceTaskPipelineMailboxTests
{
    private static readonly MailboxOptions ThreeDays = new() { Timeout = TimeSpan.FromDays(3) };

    private static ServiceTaskPipeline Compose(ServiceTaskPipelineBuilder builder) =>
        builder
            .Stage("SendToArchive", _ => Task.FromResult(ServiceTaskStageResult.Completed()))
            .Stage("RecordDispatch", _ => Task.FromResult(ServiceTaskStageResult.Completed()))
            .Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()));

    private static ServiceTaskPipeline Compose() => Compose(new ServiceTaskPipelineBuilder());

    /// <summary>A pipeline task whose <c>Define</c> the test scripts, so composition mistakes can be
    /// pushed through the runtime's own resolution path.</summary>
    private sealed class ScriptedTask(Func<ServiceTaskPipelineBuilder, ServiceTaskPipeline> define)
        : IPipelineServiceTask
    {
        public string Type => "archiving";

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) => define(pipeline);
    }

    [Fact]
    public void WithReplyFrom_RecordsTheStageAndOptions()
    {
        ServiceTaskPipeline pipeline = Compose().WithReplyFrom("SendToArchive", ThreeDays);

        Assert.NotNull(pipeline.Mailbox);
        Assert.Equal("SendToArchive", pipeline.Mailbox!.StageName);
        Assert.Equal(TimeSpan.FromDays(3), pipeline.Mailbox.Options.Timeout);
    }

    [Fact]
    public void WithReplyFrom_KeepsEverythingElseTheComposedPipelineHad()
    {
        ServiceTaskPipeline source = Compose();
        ServiceTaskPipeline declared = source.WithReplyFrom("SendToArchive", ThreeDays);

        Assert.Equal(["SendToArchive", "RecordDispatch"], declared.Stages.Select(s => s.Name));
        Assert.Same(source.Stages, declared.Stages);
        Assert.Same(source.Final, declared.Final);
        Assert.Same(source.FinalStepOptions, declared.FinalStepOptions);
    }

    [Fact]
    public void WithReplyFrom_ReturnsANewPipelineAndLeavesTheSourceUndeclared()
    {
        ServiceTaskPipeline source = Compose();

        ServiceTaskPipeline declared = source.WithReplyFrom("SendToArchive", ThreeDays);

        Assert.NotSame(source, declared);
        Assert.Null(source.Mailbox);
        Assert.NotNull(declared.Mailbox);
    }

    [Fact]
    public void WithReplyFrom_UnknownStage_ThrowsNamingTheStagesComposed()
    {
        ArgumentException exception = Assert.Throws<ArgumentException>(() =>
            Compose().WithReplyFrom("SendToRegistry", ThreeDays)
        );

        Assert.Contains("SendToRegistry", exception.Message, StringComparison.Ordinal);
        Assert.Contains("'SendToArchive', 'RecordDispatch'", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void WithReplyFrom_OnAPipelineWithNoStages_Throws()
    {
        ServiceTaskPipeline conclusionOnly = new ServiceTaskPipelineBuilder().Finally(_ =>
            Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success())
        );

        ArgumentException exception = Assert.Throws<ArgumentException>(() =>
            conclusionOnly.WithReplyFrom("SendToArchive", ThreeDays)
        );

        Assert.Contains("Stages composed: none", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void WithReplyFrom_Twice_Throws()
    {
        ServiceTaskPipeline declared = Compose().WithReplyFrom("SendToArchive", ThreeDays);

        InvalidOperationException exception = Assert.Throws<InvalidOperationException>(() =>
            declared.WithReplyFrom("RecordDispatch", ThreeDays)
        );

        Assert.Contains(
            "already opens a mailbox from stage 'SendToArchive'",
            exception.Message,
            StringComparison.Ordinal
        );
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void WithReplyFrom_NonPositiveTimeout_Throws(int hours)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() =>
            Compose().WithReplyFrom("SendToArchive", new MailboxOptions { Timeout = TimeSpan.FromHours(hours) })
        );
    }

    [Fact]
    public void WithReplyFrom_NullArguments_Throw()
    {
        Assert.Throws<ArgumentNullException>(() => Compose().WithReplyFrom("SendToArchive", null!));
        Assert.Throws<ArgumentNullException>(() => Compose().WithReplyFrom(null!, ThreeDays));
        Assert.Throws<ArgumentException>(() => Compose().WithReplyFrom("  ", ThreeDays));
    }

    [Fact]
    public void ResolvePipeline_DefineDiscardedTheDeclaration_Throws()
    {
        var task = new ScriptedTask(builder =>
        {
            ServiceTaskPipeline pipeline = Compose(builder);
            pipeline.WithReplyFrom("SendToArchive", ThreeDays);
            return pipeline;
        });

        InvalidOperationException exception = Assert.Throws<InvalidOperationException>(() => task.ResolvePipeline());

        Assert.Contains("returned the pipeline from before it", exception.Message, StringComparison.Ordinal);
        Assert.Contains(nameof(ServiceTaskPipeline.WithReplyFrom), exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void ResolvePipeline_DefineReturnedTheDeclaration_Resolves()
    {
        var task = new ScriptedTask(builder => Compose(builder).WithReplyFrom("SendToArchive", ThreeDays));

        ServiceTaskPipeline pipeline = task.ResolvePipeline();

        Assert.Equal("SendToArchive", pipeline.Mailbox!.StageName);
    }

    [Fact]
    public void ResolvePipeline_DefineCachesTheDeclaredPipeline_StillResolves()
    {
        // Caching violates Define's contract but must not become a hard error here: the returned pipeline
        // carries the declaration, and this call's builder never saw WithReplyFrom.
        ServiceTaskPipeline cached = Compose().WithReplyFrom("SendToArchive", ThreeDays);
        var task = new ScriptedTask(_ => cached);

        Assert.Equal("SendToArchive", task.ResolvePipeline().Mailbox!.StageName);
        Assert.Equal("SendToArchive", task.ResolvePipeline().Mailbox!.StageName);
    }

    [Fact]
    public void ResolvePipeline_DefineDeclaresFromACachedUndeclaredBaseEachCall_ResolvesEveryTime()
    {
        // The shape that broke under the mutable pipeline: a cached undeclared base, WithReplyFrom per Define.
        ServiceTaskPipeline cachedBase = Compose();
        var task = new ScriptedTask(_ => cachedBase.WithReplyFrom("SendToArchive", ThreeDays));

        Assert.Equal("SendToArchive", task.ResolvePipeline().Mailbox!.StageName);
        Assert.Equal("SendToArchive", task.ResolvePipeline().Mailbox!.StageName);
        Assert.Null(cachedBase.Mailbox);
    }

    [Fact]
    public void ResolvePipeline_SharedBaseDeclaredByOneTask_DoesNotPoisonAnother()
    {
        // A shared base: A's declaration marks A's per-call builder, so it cannot latch the base and fail B.
        ServiceTaskPipeline sharedBase = Compose();
        var taskA = new ScriptedTask(_ => sharedBase.WithReplyFrom("SendToArchive", ThreeDays));
        var taskB = new ScriptedTask(_ => sharedBase);

        Assert.Equal("SendToArchive", taskA.ResolvePipeline().Mailbox!.StageName);
        Assert.Null(taskB.ResolvePipeline().Mailbox);
    }
}
