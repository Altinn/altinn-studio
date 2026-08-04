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

    private sealed class SendStep : IServiceTaskStep
    {
        public Task<ServiceTaskStepResult> Execute(ServiceTaskContext context) =>
            Task.FromResult(ServiceTaskStepResult.Next());
    }

    private sealed class AwaitStep : IFinalServiceTaskStep
    {
        public Task<ServiceTaskResult> Execute(ServiceTaskContext context) =>
            Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());
    }

    // ── Well-formed pipelines ────────────────────────────────────────────────────────────────

    private sealed class GoodTask : IStagedServiceTask
    {
        public string Type => "good";

        public IEnumerable<IServiceTaskStep> Steps => [new SendStep()];

        public IFinalServiceTaskStep FinalStep => new AwaitStep();
    }

    [Fact]
    public async Task WellFormedPipeline_PassesValidation()
    {
        var exception = await Validate(s => s.AddSingleton<IStagedServiceTask, GoodTask>());

        Assert.Null(exception);
    }

    [Fact]
    public async Task NoServiceTasksAtAll_PassesValidation()
    {
        var exception = await Validate(_ => { });

        Assert.Null(exception);
    }

    // ── Registration hygiene ─────────────────────────────────────────────────────────────────

    private sealed class RootRegisteredTask : IServiceTaskBase
    {
        public string Type => "root";
    }

    [Fact]
    public async Task TaskRegisteredAgainstRootInterface_FailsStartup()
    {
        var exception = await Validate(s => s.AddSingleton<IServiceTaskBase, RootRegisteredTask>());

        Assert.NotNull(exception);
        Assert.Contains(nameof(RootRegisteredTask), exception.Message);
        Assert.Contains("Register it against the kind it implements", exception.Message);
    }

    private sealed class DualKindTask : IServiceTask, IStagedServiceTask
    {
        public string Type => "dual";

        public Task<ServiceTaskResult> Execute(ServiceTaskContext context) =>
            Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());

        public IEnumerable<IServiceTaskStep> Steps => [new SendStep()];

        public IFinalServiceTaskStep FinalStep => new AwaitStep();
    }

    [Fact]
    public async Task TaskImplementingBothKinds_FailsStartup()
    {
        var exception = await Validate(s => s.AddSingleton<IServiceTask, DualKindTask>());

        Assert.NotNull(exception);
        Assert.Contains("exactly one kind", exception.Message);
    }

    // ── Pipeline shapes ──────────────────────────────────────────────────────────────────────

    private sealed class NoWorkStepsPipeline : IStagedServiceTask
    {
        public string Type => "noWorkSteps";

        public IEnumerable<IServiceTaskStep> Steps => [];

        public IFinalServiceTaskStep FinalStep => new AwaitStep();
    }

    [Fact]
    public async Task PipelineWithNoWorkSteps_FailsStartup_PointingAtIServiceTask()
    {
        var exception = await Validate(s => s.AddSingleton<IStagedServiceTask, NoWorkStepsPipeline>());

        Assert.NotNull(exception);
        Assert.Contains("Steps is empty", exception.Message);
        Assert.Contains(nameof(IServiceTask), exception.Message);
    }

    private sealed class DualKindStepPipeline : IStagedServiceTask
    {
        public string Type => "dualKindStep";

        public IEnumerable<IServiceTaskStep> Steps => [new BothKinds()];

        public IFinalServiceTaskStep FinalStep => new AwaitStep();

        private sealed class BothKinds : IServiceTaskStep, IFinalServiceTaskStep
        {
            Task<ServiceTaskStepResult> IServiceTaskStep.Execute(ServiceTaskContext context) =>
                Task.FromResult(ServiceTaskStepResult.Next());

            Task<ServiceTaskResult> IFinalServiceTaskStep.Execute(ServiceTaskContext context) =>
                Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());
        }
    }

    [Fact]
    public async Task StepImplementingBothKinds_FailsStartup()
    {
        var exception = await Validate(s => s.AddSingleton<IStagedServiceTask, DualKindStepPipeline>());

        Assert.NotNull(exception);
        Assert.Contains("implements both", exception.Message);
        Assert.Contains("exactly one kind", exception.Message);
    }

    private sealed class DuplicateNamesPipeline : IStagedServiceTask
    {
        public string Type => "duplicateNames";

        public IEnumerable<IServiceTaskStep> Steps => [new Entry()];

        public IFinalServiceTaskStep FinalStep => new Done();

        private sealed class Entry : IServiceTaskStep
        {
            public string Name => "step";

            public Task<ServiceTaskStepResult> Execute(ServiceTaskContext context) =>
                Task.FromResult(ServiceTaskStepResult.Next());
        }

        private sealed class Done : IFinalServiceTaskStep
        {
            public string Name => "step";

            public Task<ServiceTaskResult> Execute(ServiceTaskContext context) =>
                Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());
        }
    }

    [Fact]
    public async Task DuplicateStepNames_AcrossStepsAndFinal_FailStartup()
    {
        var exception = await Validate(s => s.AddSingleton<IStagedServiceTask, DuplicateNamesPipeline>());

        Assert.NotNull(exception);
        Assert.Contains("duplicate step name 'step'", exception.Message);
    }

    private sealed class InvalidStepOptionsPipeline : IStagedServiceTask
    {
        public string Type => "invalidOptions";

        public IEnumerable<IServiceTaskStep> Steps => [new Entry()];

        public IFinalServiceTaskStep FinalStep => new AwaitStep();

        private sealed class Entry : IServiceTaskStep
        {
            public ProcessStepOptions? StepOptions => new() { MaxExecutionTime = TimeSpan.FromSeconds(-5) };

            public Task<ServiceTaskStepResult> Execute(ServiceTaskContext context) =>
                Task.FromResult(ServiceTaskStepResult.Next());
        }
    }

    [Fact]
    public async Task InvalidPerStepOptions_FailStartup()
    {
        var exception = await Validate(s => s.AddSingleton<IStagedServiceTask, InvalidStepOptionsPipeline>());

        Assert.NotNull(exception);
        Assert.Contains("'Entry' declares invalid StepOptions", exception.Message);
    }

    private sealed class ThrowingStepsPipeline : IStagedServiceTask
    {
        public string Type => "throwingSteps";

        public IEnumerable<IServiceTaskStep> Steps => throw new InvalidOperationException("no steps for you");

        public IFinalServiceTaskStep FinalStep => new AwaitStep();
    }

    [Fact]
    public async Task StepsEnumerationThrowing_FailsStartup_WithTheUnderlyingMessage()
    {
        var exception = await Validate(s => s.AddSingleton<IStagedServiceTask, ThrowingStepsPipeline>());

        Assert.NotNull(exception);
        Assert.Contains("no steps for you", exception.Message);
    }
}
