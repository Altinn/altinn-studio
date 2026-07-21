using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

public class ProcessStepOptionsResolverTests
{
    private static ProcessStepOptionsResolver CreateResolver(params IServiceTask[] serviceTasks)
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        foreach (var serviceTask in serviceTasks)
            services.AddSingleton(serviceTask);
        var sp = services.BuildServiceProvider();
        var appImplFactory = sp.GetRequiredService<AppImplementationFactory>();

        // ExecuteServiceTask is the only command declaring a tier-2 default (10 min) today.
        return new ProcessStepOptionsResolver([new ExecuteServiceTask(appImplFactory)], appImplFactory);
    }

    private static Mock<IServiceTask> ServiceTask(string type, ProcessStepOptions? stepOptions = null)
    {
        var mock = new Mock<IServiceTask>();
        mock.Setup(t => t.Type).Returns(type);
        if (stepOptions is not null)
            mock.Setup(t => t.StepOptions).Returns(stepOptions);
        return mock;
    }

    [Fact]
    public void Resolve_OrdinaryCommand_NoTierApplies_ReturnsNull()
    {
        var resolver = CreateResolver();

        var result = resolver.Resolve("StartTask", taskId: "Task_1", serviceTaskType: null);

        Assert.Null(result);
    }

    [Fact]
    public void Resolve_ServiceTask_NoImplementationOverride_UsesCommandDefault()
    {
        var resolver = CreateResolver(ServiceTask("signing").Object);

        var result = resolver.Resolve(ExecuteServiceTask.Key, taskId: null, serviceTaskType: "signing");

        Assert.NotNull(result);
        Assert.Equal(ExecuteServiceTask.DefaultServiceTaskTimeout, result.MaxExecutionTime);
        Assert.Null(result.RetryStrategy);
    }

    [Fact]
    public void Resolve_ServiceTask_ImplementationTimeout_WinsOverCommandDefault()
    {
        var serviceTask = ServiceTask("signing", new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromHours(2) });
        var resolver = CreateResolver(serviceTask.Object);

        var result = resolver.Resolve(ExecuteServiceTask.Key, taskId: null, serviceTaskType: "signing");

        Assert.NotNull(result);
        Assert.Equal(TimeSpan.FromHours(2), result.MaxExecutionTime);
    }

    [Fact]
    public void Resolve_ServiceTask_ImplementationRetryOnly_FallsBackToCommandTimeout()
    {
        var serviceTask = ServiceTask(
            "signing",
            new ProcessStepOptions
            {
                RetryStrategy = ProcessStepRetryStrategy.Exponential(TimeSpan.FromSeconds(5), maxRetries: 3),
            }
        );
        var resolver = CreateResolver(serviceTask.Object);

        var result = resolver.Resolve(ExecuteServiceTask.Key, taskId: null, serviceTaskType: "signing");

        Assert.NotNull(result);
        Assert.Equal(ExecuteServiceTask.DefaultServiceTaskTimeout, result.MaxExecutionTime); // tier 2
        Assert.NotNull(result.RetryStrategy); // tier 3
        Assert.Equal(TimeSpan.FromSeconds(5), result.RetryStrategy.BaseInterval);
    }

    [Fact]
    public void Resolve_InvalidImplementationOptions_ThrowsAtResolve()
    {
        var serviceTask = ServiceTask(
            "signing",
            new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(-1) }
        );
        var resolver = CreateResolver(serviceTask.Object);

        var ex = Assert.Throws<InvalidOperationException>(() =>
            resolver.Resolve(ExecuteServiceTask.Key, taskId: null, serviceTaskType: "signing")
        );
        Assert.Contains(nameof(ProcessStepOptions.MaxExecutionTime), ex.Message);
    }

    [Fact]
    public void Resolve_ServiceTaskTypeDoesNotMatchAnyHandler_ReturnsCommandDefaultOnly()
    {
        // The command default (tier 2) still applies even when no service task matches the type.
        var resolver = CreateResolver(ServiceTask("signing").Object);

        var result = resolver.Resolve(ExecuteServiceTask.Key, taskId: null, serviceTaskType: "payment");

        Assert.NotNull(result);
        Assert.Equal(ExecuteServiceTask.DefaultServiceTaskTimeout, result.MaxExecutionTime);
    }
}
