using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

public class WorkflowStepOptionsValidatorTests
{
    private static WorkflowStepOptionsValidator CreateValidator(Action<IServiceCollection> configure)
    {
        var services = new ServiceCollection();
        configure(services);
        var sp = services.BuildServiceProvider();
        return new WorkflowStepOptionsValidator(
            sp.GetRequiredService<IServiceScopeFactory>(),
            NullLogger<WorkflowStepOptionsValidator>.Instance
        );
    }

    [Fact]
    public async Task StartAsync_ServiceTaskWithNegativeTimeout_ThrowsAtStartup()
    {
        var task = new Mock<IServiceTask>();
        task.Setup(t => t.Type).Returns("signing");
        task.Setup(t => t.StepOptions).Returns(new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(-1) });
        var validator = CreateValidator(s => s.AddSingleton<IServiceTask>(task.Object));

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            validator.StartAsync(CancellationToken.None)
        );
        Assert.Contains(nameof(ProcessStepOptions.MaxExecutionTime), ex.Message);
        Assert.Contains(nameof(IServiceTask), ex.Message);
    }

    [Fact]
    public async Task StartAsync_ServiceTaskWithZeroIntervalRetry_ThrowsAtStartup()
    {
        // A bare strategy is Constant/zero-interval/unbounded — would requeue in a tight loop.
        var task = new Mock<IServiceTask>();
        task.Setup(t => t.Type).Returns("signing");
        task.Setup(t => t.StepOptions)
            .Returns(new ProcessStepOptions { RetryStrategy = new ProcessStepRetryStrategy() });
        var validator = CreateValidator(s => s.AddSingleton<IServiceTask>(task.Object));

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            validator.StartAsync(CancellationToken.None)
        );
        Assert.Contains(nameof(ProcessStepRetryStrategy.BaseInterval), ex.Message);
    }

    [Fact]
    public async Task StartAsync_LifecycleHookWithInvalidOptions_ThrowsAtStartup()
    {
        // Coverage across handler types, not only service tasks.
        var hook = new Mock<IOnTaskEndingHandler>();
        hook.Setup(h => h.StepOptions).Returns(new ProcessStepOptions { MaxExecutionTime = TimeSpan.Zero });
        var validator = CreateValidator(s => s.AddSingleton<IOnTaskEndingHandler>(hook.Object));

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            validator.StartAsync(CancellationToken.None)
        );
        Assert.Contains(nameof(IOnTaskEndingHandler), ex.Message);
    }

    [Fact]
    public async Task StartAsync_ValidOptions_DoesNotThrow()
    {
        var task = new Mock<IServiceTask>();
        task.Setup(t => t.Type).Returns("signing");
        task.Setup(t => t.StepOptions)
            .Returns(
                new ProcessStepOptions
                {
                    MaxExecutionTime = TimeSpan.FromHours(2),
                    RetryStrategy = ProcessStepRetryStrategy.Exponential(TimeSpan.FromSeconds(10), maxRetries: 5),
                }
            );
        var validator = CreateValidator(s => s.AddSingleton<IServiceTask>(task.Object));

        await validator.StartAsync(CancellationToken.None);
    }

    [Fact]
    public async Task StartAsync_NoStepOptions_DoesNotThrow()
    {
        // The default-interface-method returns null; a plain handler opts out entirely.
        var task = new Mock<IServiceTask>();
        task.Setup(t => t.Type).Returns("signing");
        var validator = CreateValidator(s => s.AddSingleton<IServiceTask>(task.Object));

        await validator.StartAsync(CancellationToken.None);
    }

    [Fact]
    public async Task StartAsync_HandlerThatCannotBeConstructed_IsSkippedWithoutFailingStartup()
    {
        // A handler whose construction fails at startup must not break boot — it falls back to the
        // per-step enqueue-time check instead.
        var validator = CreateValidator(s =>
            s.AddTransient<IServiceTask>(_ => throw new InvalidOperationException("needs request state"))
        );

        await validator.StartAsync(CancellationToken.None);
    }

    [Fact]
    public async Task StartAsync_ReportsAllInvalidHandlersTogether()
    {
        var badTask = new Mock<IServiceTask>();
        badTask.Setup(t => t.Type).Returns("signing");
        badTask
            .Setup(t => t.StepOptions)
            .Returns(new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(-1) });

        var badHook = new Mock<IOnTaskStartingHandler>();
        badHook
            .Setup(h => h.StepOptions)
            .Returns(new ProcessStepOptions { RetryStrategy = new ProcessStepRetryStrategy() });

        var validator = CreateValidator(s =>
        {
            s.AddSingleton<IServiceTask>(badTask.Object);
            s.AddSingleton<IOnTaskStartingHandler>(badHook.Object);
        });

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            validator.StartAsync(CancellationToken.None)
        );
        Assert.Contains(nameof(IServiceTask), ex.Message);
        Assert.Contains(nameof(IOnTaskStartingHandler), ex.Message);
    }
}
