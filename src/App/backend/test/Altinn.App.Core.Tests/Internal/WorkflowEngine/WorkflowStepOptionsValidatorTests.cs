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
    public async Task StartAsync_HookWithNegativeTimeout_ThrowsAtStartup()
    {
        var hook = new Mock<IOnTaskEndingHandler>();
        hook.Setup(h => h.StepOptions).Returns(new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(-1) });
        var validator = CreateValidator(s => s.AddSingleton<IOnTaskEndingHandler>(hook.Object));

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            validator.StartAsync(CancellationToken.None)
        );
        Assert.Contains(nameof(ProcessStepOptions.MaxExecutionTime), ex.Message);
        Assert.Contains(nameof(IOnTaskEndingHandler), ex.Message);
    }

    [Fact]
    public async Task StartAsync_HookWithZeroIntervalRetry_ThrowsAtStartup()
    {
        // A bare strategy is Constant/zero-interval/unbounded — would requeue in a tight loop.
        var hook = new Mock<IOnTaskStartingHandler>();
        hook.Setup(h => h.StepOptions)
            .Returns(new ProcessStepOptions { RetryStrategy = new ProcessStepRetryStrategy() });
        var validator = CreateValidator(s => s.AddSingleton<IOnTaskStartingHandler>(hook.Object));

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            validator.StartAsync(CancellationToken.None)
        );
        Assert.Contains(nameof(ProcessStepRetryStrategy.BaseInterval), ex.Message);
    }

    [Fact]
    public async Task StartAsync_ProcessEndedHookWithInvalidOptions_ThrowsAtStartup()
    {
        // Coverage across handler types, not only the task hooks.
        var hook = new Mock<IOnProcessEndedHandler>();
        hook.Setup(h => h.StepOptions).Returns(new ProcessStepOptions { MaxExecutionTime = TimeSpan.Zero });
        var validator = CreateValidator(s => s.AddSingleton<IOnProcessEndedHandler>(hook.Object));

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            validator.StartAsync(CancellationToken.None)
        );
        Assert.Contains(nameof(IOnProcessEndedHandler), ex.Message);
    }

    [Fact]
    public async Task StartAsync_ValidOptions_DoesNotThrow()
    {
        var hook = new Mock<IOnTaskEndingHandler>();
        hook.Setup(h => h.StepOptions)
            .Returns(
                new ProcessStepOptions
                {
                    MaxExecutionTime = TimeSpan.FromHours(2),
                    RetryStrategy = ProcessStepRetryStrategy.Exponential(TimeSpan.FromSeconds(10), maxRetries: 5),
                }
            );
        var validator = CreateValidator(s => s.AddSingleton<IOnTaskEndingHandler>(hook.Object));

        await validator.StartAsync(CancellationToken.None);
    }

    [Fact]
    public async Task StartAsync_NoStepOptions_DoesNotThrow()
    {
        // The default-interface-method returns null; a plain handler opts out entirely.
        var hook = new Mock<IOnTaskEndingHandler>();
        var validator = CreateValidator(s => s.AddSingleton<IOnTaskEndingHandler>(hook.Object));

        await validator.StartAsync(CancellationToken.None);
    }

    [Fact]
    public async Task StartAsync_HandlerThatCannotBeConstructed_IsSkippedWithoutFailingStartup()
    {
        // A handler whose construction fails at startup must not break boot — it falls back to the
        // per-step enqueue-time check instead.
        var validator = CreateValidator(s =>
            s.AddTransient<IOnTaskStartingHandler>(_ => throw new InvalidOperationException("needs request state"))
        );

        await validator.StartAsync(CancellationToken.None);
    }

    [Fact]
    public async Task StartAsync_ReportsAllInvalidHandlersTogether()
    {
        var badEndingHook = new Mock<IOnTaskEndingHandler>();
        badEndingHook
            .Setup(h => h.StepOptions)
            .Returns(new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(-1) });

        var badStartingHook = new Mock<IOnTaskStartingHandler>();
        badStartingHook
            .Setup(h => h.StepOptions)
            .Returns(new ProcessStepOptions { RetryStrategy = new ProcessStepRetryStrategy() });

        var validator = CreateValidator(s =>
        {
            s.AddSingleton<IOnTaskEndingHandler>(badEndingHook.Object);
            s.AddSingleton<IOnTaskStartingHandler>(badStartingHook.Object);
        });

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            validator.StartAsync(CancellationToken.None)
        );
        Assert.Contains(nameof(IOnTaskEndingHandler), ex.Message);
        Assert.Contains(nameof(IOnTaskStartingHandler), ex.Message);
    }
}
