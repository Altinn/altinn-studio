using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Tests.Internal.Process.TestUtils;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Testing;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

public class ServiceTaskRegistrationValidatorTests
{
    private sealed record ValidationRun(
        InvalidOperationException? Exception,
        FakeLogger<ServiceTaskRegistrationValidator> Logger
    );

    /// <summary>
    /// Boots the validator over <paramref name="register"/>'s registrations plus stand-ins for the built-in
    /// process task types.
    /// </summary>
    private static async Task<ValidationRun> Run(
        Action<IServiceCollection> register,
        IProcessReader? processReader = null
    )
    {
        var services = new ServiceCollection();
        foreach (string builtIn in new[] { "data", "confirmation", "feedback", "signing", "payment", "NullType" })
        {
            services.AddSingleton<IProcessTask>(new BuiltInLikeProcessTask(builtIn));
        }

        register(services);
        if (processReader is not null)
        {
            services.AddSingleton(processReader);
        }

        // ValidateScopes on, as on a developer machine: resolving a scoped dependency from the root provider throws.
        await using var sp = services.BuildServiceProvider(new ServiceProviderOptions { ValidateScopes = true });

        var logger = new FakeLogger<ServiceTaskRegistrationValidator>();
        var validator = new ServiceTaskRegistrationValidator(sp.GetRequiredService<IServiceScopeFactory>(), logger);

        try
        {
            await validator.StartAsync(CancellationToken.None);
            return new ValidationRun(null, logger);
        }
        catch (InvalidOperationException ex)
        {
            return new ValidationRun(ex, logger);
        }
    }

    private static async Task<InvalidOperationException?> Validate(
        Action<IServiceCollection> register,
        IProcessReader? processReader = null
    ) => (await Run(register, processReader)).Exception;

    private sealed class BuiltInLikeProcessTask(string type) : IProcessTask
    {
        public string Type => type;
    }

    private static Task<ServiceTaskStageResult> NoopStage(ServiceTaskContext context) =>
        Task.FromResult(ServiceTaskStageResult.Completed());

    private static Task<ServiceTaskResult> NoopFinally(ServiceTaskContext context) =>
        Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());

    private static Task<ServiceTaskOpeningStageResult> NoopSend(
        ServiceTaskContext context,
        ServiceTaskMailbox mailbox
    ) => Task.FromResult(ServiceTaskOpeningStageResult.Completed());

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

    private sealed class InvalidStageOptionsTask : IPipelineServiceTask
    {
        public string Type => "invalidOptions";

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage(NoopStage, new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromSeconds(-5) })
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
                .Stage(NoopSend, new MailboxOptions { Timeout = TimeSpan.FromDays(3) }, out MailboxHandle _)
                .Finally(NoopFinally);
    }

    [Fact]
    public async Task PipelineTaskOpeningAMailboxNothingAnswers_FailsStartup()
    {
        var exception = await Validate(s => s.AddSingleton<IPipelineServiceTask, UnansweredMailboxTask>());

        Assert.NotNull(exception);
        Assert.Contains("opened at index 0", exception.Message, StringComparison.Ordinal);
        Assert.Contains("nothing answers it", exception.Message, StringComparison.Ordinal);
        // The startup surface points at both handler positions, as the builder's own guidance does.
        Assert.Contains(
            nameof(ServiceTaskPipelineBuilder.ConcludeOnReplies),
            exception.Message,
            StringComparison.Ordinal
        );
        Assert.Contains(nameof(ServiceTaskPipelineBuilder.HandleReplies), exception.Message, StringComparison.Ordinal);
    }

    private sealed class ForeignMailboxHandleTask : IPipelineServiceTask
    {
        public string Type => "foreignMailboxHandle";

        private static readonly MailboxHandle _cached = CacheAHandle();

        private static MailboxHandle CacheAHandle()
        {
            new ServiceTaskPipelineBuilder().Stage(
                NoopSend,
                new MailboxOptions { Timeout = TimeSpan.FromDays(3) },
                out MailboxHandle handle
            );
            return handle;
        }

        // The violation: a handle cached from an earlier Define call belongs to that call's builder.
        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage(NoopSend, new MailboxOptions { Timeout = TimeSpan.FromDays(3) }, out MailboxHandle _)
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

    // ── The process definition's half of the invariant ────────────────────────────────

    private sealed class PdfLikeTask : IServiceTask
    {
        public string Type => "pdf";

        public Task<ServiceTaskResult> Execute(ServiceTaskContext context) => NoopFinally(context);
    }

    private sealed class ShoutyPdfLikeTask : IServiceTask
    {
        public string Type => "PDF";

        public Task<ServiceTaskResult> Execute(ServiceTaskContext context) => NoopFinally(context);
    }

    private sealed class ArchiveTask : IServiceTask
    {
        public string Type => "archive";

        public Task<ServiceTaskResult> Execute(ServiceTaskContext context) => NoopFinally(context);
    }

    // Only <altinn:taskType> is read, as at runtime: a <bpmn:serviceTask> and a <bpmn:task> are checked alike.
    [Theory]
    [InlineData("pdf-service-task.bpmn", "Task_Pdf", "pdf")]
    [InlineData("plain-task-custom-type.bpmn", "Task_Custom", "archive")]
    public async Task ProcessTaskNoImplementationIsRegisteredFor_FailsStartup(
        string bpmn,
        string taskId,
        string taskType
    )
    {
        var exception = await Validate(
            s => s.AddSingleton<IServiceTask, SimpleTask>(),
            ProcessTestUtils.SetupProcessReader(bpmn)
        );

        Assert.NotNull(exception);
        Assert.Contains(taskId, exception.Message, StringComparison.Ordinal);
        Assert.Contains($"<altinn:taskType>{taskType}</altinn:taskType>", exception.Message, StringComparison.Ordinal);
        // The registered types are named once, as a trailing entry.
        Assert.Contains("'simple'", exception.Message, StringComparison.Ordinal);
        Assert.Contains("'data'", exception.Message, StringComparison.Ordinal);
        Assert.Single(
            exception.Message.Split(Environment.NewLine),
            line => line.Contains("Registered task types:", StringComparison.Ordinal)
        );
    }

    [Theory]
    [InlineData("pdf-service-task.bpmn", typeof(PdfLikeTask))]
    [InlineData("plain-task-custom-type.bpmn", typeof(ArchiveTask))]
    public async Task ProcessTaskWithARegisteredImplementation_PassesValidation(string bpmn, Type implementation)
    {
        var exception = await Validate(
            s => s.AddSingleton(typeof(IServiceTask), implementation),
            ProcessTestUtils.SetupProcessReader(bpmn)
        );

        Assert.Null(exception);
    }

    [Fact]
    public async Task ProcessTaskWithABlankTaskType_FailsStartup_WhateverElementCarriesIt()
    {
        // The shape Studio's generic service task palette entry produces, and the same omission on a <bpmn:task>.
        var exception = await Validate(
            s => s.AddSingleton<IServiceTask, PdfLikeTask>(),
            ProcessTestUtils.SetupProcessReader("service-task-empty-type.bpmn")
        );

        Assert.NotNull(exception);
        Assert.Contains("Task_Generic", exception.Message, StringComparison.Ordinal);
        Assert.Contains("Task_Blank", exception.Message, StringComparison.Ordinal);
        Assert.Contains(
            "has no task type: its <altinn:taskType> is missing or blank",
            exception.Message,
            StringComparison.Ordinal
        );
        // The registered types are what the blank gets filled in with.
        Assert.Contains("Registered task types:", exception.Message, StringComparison.Ordinal);
        Assert.Contains("'pdf'", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task ProcessTaskTypeDifferingOnlyInCase_FailsStartup()
    {
        // Matched exactly, as dispatch does: 'PDF' never answers for 'pdf'.
        var exception = await Validate(
            s => s.AddSingleton<IServiceTask, ShoutyPdfLikeTask>(),
            ProcessTestUtils.SetupProcessReader("pdf-service-task.bpmn")
        );

        Assert.NotNull(exception);
        Assert.Contains("Task_Pdf", exception.Message, StringComparison.Ordinal);
        Assert.Contains("matched exactly, including case", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task ProcessWithOnlyBuiltInTaskTypes_PassesValidation_WithNoServiceTasksRegistered()
    {
        var exception = await Validate(_ => { }, ProcessTestUtils.SetupProcessReader("simple-linear.bpmn"));

        Assert.Null(exception);
    }

    [Fact]
    public async Task BuiltInTaskTypeTheAppNeverEnabled_NamesItsBuilderCall_NotAnAddTransient()
    {
        var exception = await Validate(_ => { }, ProcessTestUtils.SetupProcessReader("fiks-arkiv-service-task.bpmn"));

        Assert.NotNull(exception);
        Assert.Contains("Task_Arkiv", exception.Message, StringComparison.Ordinal);
        Assert.Contains("services.AddFiksArkiv()", exception.Message, StringComparison.Ordinal);
        Assert.DoesNotContain("AddTransient", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task AnInvalidPipelineAndAnUnresolvableProcessTask_BothAppearInOneStartupFailure()
    {
        var exception = await Validate(
            s => s.AddSingleton<IPipelineServiceTask, InvalidStageOptionsTask>(),
            ProcessTestUtils.SetupProcessReader("plain-task-custom-type.bpmn")
        );

        Assert.NotNull(exception);
        Assert.Contains("defining the pipeline failed", exception.Message, StringComparison.Ordinal);
        Assert.Contains("Task_Custom", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task UnreadableProcessDefinition_StandsDown_WithAWarningSayingSo()
    {
        var processReader = new Mock<IProcessReader>(MockBehavior.Strict);
        processReader.Setup(r => r.GetProcessTasks()).Throws(new InvalidOperationException("no process definition"));

        var run = await Run(_ => { }, processReader.Object);

        Assert.Null(run.Exception);
        FakeLogRecord warning = Assert.Single(
            run.Logger.Collector.GetSnapshot(),
            record => record.Level == LogLevel.Warning
        );
        Assert.Contains("Could not read the process definition", warning.Message, StringComparison.Ordinal);
        Assert.Equal("no process definition", warning.Exception?.Message);
    }

    private sealed class ScopedDependency;

    private sealed class ScopedDependentTask : IServiceTask
    {
        public ScopedDependentTask(ScopedDependency dependency) => _ = dependency;

        public string Type => "scoped";

        public Task<ServiceTaskResult> Execute(ServiceTaskContext context) => NoopFinally(context);
    }

    [Fact]
    public async Task ServiceTaskNeedingAScopedDependency_IsStillResolved_SoTheCheckArms()
    {
        // Resolved in the validator's own scope; the root provider could not construct this task.
        var run = await Run(
            s =>
            {
                s.AddScoped<ScopedDependency>();
                s.AddTransient<IServiceTask, ScopedDependentTask>();
            },
            ProcessTestUtils.SetupProcessReader("plain-task-custom-type.bpmn")
        );

        Assert.NotNull(run.Exception);
        Assert.Contains("Task_Custom", run.Exception.Message, StringComparison.Ordinal);
        Assert.Contains("'scoped'", run.Exception.Message, StringComparison.Ordinal);
        Assert.Empty(run.Logger.Collector.GetSnapshot());
    }
}
