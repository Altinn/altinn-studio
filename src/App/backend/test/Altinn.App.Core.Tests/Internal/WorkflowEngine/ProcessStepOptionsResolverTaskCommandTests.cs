using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.DependencyInjection;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

/// <summary>
/// A task-declared command uses its own ordinary workflow defaults, selected directly by its wire key.
/// </summary>
public class ProcessStepOptionsResolverTaskCommandTests
{
    private static ProcessStepOptionsResolver CreateResolver(params IWorkflowEngineCommand[] commands)
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        foreach (IWorkflowEngineCommand command in commands)
        {
            services.AddSingleton(command);
        }

        ServiceProvider sp = services.BuildServiceProvider();
        return new ProcessStepOptionsResolver(sp);
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

        ProcessStepOptions? result = resolver.Resolve("NotifySignees", taskId: "Task_1", serviceTaskType: null);

        Assert.NotNull(result);
        Assert.Equal(TimeSpan.FromMinutes(5), result.MaxExecutionTime);
        Assert.Equal(50, result.RetryStrategy?.MaxRetries);
    }

    [Fact]
    public void Resolve_TaskCommandWithoutOptions_ReturnsNull()
    {
        ProcessStepOptionsResolver resolver = CreateResolver(new FakeCommand("NotifySignees", stepOptions: null));

        ProcessStepOptions? result = resolver.Resolve("NotifySignees", taskId: "Task_1", serviceTaskType: null);

        Assert.Null(result);
    }

    [Fact]
    public void Resolve_UnknownTaskCommandKey_ReturnsNull()
    {
        ProcessStepOptionsResolver resolver = CreateResolver(
            new FakeCommand("NotifySignees", new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(5) })
        );

        ProcessStepOptions? result = resolver.Resolve("Other", taskId: "Task_1", serviceTaskType: null);

        Assert.Null(result);
    }

    [Fact]
    public async Task Resolve_ScopedCommandServiceTaskAndHook_UseTheCurrentScopeWithoutHttpContext()
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        services.AddWorkflowEngineIntegration();
        services.RemoveAll<IWorkflowEngineCommand>();
        List<ScopeProbe> probes = [];
        services.AddScoped(_ =>
        {
            var probe = new ScopeProbe(TimeSpan.FromSeconds(probes.Count + 1));
            probes.Add(probe);
            return probe;
        });
        services.AddScoped<IWorkflowEngineCommand>(sp => new FakeCommand(
            "ScopedCommand",
            new ProcessStepOptions { MaxExecutionTime = sp.GetRequiredService<ScopeProbe>().Timeout }
        ));
        services.AddScoped<IServiceTask, ScopedServiceTask>();
        services.AddScoped<IOnTaskStartingHandler>(sp =>
        {
            var hook = new Mock<IOnTaskStartingHandler>();
            hook.Setup(h => h.ShouldRunForTask("Task_1")).Returns(true);
            hook.SetupGet(h => h.StepOptions)
                .Returns(new ProcessStepOptions { MaxExecutionTime = sp.GetRequiredService<ScopeProbe>().Timeout });
            return hook.Object;
        });
        await using ServiceProvider provider = services.BuildServiceProvider(
            new ServiceProviderOptions { ValidateScopes = true }
        );

        Assert.Throws<InvalidOperationException>(() => provider.GetRequiredService<ProcessStepOptionsResolver>());
        for (int attempt = 1; attempt <= 2; attempt++)
        {
            await using (AsyncServiceScope scope = provider.CreateAsyncScope())
            {
                var resolver = scope.ServiceProvider.GetRequiredService<ProcessStepOptionsResolver>();
                Assert.Same(resolver, scope.ServiceProvider.GetRequiredService<ProcessStepOptionsResolver>());
                Assert.Equal(attempt - 1, probes.Count);
                TimeSpan expected = TimeSpan.FromSeconds(attempt);
                Assert.Equal(expected, resolver.Resolve("ScopedCommand", "Task_1", null)?.MaxExecutionTime);
                Assert.Equal(
                    expected,
                    resolver.Resolve(ExecuteServiceTask.Key, "Task_1", "scoped", 0)?.MaxExecutionTime
                );
                Assert.Equal(expected, resolver.Resolve("OnTaskStartingHook", "Task_1", null)?.MaxExecutionTime);
            }

            Assert.True(probes[attempt - 1].Disposed);
        }
        Assert.Equal(2, probes.Count);
    }

    private sealed class ScopeProbe(TimeSpan timeout) : IAsyncDisposable
    {
        public TimeSpan Timeout => timeout;
        public bool Disposed { get; private set; }

        public ValueTask DisposeAsync()
        {
            Disposed = true;
            return ValueTask.CompletedTask;
        }
    }

    private sealed class ScopedServiceTask(ScopeProbe probe) : IServiceTask
    {
        public string Type => "scoped";
        public ProcessStepOptions? StepOptions => new() { MaxExecutionTime = probe.Timeout };

        public Task<ServiceTaskResult> Execute(ServiceTaskContext context) =>
            throw new NotSupportedException("Resolving options must not execute the task.");
    }

    private sealed class FakeCommand(string key, ProcessStepOptions? stepOptions) : IWorkflowEngineCommand
    {
        public string GetKey() => key;

        public ProcessStepOptions? DefaultStepOptions => stepOptions;

        public Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext context) =>
            Task.FromResult(ProcessEngineCommandResult.Completed());
    }
}
