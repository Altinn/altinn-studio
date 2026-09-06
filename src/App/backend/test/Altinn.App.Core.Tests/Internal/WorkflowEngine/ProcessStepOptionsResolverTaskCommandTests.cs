using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

/// <summary>
/// A process task command's own StepOptions are the tier-3 options of the ExecuteProcessTaskCommand step that
/// runs it, selected by the key the step carries.
/// </summary>
public class ProcessStepOptionsResolverTaskCommandTests
{
    private static ProcessStepOptionsResolver CreateResolver(params IProcessTaskCommand[] commands)
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        foreach (IProcessTaskCommand command in commands)
        {
            services.AddSingleton(command);
        }

        ServiceProvider sp = services.BuildServiceProvider();
        return new ProcessStepOptionsResolver([], sp.GetRequiredService<AppImplementationFactory>());
    }

    [Fact]
    public void Resolve_TaskCommandWithOptions_ReturnsTheCommandsOptions()
    {
        ProcessStepOptionsResolver resolver = CreateResolver(
            new FakeCommand(
                "NotifySignees",
                new ProcessStepOptions
                {
                    MaxExecutionTime = TimeSpan.FromMinutes(5),
                    RetryStrategy = ProcessStepRetryStrategy.Exponential(TimeSpan.FromSeconds(2), maxRetries: 50),
                }
            )
        );

        ProcessStepOptions? result = resolver.Resolve(
            ExecuteProcessTaskCommand.Key,
            taskId: "Task_1",
            serviceTaskType: null,
            taskCommandKey: "NotifySignees"
        );

        Assert.NotNull(result);
        Assert.Equal(TimeSpan.FromMinutes(5), result.MaxExecutionTime);
        Assert.Equal(50, result.RetryStrategy?.MaxRetries);
    }

    [Fact]
    public void Resolve_TaskCommandWithoutOptions_ReturnsNull()
    {
        ProcessStepOptionsResolver resolver = CreateResolver(new FakeCommand("NotifySignees", stepOptions: null));

        ProcessStepOptions? result = resolver.Resolve(
            ExecuteProcessTaskCommand.Key,
            taskId: "Task_1",
            serviceTaskType: null,
            taskCommandKey: "NotifySignees"
        );

        Assert.Null(result);
    }

    [Fact]
    public void Resolve_UnknownTaskCommandKey_ReturnsNull()
    {
        ProcessStepOptionsResolver resolver = CreateResolver(
            new FakeCommand("NotifySignees", new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(5) })
        );

        ProcessStepOptions? result = resolver.Resolve(
            ExecuteProcessTaskCommand.Key,
            taskId: "Task_1",
            serviceTaskType: null,
            taskCommandKey: "Other"
        );

        Assert.Null(result);
    }

    private sealed class FakeCommand(string key, ProcessStepOptions? stepOptions) : IProcessTaskCommand
    {
        public string Key => key;

        public ProcessStepOptions? StepOptions => stepOptions;

        public Task<ProcessTaskCommandResult> Execute(ProcessTaskCommandContext context) =>
            Task.FromResult(ProcessTaskCommandResult.Completed());
    }
}
