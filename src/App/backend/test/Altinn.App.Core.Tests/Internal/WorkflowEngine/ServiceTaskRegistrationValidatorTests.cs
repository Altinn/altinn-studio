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

    // ── Well-formed pipelines ────────────────────────────────────────────────────────────────

    private sealed class GoodTask : IStagedServiceTask
    {
        public string Type => "good";

        public IEnumerable<IServiceTaskStep> Steps => [new Send(), new Track(), new AwaitReceipt()];

        private sealed class Send : IServiceTaskStep<string>
        {
            public Task<ServiceTaskStepResult<string>> Execute(ServiceTaskContext context) =>
                Task.FromResult(ServiceTaskStepResult.Next("id"));
        }

        private sealed class Track : IServiceTaskStep<string, int>
        {
            public Task<ServiceTaskStepResult<int>> Execute(ServiceTaskContext<string> context) =>
                Task.FromResult(ServiceTaskStepResult.Next(1));
        }

        private sealed class AwaitReceipt : IFinalServiceTaskStep<int>
        {
            public Task<ServiceTaskResult> Execute(ServiceTaskContext<int> context) =>
                Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());
        }
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

        public IEnumerable<IServiceTaskStep> Steps => [];
    }

    [Fact]
    public async Task TaskImplementingBothKinds_FailsStartup()
    {
        var exception = await Validate(s => s.AddSingleton<IServiceTask, DualKindTask>());

        Assert.NotNull(exception);
        Assert.Contains("exactly one kind", exception.Message);
    }

    // ── Pipeline shapes ──────────────────────────────────────────────────────────────────────

    private sealed class SingleStepPipeline : IStagedServiceTask
    {
        public string Type => "single";

        public IEnumerable<IServiceTaskStep> Steps => [new Only()];

        private sealed class Only : IFinalServiceTaskStep<string>
        {
            public Task<ServiceTaskResult> Execute(ServiceTaskContext<string> context) =>
                Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());
        }
    }

    [Fact]
    public async Task PipelineWithOneStep_FailsStartup_PointingAtIServiceTask()
    {
        var exception = await Validate(s => s.AddSingleton<IStagedServiceTask, SingleStepPipeline>());

        Assert.NotNull(exception);
        Assert.Contains("at least an entry and a final step", exception.Message);
        Assert.Contains(nameof(IServiceTask), exception.Message);
    }

    private sealed class MismatchedSeamPipeline : IStagedServiceTask
    {
        public string Type => "mismatched";

        public IEnumerable<IServiceTaskStep> Steps => [new ProducesString(), new ExpectsInt()];

        private sealed class ProducesString : IServiceTaskStep<string>
        {
            public Task<ServiceTaskStepResult<string>> Execute(ServiceTaskContext context) =>
                Task.FromResult(ServiceTaskStepResult.Next("id"));
        }

        private sealed class ExpectsInt : IFinalServiceTaskStep<int>
        {
            public Task<ServiceTaskResult> Execute(ServiceTaskContext<int> context) =>
                Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());
        }
    }

    [Fact]
    public async Task MismatchedHandoffTypes_FailStartup_NamingBothSteps()
    {
        var exception = await Validate(s => s.AddSingleton<IStagedServiceTask, MismatchedSeamPipeline>());

        Assert.NotNull(exception);
        Assert.Contains("handoff mismatch", exception.Message);
        Assert.Contains("'ExpectsInt' expects Int32", exception.Message);
        Assert.Contains("'ProducesString' produces String", exception.Message);
    }

    private sealed class FinalNotLastPipeline : IStagedServiceTask
    {
        public string Type => "finalNotLast";

        public IEnumerable<IServiceTaskStep> Steps => [new Entry(), new EarlyFinal(), new TrailingLink()];

        private sealed class Entry : IServiceTaskStep<string>
        {
            public Task<ServiceTaskStepResult<string>> Execute(ServiceTaskContext context) =>
                Task.FromResult(ServiceTaskStepResult.Next("id"));
        }

        private sealed class EarlyFinal : IFinalServiceTaskStep<string>
        {
            public Task<ServiceTaskResult> Execute(ServiceTaskContext<string> context) =>
                Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());
        }

        private sealed class TrailingLink : IServiceTaskStep<string, string>
        {
            public Task<ServiceTaskStepResult<string>> Execute(ServiceTaskContext<string> context) =>
                Task.FromResult(ServiceTaskStepResult.Next("id"));
        }
    }

    [Fact]
    public async Task FinalStepNotLast_FailsStartup_OnBothEnds()
    {
        var exception = await Validate(s => s.AddSingleton<IStagedServiceTask, FinalNotLastPipeline>());

        Assert.NotNull(exception);
        Assert.Contains("'EarlyFinal' is a final step but is not last", exception.Message);
        Assert.Contains("the last step ('TrailingLink') must be the final step", exception.Message);
    }

    private sealed class EntryNotFirstPipeline : IStagedServiceTask
    {
        public string Type => "entryNotFirst";

        public IEnumerable<IServiceTaskStep> Steps => [new LinkFirst(), new Done()];

        private sealed class LinkFirst : IServiceTaskStep<string, string>
        {
            public Task<ServiceTaskStepResult<string>> Execute(ServiceTaskContext<string> context) =>
                Task.FromResult(ServiceTaskStepResult.Next("id"));
        }

        private sealed class Done : IFinalServiceTaskStep<string>
        {
            public Task<ServiceTaskResult> Execute(ServiceTaskContext<string> context) =>
                Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());
        }
    }

    [Fact]
    public async Task FirstStepWithInput_FailsStartup()
    {
        var exception = await Validate(s => s.AddSingleton<IStagedServiceTask, EntryNotFirstPipeline>());

        Assert.NotNull(exception);
        Assert.Contains("the first step ('LinkFirst') must be an entry step", exception.Message);
    }

    private sealed class DuplicateNamesPipeline : IStagedServiceTask
    {
        public string Type => "duplicateNames";

        public IEnumerable<IServiceTaskStep> Steps => [new Entry(), new Done()];

        private sealed class Entry : IServiceTaskStep<string>
        {
            public string Name => "step";

            public Task<ServiceTaskStepResult<string>> Execute(ServiceTaskContext context) =>
                Task.FromResult(ServiceTaskStepResult.Next("id"));
        }

        private sealed class Done : IFinalServiceTaskStep<string>
        {
            public string Name => "step";

            public Task<ServiceTaskResult> Execute(ServiceTaskContext<string> context) =>
                Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());
        }
    }

    [Fact]
    public async Task DuplicateStepNames_FailStartup()
    {
        var exception = await Validate(s => s.AddSingleton<IStagedServiceTask, DuplicateNamesPipeline>());

        Assert.NotNull(exception);
        Assert.Contains("duplicate step name 'step'", exception.Message);
    }

    private sealed class InvalidStepOptionsPipeline : IStagedServiceTask
    {
        public string Type => "invalidOptions";

        public IEnumerable<IServiceTaskStep> Steps => [new Entry(), new Done()];

        private sealed class Entry : IServiceTaskStep<string>
        {
            public ProcessStepOptions? StepOptions => new() { MaxExecutionTime = TimeSpan.FromSeconds(-5) };

            public Task<ServiceTaskStepResult<string>> Execute(ServiceTaskContext context) =>
                Task.FromResult(ServiceTaskStepResult.Next("id"));
        }

        private sealed class Done : IFinalServiceTaskStep<string>
        {
            public Task<ServiceTaskResult> Execute(ServiceTaskContext<string> context) =>
                Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());
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
    }

    [Fact]
    public async Task StepsEnumerationThrowing_FailsStartup_WithTheUnderlyingMessage()
    {
        var exception = await Validate(s => s.AddSingleton<IStagedServiceTask, ThrowingStepsPipeline>());

        Assert.NotNull(exception);
        Assert.Contains("no steps for you", exception.Message);
    }
}
