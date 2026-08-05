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

    private abstract class TaskBase : IServiceTask
    {
        public abstract string Type { get; }

        public virtual IEnumerable<IServiceTaskStep> Steps => [];

        public Task<ServiceTaskResult> Execute(ServiceTaskContext context) =>
            Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());
    }

    // ── Well-formed tasks ────────────────────────────────────────────────────────────────────

    private sealed class PlainTask : TaskBase
    {
        public override string Type => "plain";
    }

    private sealed class GoodTask : TaskBase
    {
        public override string Type => "good";

        public override IEnumerable<IServiceTaskStep> Steps => [new SendStep()];
    }

    [Fact]
    public async Task TaskWithoutDeclaredSteps_PassesValidation()
    {
        var exception = await Validate(s => s.AddSingleton<IServiceTask, PlainTask>());

        Assert.Null(exception);
    }

    [Fact]
    public async Task TaskWithDeclaredSteps_PassesValidation()
    {
        var exception = await Validate(s => s.AddSingleton<IServiceTask, GoodTask>());

        Assert.Null(exception);
    }

    [Fact]
    public async Task NoServiceTasksAtAll_PassesValidation()
    {
        var exception = await Validate(_ => { });

        Assert.Null(exception);
    }

    // ── Step declarations ────────────────────────────────────────────────────────────────────

    private sealed class DuplicateNamesTask : TaskBase
    {
        public override string Type => "duplicateNames";

        public override IEnumerable<IServiceTaskStep> Steps => [new Entry(), new Exit()];

        private sealed class Entry : IServiceTaskStep
        {
            public string Name => "step";

            public Task<ServiceTaskStepResult> Execute(ServiceTaskContext context) =>
                Task.FromResult(ServiceTaskStepResult.Next());
        }

        private sealed class Exit : IServiceTaskStep
        {
            public string Name => "step";

            public Task<ServiceTaskStepResult> Execute(ServiceTaskContext context) =>
                Task.FromResult(ServiceTaskStepResult.Next());
        }
    }

    [Fact]
    public async Task DuplicateStepNames_FailStartup()
    {
        var exception = await Validate(s => s.AddSingleton<IServiceTask, DuplicateNamesTask>());

        Assert.NotNull(exception);
        Assert.Contains("duplicate step name 'step'", exception.Message);
    }

    private sealed class EmptyNameTask : TaskBase
    {
        public override string Type => "emptyName";

        public override IEnumerable<IServiceTaskStep> Steps => [new Unnamed()];

        private sealed class Unnamed : IServiceTaskStep
        {
            public string Name => "  ";

            public Task<ServiceTaskStepResult> Execute(ServiceTaskContext context) =>
                Task.FromResult(ServiceTaskStepResult.Next());
        }
    }

    [Fact]
    public async Task EmptyStepName_FailsStartup()
    {
        var exception = await Validate(s => s.AddSingleton<IServiceTask, EmptyNameTask>());

        Assert.NotNull(exception);
        Assert.Contains("has an empty name", exception.Message);
    }

    private sealed class InvalidStepOptionsTask : TaskBase
    {
        public override string Type => "invalidOptions";

        public override IEnumerable<IServiceTaskStep> Steps => [new Entry()];

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
        var exception = await Validate(s => s.AddSingleton<IServiceTask, InvalidStepOptionsTask>());

        Assert.NotNull(exception);
        Assert.Contains("'Entry' declares invalid StepOptions", exception.Message);
    }

    private sealed class ThrowingStepsTask : TaskBase
    {
        public override string Type => "throwingSteps";

        public override IEnumerable<IServiceTaskStep> Steps => throw new InvalidOperationException("no steps for you");
    }

    [Fact]
    public async Task StepsEnumerationThrowing_FailsStartup_WithTheUnderlyingMessage()
    {
        var exception = await Validate(s => s.AddSingleton<IServiceTask, ThrowingStepsTask>());

        Assert.NotNull(exception);
        Assert.Contains("no steps for you", exception.Message);
    }
}
