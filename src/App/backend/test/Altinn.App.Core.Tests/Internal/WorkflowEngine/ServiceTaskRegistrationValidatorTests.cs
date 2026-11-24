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

    private static Task<ServiceTaskResult> NoopStage(StageContext context) =>
        Task.FromResult(ServiceTaskResult.Completed());

    private static Task<ServiceTaskResult> NoopSend(StageContext context, ReplyAddress replyAddress) =>
        Task.FromResult(ServiceTaskResult.Completed());

    private static Task<ServiceTaskReplyResult> NoopReply(StageContext context, ServiceTaskReply reply) =>
        Task.FromResult(ServiceTaskReplyResult.Completed());

    // ── Well-formed tasks ────────────────────────────────────────────────────────────────────

    private sealed class SimpleTask : IServiceTask
    {
        public string Type => "simple";

        public void DefineExecute(PipelineBuilder.ServiceTask pipeline) => pipeline.Stage(Execute);

        public Task<ServiceTaskResult> Execute(StageContext context) => NoopStage(context);
    }

    private sealed class GoodPipelineTask : IServiceTask
    {
        public string Type => "good";

        public void DefineExecute(PipelineBuilder.ServiceTask pipeline) =>
            pipeline.Stage(NoopStage).ExternalStage(NoopSend, NoopReply).Stage(NoopStage);
    }

    [Fact]
    public async Task SimpleTask_PassesValidation()
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

        public void DefineExecute(PipelineBuilder.ServiceTask pipeline) =>
            pipeline
                .Stage(NoopStage, new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromSeconds(-5) })
                .Stage(NoopStage);
    }

    [Fact]
    public async Task InvalidPerStageOptions_FailStartup()
    {
        var exception = await Validate(s => s.AddSingleton<IServiceTask, InvalidStageOptionsTask>());

        Assert.NotNull(exception);
        Assert.Contains("defining the pipeline failed", exception.Message);
    }

    private sealed class TooLongTimeoutTask : IServiceTask
    {
        public string Type => "tooLongTimeout";

        public void DefineExecute(PipelineBuilder.ServiceTask pipeline) =>
            pipeline.ExternalStage(NoopSend, NoopReply, timeout: TimeSpan.FromDays(30));
    }

    [Fact]
    public async Task AnExternalStageTimeoutPastTheEnginesCap_FailsStartup()
    {
        var exception = await Validate(s => s.AddSingleton<IServiceTask, TooLongTimeoutTask>());

        Assert.NotNull(exception);
        Assert.Contains(typeof(TooLongTimeoutTask).FullName ?? "", exception.Message, StringComparison.Ordinal);
        Assert.Contains("timeout", exception.Message, StringComparison.Ordinal);
    }

    private sealed class ThrowingDefineTask : IServiceTask
    {
        public string Type => "throwingDefine";

        public void DefineExecute(PipelineBuilder.ServiceTask pipeline) =>
            throw new InvalidOperationException("no pipeline for you");
    }

    [Fact]
    public async Task DefineThrowing_FailsStartup_WithTheUnderlyingMessage()
    {
        var exception = await Validate(s => s.AddSingleton<IServiceTask, ThrowingDefineTask>());

        Assert.NotNull(exception);
        Assert.Contains("no pipeline for you", exception.Message);
    }

    private sealed class EmptyDefineTask : IServiceTask
    {
        public string Type => "emptyDefine";

        public void DefineExecute(PipelineBuilder.ServiceTask pipeline) { }
    }

    [Fact]
    public async Task DefineComposingNoStep_FailsStartup_NamingTheTaskType()
    {
        var exception = await Validate(s => s.AddSingleton<IServiceTask, EmptyDefineTask>());

        Assert.NotNull(exception);
        Assert.Contains(typeof(EmptyDefineTask).FullName ?? "", exception.Message, StringComparison.Ordinal);
        Assert.Contains(
            "'emptyDefine' service task would have nothing to run",
            exception.Message,
            StringComparison.Ordinal
        );
    }
}
