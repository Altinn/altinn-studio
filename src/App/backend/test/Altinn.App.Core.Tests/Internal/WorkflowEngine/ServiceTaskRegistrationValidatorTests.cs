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
        await using var provider = services.BuildServiceProvider(new ServiceProviderOptions { ValidateScopes = true });
        var validator = new ServiceTaskRegistrationValidator(
            provider.GetRequiredService<IServiceScopeFactory>(),
            NullLogger<ServiceTaskRegistrationValidator>.Instance
        );
        return (InvalidOperationException?)
            await Record.ExceptionAsync(() => validator.StartAsync(CancellationToken.None));
    }

    private static Task<StageResult> NoopStage(StageContext context) => Task.FromResult(StageResult.Completed());

    private static Task<ServiceTaskResult> NoopFinally(StageContext context) =>
        Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());

    private static Task<ServiceTaskOpeningStageResult> NoopSend(StageContext context, ServiceTaskMailbox mailbox) =>
        Task.FromResult(ServiceTaskOpeningStageResult.Completed());

    private static Task<ServiceTaskExchangeResult> NoopMessage(StageContext context, ServiceTaskReply reply) =>
        Task.FromResult<ServiceTaskExchangeResult>(ServiceTaskResult.Success());

    private static Task<ServiceTaskResult> NoopClosed(StageContext context, MailboxClosedReason reason) =>
        Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());

    // ── Well-formed tasks ────────────────────────────────────────────────────────────────────

    private sealed class SimpleTask : IServiceTask
    {
        public string Type => "simple";

        public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) => pipeline.Finally(Execute);

        public Task<ServiceTaskResult> Execute(StageContext context) => NoopFinally(context);
    }

    private sealed class GoodPipelineTask : IServiceTask
    {
        public string Type => "good";

        public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) =>
            pipeline.Stage(NoopStage).Finally(NoopFinally);
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
        var exception = await Validate(s => s.AddSingleton<IServiceTask, GoodPipelineTask>());

        Assert.Null(exception);
    }

    [Fact]
    public async Task NoServiceTasksAtAll_PassesValidation()
    {
        var exception = await Validate(_ => { });

        Assert.Null(exception);
    }

    // ── Pipeline definitions ─────────────────────────────────────────────────────────────────

    private sealed class InvalidStageOptionsTask : IServiceTask
    {
        public string Type => "invalidOptions";

        public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) =>
            pipeline
                .Stage(NoopStage, new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromSeconds(-5) })
                .Finally(NoopFinally);
    }

    [Fact]
    public async Task InvalidPerStageOptions_FailStartup()
    {
        var exception = await Validate(s => s.AddSingleton<IServiceTask, InvalidStageOptionsTask>());

        Assert.NotNull(exception);
        Assert.Contains("defining the pipeline failed", exception.Message);
    }

    private sealed class ThrowingDefineTask : IServiceTask
    {
        public string Type => "throwingDefine";

        public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) =>
            throw new InvalidOperationException("no pipeline for you");
    }

    [Fact]
    public async Task DefineThrowing_FailsStartup_WithTheUnderlyingMessage()
    {
        var exception = await Validate(s => s.AddSingleton<IServiceTask, ThrowingDefineTask>());

        Assert.NotNull(exception);
        Assert.Contains("no pipeline for you", exception.Message);
    }

    private sealed class NullDefineTask : IServiceTask
    {
        public string Type => "nullDefine";

        public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) => null!;
    }

    [Fact]
    public async Task DefineReturningNull_FailsStartup()
    {
        var exception = await Validate(s => s.AddSingleton<IServiceTask, NullDefineTask>());

        Assert.NotNull(exception);
        Assert.Contains("DefineExecute returned null", exception.Message);
    }

    // ── Mailbox composition ──────────────────────────────────────────────────────────────────

    private sealed class UnansweredMailboxTask : IServiceTask
    {
        public string Type => "unansweredMailbox";

        // The violation: a stage opens a mailbox and the pipeline ends with Finally, so nothing answers the
        // messages that come back.
        public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) =>
            pipeline
                .Stage(NoopSend, new MailboxOptions { Timeout = TimeSpan.FromDays(3) }, out MailboxHandle _)
                .Finally(NoopFinally);
    }

    [Fact]
    public async Task PipelineTaskOpeningAMailboxNothingAnswers_FailsStartup()
    {
        var exception = await Validate(s => s.AddSingleton<IServiceTask, UnansweredMailboxTask>());

        Assert.NotNull(exception);
        Assert.Contains("opened at index 0", exception.Message, StringComparison.Ordinal);
        Assert.Contains("nothing answers it", exception.Message, StringComparison.Ordinal);
        // The startup surface points at both handler positions, as the builder's own guidance does.
        Assert.Contains(nameof(PipelineBuilder.ConcludeOnReplies), exception.Message, StringComparison.Ordinal);
        Assert.Contains(nameof(PipelineBuilder.HandleReplies), exception.Message, StringComparison.Ordinal);
    }

    private sealed class ForeignMailboxHandleTask : IServiceTask
    {
        public string Type => "foreignMailboxHandle";

        private static readonly MailboxHandle _cached = CacheAHandle();

        private static MailboxHandle CacheAHandle()
        {
            new PipelineBuilder().Stage(
                NoopSend,
                new MailboxOptions { Timeout = TimeSpan.FromDays(3) },
                out MailboxHandle handle
            );
            return handle;
        }

        // The violation: a handle cached from an earlier DefineExecute call belongs to that call's builder.
        public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) =>
            pipeline
                .Stage(NoopSend, new MailboxOptions { Timeout = TimeSpan.FromDays(3) }, out MailboxHandle _)
                .ConcludeOnReplies(_cached, NoopMessage, NoopClosed);
    }

    [Fact]
    public async Task PipelineTaskAnsweringAnotherPipelinesMailbox_FailsStartup()
    {
        var exception = await Validate(s => s.AddSingleton<IServiceTask, ForeignMailboxHandleTask>());

        Assert.NotNull(exception);
        Assert.Contains("belongs to another task's pipeline", exception.Message, StringComparison.Ordinal);
    }
}
