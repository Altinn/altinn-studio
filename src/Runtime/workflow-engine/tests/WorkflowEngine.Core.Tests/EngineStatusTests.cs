using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience;

namespace WorkflowEngine.Core.Tests;

public class EngineStatusTests
{
    [Fact]
    public void UpdatingTheActiveCounts_LeavesTheFailedCount_AndTheOtherWayRound()
    {
        // Two collectors on different cadences write these, so neither update may reset the other's count.
        var options = Options.Create(
            new EngineSettings
            {
                MetricsCollectionInterval = TimeSpan.FromSeconds(5),
                DefaultStepCommandTimeout = TimeSpan.FromSeconds(30),
                MaxStepCommandTimeout = TimeSpan.FromHours(2),
                DefaultStepRetryStrategy = RetryStrategy.None(),
                DatabaseCommandTimeout = TimeSpan.FromSeconds(10),
                DatabaseRetryStrategy = RetryStrategy.None(),
                MaxWorkflowsPerRequest = 100,
                MaxStepsPerWorkflow = 50,
                MaxLabels = 50,
                HeartbeatInterval = TimeSpan.FromSeconds(3),
                StaleWorkflowThreshold = TimeSpan.FromSeconds(15),
                MaxReclaimCount = 3,
            }
        );
        var scopeFactory = new Mock<IServiceScopeFactory>(MockBehavior.Strict).Object;
        var signal = new AsyncSignal();
        using var writeBuffer = new WorkflowWriteBuffer(
            scopeFactory,
            NullLogger<WorkflowWriteBuffer>.Instance,
            options,
            signal
        );
        using var mintBuffer = new MailboxMintBuffer(scopeFactory, NullLogger<MailboxMintBuffer>.Instance, options);
        using var closeBuffer = new MailboxCloseBuffer(scopeFactory, NullLogger<MailboxCloseBuffer>.Instance, options);
        using var deliveryBuffer = new MailboxDeliveryBuffer(
            scopeFactory,
            NullLogger<MailboxDeliveryBuffer>.Instance,
            options
        );
        using var limiter = new ConcurrencyLimiter(5, 5, 5);
        var engine = new Engine(
            writeBuffer,
            mintBuffer,
            closeBuffer,
            deliveryBuffer,
            new Mock<ICommandRegistry>(MockBehavior.Strict).Object,
            limiter,
            new Mock<IEngineRepository>(MockBehavior.Strict).Object,
            new InFlightTracker(TimeProvider.System),
            signal,
            TimeProvider.System,
            options
        );

        engine.UpdateFailedWorkflowCount(3);
        engine.UpdateActiveWorkflowCounts(active: 7, scheduled: 2);
        var afterActive = (engine.ActiveWorkflowCount, engine.ScheduledWorkflowCount, engine.FailedWorkflowCount);
        engine.UpdateFailedWorkflowCount(4);
        var afterFailed = (engine.ActiveWorkflowCount, engine.ScheduledWorkflowCount, engine.FailedWorkflowCount);

        Assert.Equal((7, 2, 3), afterActive);
        Assert.Equal((7, 2, 4), afterFailed);
    }
}
