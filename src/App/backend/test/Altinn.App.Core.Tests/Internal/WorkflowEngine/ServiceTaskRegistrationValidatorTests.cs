using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

public class ServiceTaskRegistrationValidatorTests
{
    private static async Task<InvalidOperationException?> Validate(Action<IServiceCollection> register)
    {
        var services = new ServiceCollection();
        register(services);
        await using var sp = services.BuildServiceProvider();

        var validator = new ServiceTaskRegistrationValidator(
            sp.GetRequiredService<IServiceScopeFactory>(),
            NullLogger<ServiceTaskRegistrationValidator>.Instance
        );

        try
        {
            await validator.StartAsync(CancellationToken.None);
            return null;
        }
        catch (InvalidOperationException ex)
        {
            return ex;
        }
    }

    private static Task<ServiceTaskStageResult> NoopStage(ServiceTaskContext context) =>
        Task.FromResult(ServiceTaskStageResult.Completed());

    private static Task<ServiceTaskResult> NoopFinally(ServiceTaskContext context) =>
        Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());

    private static Task<ServiceTaskStageResult> NoopSend(ServiceTaskContext context, ServiceTaskMailbox mailbox) =>
        Task.FromResult(ServiceTaskStageResult.Completed());

    private static Task<ServiceTaskExchangeResult> NoopMessage(ServiceTaskContext context, ServiceTaskReply reply) =>
        Task.FromResult<ServiceTaskExchangeResult>(ServiceTaskResult.Success());

    private static Task<ServiceTaskResult> NoopClosed(ServiceTaskContext context, MailboxClosedReason reason) =>
        Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());

    // ── Well-formed tasks ────────────────────────────────────────────────────────────────────

    private sealed class SimpleTask : IServiceTask
    {
        public string Type => "simple";

        public Task<ServiceTaskResult> Execute(ServiceTaskContext context) => NoopFinally(context);
    }

    private sealed class GoodPipelineTask : IPipelineServiceTask
    {
        public string Type => "good";

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline.Stage("Send", NoopStage).Finally(NoopFinally);
    }

    [Fact]
    public async Task SimpleTask_TheForwardingDefaultPipeline_PassesValidation()
    {
        var exception = await Validate(s => s.AddSingleton<IServiceTask, SimpleTask>());

        Assert.Null(exception);
    }

    [Fact]
    public async Task PipelineTask_PassesValidation()
    {
        var exception = await Validate(s => s.AddSingleton<IPipelineServiceTask, GoodPipelineTask>());

        Assert.Null(exception);
    }

    [Fact]
    public async Task NoServiceTasksAtAll_PassesValidation()
    {
        var exception = await Validate(_ => { });

        Assert.Null(exception);
    }

    // ── Pipeline definitions ─────────────────────────────────────────────────────────────────

    private sealed class DuplicateStageNamesTask : IPipelineServiceTask
    {
        public string Type => "duplicateNames";

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline.Stage("stage", NoopStage).Stage("stage", NoopStage).Finally(NoopFinally);
    }

    [Fact]
    public async Task DuplicateStageNames_FailStartup()
    {
        // The builder rejects the duplicate eagerly; the validator surfaces it as a boot failure.
        var exception = await Validate(s => s.AddSingleton<IPipelineServiceTask, DuplicateStageNamesTask>());

        Assert.NotNull(exception);
        Assert.Contains("Duplicate stage name 'stage'", exception.Message);
    }

    private sealed class EmptyStageNameTask : IPipelineServiceTask
    {
        public string Type => "emptyName";

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline.Stage("  ", NoopStage).Finally(NoopFinally);
    }

    [Fact]
    public async Task EmptyStageName_FailsStartup()
    {
        var exception = await Validate(s => s.AddSingleton<IPipelineServiceTask, EmptyStageNameTask>());

        Assert.NotNull(exception);
        Assert.Contains(nameof(EmptyStageNameTask), exception.Message);
    }

    private sealed class NonAsciiStageNameTask : IPipelineServiceTask
    {
        public string Type => "nonAsciiName";

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline.Stage("Send · Arkiv", NoopStage).Finally(NoopFinally);
    }

    [Fact]
    public async Task NonAsciiStageName_FailsStartup_PointingAtTheHeaderBoundary()
    {
        // Stage names flow into the engine step's OperationId, which the engine forwards as an
        // HTTP header — a non-ASCII name would poison every callback into a retry loop, so the
        // builder rejects it at compose time and the validator surfaces it at boot.
        var exception = await Validate(s => s.AddSingleton<IPipelineServiceTask, NonAsciiStageNameTask>());

        Assert.NotNull(exception);
        Assert.Contains("printable ASCII", exception.Message);
    }

    private sealed class InvalidStageOptionsTask : IPipelineServiceTask
    {
        public string Type => "invalidOptions";

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage("Send", NoopStage, new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromSeconds(-5) })
                .Finally(NoopFinally);
    }

    [Fact]
    public async Task InvalidPerStageOptions_FailStartup()
    {
        var exception = await Validate(s => s.AddSingleton<IPipelineServiceTask, InvalidStageOptionsTask>());

        Assert.NotNull(exception);
        Assert.Contains("defining the pipeline failed", exception.Message);
    }

    private sealed class ThrowingDefineTask : IPipelineServiceTask
    {
        public string Type => "throwingDefine";

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            throw new InvalidOperationException("no pipeline for you");
    }

    [Fact]
    public async Task DefineThrowing_FailsStartup_WithTheUnderlyingMessage()
    {
        var exception = await Validate(s => s.AddSingleton<IPipelineServiceTask, ThrowingDefineTask>());

        Assert.NotNull(exception);
        Assert.Contains("no pipeline for you", exception.Message);
    }

    private sealed class NullDefineTask : IPipelineServiceTask
    {
        public string Type => "nullDefine";

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) => null!;
    }

    [Fact]
    public async Task DefineReturningNull_FailsStartup()
    {
        var exception = await Validate(s => s.AddSingleton<IPipelineServiceTask, NullDefineTask>());

        Assert.NotNull(exception);
        Assert.Contains("Define returned null", exception.Message);
    }

    // ── The sealed forwarding Define (backstop for the ALTINNAPP0700 analyzer) ──────────────

    private sealed class UnansweredMailboxTask : IPipelineServiceTask
    {
        public string Type => "unansweredMailbox";

        // The violation: a stage opens a mailbox and the pipeline ends with Finally, so nothing answers the
        // messages that come back.
        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage("Send", NoopSend, new MailboxOptions { Timeout = TimeSpan.FromDays(3) }, out MailboxHandle _)
                .Finally(NoopFinally);
    }

    [Fact]
    public async Task PipelineTaskOpeningAMailboxNothingAnswers_FailsStartup()
    {
        var exception = await Validate(s => s.AddSingleton<IPipelineServiceTask, UnansweredMailboxTask>());

        Assert.NotNull(exception);
        Assert.Contains("Stage 'Send' opens a mailbox", exception.Message, StringComparison.Ordinal);
        Assert.Contains(
            nameof(ServiceTaskPipelineBuilder.ConcludeOnReplies),
            exception.Message,
            StringComparison.Ordinal
        );
    }

    private sealed class ForeignMailboxHandleTask : IPipelineServiceTask
    {
        public string Type => "foreignMailboxHandle";

        private static readonly MailboxHandle _cached = CacheAHandle();

        private static MailboxHandle CacheAHandle()
        {
            new ServiceTaskPipelineBuilder().Stage(
                "Send",
                NoopSend,
                new MailboxOptions { Timeout = TimeSpan.FromDays(3) },
                out MailboxHandle handle
            );
            return handle;
        }

        // The violation: a handle cached from an earlier Define call belongs to that call's builder.
        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage("Send", NoopSend, new MailboxOptions { Timeout = TimeSpan.FromDays(3) }, out MailboxHandle _)
                .ConcludeOnReplies(_cached, NoopMessage, NoopClosed);
    }

    [Fact]
    public async Task PipelineTaskAnsweringAnotherPipelinesMailbox_FailsStartup()
    {
        var exception = await Validate(s => s.AddSingleton<IPipelineServiceTask, ForeignMailboxHandleTask>());

        Assert.NotNull(exception);
        Assert.Contains("belongs to another task's pipeline", exception.Message, StringComparison.Ordinal);
    }

    private sealed class ReplacedDefineTask : IServiceTask
    {
        public string Type => "replacedDefine";

        public Task<ServiceTaskResult> Execute(ServiceTaskContext context) => NoopFinally(context);

        // The violation: an IServiceTask providing its own Define, silently turning Execute into
        // dead code. (Suppressing the compile-time diagnostic here would be circular — this test
        // project doesn't run the app-facing analyzer.)
        ServiceTaskPipeline IPipelineServiceTask.Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline.Finally(NoopFinally);
    }

    [Fact]
    public async Task ServiceTaskReplacingTheForwardingDefine_FailsStartup()
    {
        var exception = await Validate(s => s.AddSingleton<IServiceTask, ReplacedDefineTask>());

        Assert.NotNull(exception);
        Assert.Contains("replaces", exception.Message);
        Assert.Contains("would never run", exception.Message);
        Assert.Contains(nameof(IPipelineServiceTask), exception.Message);
    }
}
