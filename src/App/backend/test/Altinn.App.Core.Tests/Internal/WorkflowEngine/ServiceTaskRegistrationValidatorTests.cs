using Altinn.App.Core.Features;
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
    /// Boots the validator over a service collection holding <paramref name="register"/>'s registrations
    /// plus the built-in process task types every app gets from <c>AddAltinnAppServices</c> — a process
    /// definition's ordinary <c>data</c>/<c>confirmation</c> tasks resolve here exactly as they do in a
    /// real app. Stand-ins rather than the real classes, whose constructors would drag in the platform.
    /// </summary>
    private static async Task<ValidationRun> Run(
        Action<IServiceCollection> register,
        IProcessReader? processReader = null
    )
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        foreach (string builtIn in new[] { "data", "confirmation", "feedback", "signing", "payment", "NullType" })
        {
            services.AddSingleton<IProcessTask>(new BuiltInLikeProcessTask(builtIn));
        }

        register(services);
        if (processReader is not null)
        {
            services.AddSingleton(processReader);
        }

        // Scope validation on, as a developer machine has it: a task resolved from the root provider
        // rather than from the validator's own scope throws here instead of passing quietly.
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
    //
    // The rule never looks at the BPMN element type, because the runtime never does: a task is what its
    // <altinn:taskType> resolves to. So a <bpmn:serviceTask> typed 'data' is an ordinary data task, and
    // a <bpmn:task> typed 'archive' is a service task.

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

    [Fact]
    public async Task ProcessTaskNoImplementationIsRegisteredFor_FailsStartup()
    {
        var exception = await Validate(
            s => s.AddSingleton<IServiceTask, SimpleTask>(),
            ProcessTestUtils.SetupProcessReader("pdf-service-task.bpmn")
        );

        Assert.NotNull(exception);
        Assert.Contains("Task_Pdf", exception.Message, StringComparison.Ordinal);
        Assert.Contains("<altinn:taskType>pdf</altinn:taskType>", exception.Message, StringComparison.Ordinal);
        // What is registered is named too, so a typo is fixable from the startup failure alone — and
        // once, as a trailing entry, rather than repeated on every error.
        Assert.Contains("'simple'", exception.Message, StringComparison.Ordinal);
        Assert.Contains("'data'", exception.Message, StringComparison.Ordinal);
        Assert.Equal(1, CountOccurrences(exception.Message, "Registered task types:"));
    }

    [Fact]
    public async Task ProcessTaskWithABlankTaskType_FailsStartup_WhateverElementCarriesIt()
    {
        // The shape Studio's generic service task palette entry produces, deployed before the developer
        // filled the task type in — and the same omission on an ordinary <bpmn:task>.
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
    }

    [Fact]
    public async Task ProcessTaskWithARegisteredImplementation_PassesValidation()
    {
        var exception = await Validate(
            s => s.AddSingleton<IServiceTask, PdfLikeTask>(),
            ProcessTestUtils.SetupProcessReader("pdf-service-task.bpmn")
        );

        Assert.Null(exception);
    }

    [Fact]
    public async Task PlainBpmnTaskWithARegisteredServiceTaskType_PassesValidation()
    {
        // Every service task in this repository's own workflow-engine scenarios is drawn this way.
        var exception = await Validate(
            s => s.AddSingleton<IServiceTask, ArchiveTask>(),
            ProcessTestUtils.SetupProcessReader("plain-task-custom-type.bpmn")
        );

        Assert.Null(exception);
    }

    [Fact]
    public async Task PlainBpmnTaskWithAnUnregisteredType_FailsStartup()
    {
        // The half the old <bpmn:serviceTask> scoping missed entirely.
        var exception = await Validate(
            s => s.AddSingleton<IServiceTask, PdfLikeTask>(),
            ProcessTestUtils.SetupProcessReader("plain-task-custom-type.bpmn")
        );

        Assert.NotNull(exception);
        Assert.Contains("Task_Custom", exception.Message, StringComparison.Ordinal);
        Assert.Contains("<altinn:taskType>archive</altinn:taskType>", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task ProcessTaskTypeDifferingOnlyInCase_FailsStartup()
    {
        // The validator agrees with what actually runs. ProcessTaskResolver matches Type exactly, so
        // 'PDF' never answers for 'pdf' — the enqueue path's case-insensitive lookup finds it, and the
        // first transition then throws ProcessException from dispatch. Passing this would be the
        // validator promising a boot the app cannot keep.
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
        // The likeliest real trigger: the process is drawn in Studio and the client wired up later.
        // Telling the developer to write an IServiceTask would send them to reimplement what ships.
        var exception = await Validate(_ => { }, ProcessTestUtils.SetupProcessReader("fiks-arkiv-service-task.bpmn"));

        Assert.NotNull(exception);
        Assert.Contains("Task_Arkiv", exception.Message, StringComparison.Ordinal);
        Assert.Contains("services.AddFiksArkiv()", exception.Message, StringComparison.Ordinal);
        Assert.DoesNotContain("AddTransient", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task AnInvalidPipelineAndAnUnresolvableProcessTask_BothAppearInOneStartupFailure()
    {
        // The whole point of collecting into one list: a developer with two problems fixes both from
        // one boot rather than discovering the second after redeploying for the first.
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
        // Asserting absence alone would pass with the whole check deleted.
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
        // Constructed per scope, like FiksArkivServiceTask and every other task registered transient.
        public ScopedDependentTask(ScopedDependency dependency) => _ = dependency;

        public string Type => "scoped";

        public Task<ServiceTaskResult> Execute(ServiceTaskContext context) => NoopFinally(context);
    }

    [Fact]
    public async Task ServiceTaskNeedingAScopedDependency_IsStillResolved_SoTheCheckArms()
    {
        // The validator resolves both sets in a scope of its own and reads those lists. Asking
        // AppImplementationFactory instead would fall back to the root provider — there is no
        // HttpContext during StartAsync — where this task cannot be constructed at all: the check would
        // stand down, and since ValidateScopes is development-only it would stand down on the
        // developer's machine and arm in the deployed environments, which is exactly backwards.
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
        // Constructed, so it is named among the registered types rather than missing from them.
        Assert.Contains("'scoped'", run.Exception.Message, StringComparison.Ordinal);
        Assert.Empty(run.Logger.Collector.GetSnapshot());
    }

    [Fact]
    public async Task TwoServiceTasksSharingATaskType_Warns_ButStillBoots()
    {
        // Not a startup failure: registering after a built-in to replace it is a legitimate thing to do,
        // and the last registration is what ProcessTaskResolver dispatches to. It is worth a warning
        // because FindServiceTask takes the first match and ignores case, so the enqueue path and the
        // dispatch path can disagree about which implementation a process task means.
        var run = await Run(
            s =>
            {
                s.AddSingleton<IServiceTask, PdfLikeTask>();
                s.AddSingleton<IServiceTask, ShoutyPdfLikeTask>();
            },
            ProcessTestUtils.SetupProcessReader("simple-linear.bpmn")
        );

        Assert.Null(run.Exception);
        FakeLogRecord warning = Assert.Single(
            run.Logger.Collector.GetSnapshot(),
            record => record.Level == LogLevel.Warning
        );
        Assert.Contains("registered by more than one implementation", warning.Message, StringComparison.Ordinal);
        Assert.Contains(nameof(PdfLikeTask), warning.Message, StringComparison.Ordinal);
        Assert.Contains(nameof(ShoutyPdfLikeTask), warning.Message, StringComparison.Ordinal);
    }

    private static int CountOccurrences(string haystack, string needle)
    {
        int count = 0;
        for (int i = haystack.IndexOf(needle, StringComparison.Ordinal); i >= 0; )
        {
            count++;
            i = haystack.IndexOf(needle, i + needle.Length, StringComparison.Ordinal);
        }

        return count;
    }
}
