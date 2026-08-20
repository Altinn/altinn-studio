using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience.Extensions;
using WorkflowEngine.Resilience.Models;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Data.Services;

/// <summary>
/// The mailbox deadline's enforcement: a coarse periodic sweep that closes every open mailbox whose deadline
/// has passed, running exactly the routine <c>DELETE</c> runs.
/// </summary>
/// <remarks>
/// Signals accelerate, timers guarantee. A delivery releases its receiver inside the delivery's own
/// transaction and needs no sweep; the deadline is the only thing standing between a parked receiver and
/// waiting forever, because a <c>Held</c> receiver has no timer of its own. Hence a cadence of its own
/// (<see cref="EngineSettings.MailboxSweepInterval"/>), deliberately coarser than the maintenance interval.
/// It has no second half: the workflow that concludes the exchange already exists — it is the app's own
/// receiver — so closing releases it rather than creating anything, which is also what makes a <c>DELETE</c>
/// racing this sweep a first-writer-wins no-op. Per-mailbox isolation lives one layer down, in
/// <see cref="IEngineRepository.SweepOverdueMailboxes"/>.
/// </remarks>
internal sealed class MailboxDeadlineService(
    ILogger<MailboxDeadlineService> logger,
    TimeProvider timeProvider,
    IEngineRepository repository,
    IOptions<EngineSettings> options
) : BackgroundService
{
    /// <summary>
    /// Backoff when the sweep itself fails, matching <see cref="DbMaintenanceService"/>. Reached only when the
    /// candidate scan fails — a single mailbox's close is contained and counted rather than thrown.
    /// </summary>
    private static readonly RetryStrategy _databaseBackoff = RetryStrategy.Exponential(
        baseInterval: TimeSpan.FromSeconds(1),
        maxDelay: TimeSpan.FromMinutes(2)
    );

    /// <summary>
    /// The period used when the setting carries none. Not a floor, and not a second place the default lives: the
    /// default is <c>Defaults.EngineSettings.MailboxSweepInterval</c>. This only stops a hand-built
    /// <see cref="EngineSettings"/> that never passed through the normalizer from turning
    /// <c>Task.Delay(TimeSpan.Zero)</c> into a hot loop against the database.
    /// </summary>
    private static readonly TimeSpan _intervalWhenUnset = TimeSpan.FromSeconds(1);

    /// <summary>
    /// How many overdue mailboxes one claim-and-close pass takes. A bound on the <em>statement</em>, not on the
    /// tick: the tick repeats a full pass until nothing is left. The distinction is load-bearing —
    /// <see cref="EngineSettings.MaxMailboxTimeout"/>'s derivation charges exactly one
    /// <see cref="EngineSettings.MailboxSweepInterval"/> for the gap between a deadline and the close that honors
    /// it, and one batch per tick would make the real gap <c>ceil(overdue / SweepBatchSize)</c> intervals.
    /// </summary>
    internal const int SweepBatchSize = 100;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var interval = options.Value.MailboxSweepInterval;
        interval = interval > TimeSpan.Zero ? interval : _intervalWhenUnset;

        logger.MailboxDeadlineSweepStarted(interval);

        int consecutiveFailures = 0;

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // Delayed before the first pass rather than after it: startup has enough to do, and a deadline that
                // passed while the pod was down is no more urgent one cadence later.
                await Task.Delay(interval, timeProvider, stoppingToken);

                await SweepOverdueMailboxes(timeProvider.GetUtcNow(), stoppingToken);

                consecutiveFailures = 0;
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                consecutiveFailures++;
                Metrics.Errors.Add(1, ("operation", "mailboxDeadlineSweep"));

                var delay = _databaseBackoff.CalculateDelay(consecutiveFailures);
                logger.MailboxDeadlineSweepFailed(consecutiveFailures, delay, ex.Message, ex);

                try
                {
                    await Task.Delay(delay, timeProvider, stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
            }
        }

        logger.MailboxDeadlineSweepStopped();
    }

    /// <summary>
    /// One tick: close every mailbox past its deadline, and report what that did. Drained within the tick rather
    /// than one batch per tick, which is what makes "at most one cadence" true of the close rather than of the
    /// first hundred closes. The <c>Closed &gt; 0</c> guard is what stops a full batch of persistently failing
    /// mailboxes spinning here forever; they wait for the next cadence instead.
    /// </summary>
    internal async Task<MailboxSweepResult> SweepOverdueMailboxes(DateTimeOffset now, CancellationToken ct)
    {
        var total = new MailboxSweepResult();

        MailboxSweepResult pass;
        do
        {
            pass = await repository.SweepOverdueMailboxes(now, SweepBatchSize, ct);
            total += pass;
        } while (pass.Closed > 0 && pass.Closed + pass.Failed >= SweepBatchSize);

        if (!total.IsEmpty)
        {
            logger.MailboxDeadlinesPassed(
                total.Closed,
                total.ReceiversReleased,
                total.UnconsumedDeliveries,
                total.Failed
            );
        }

        return total;
    }
}

internal static partial class MailboxDeadlineServiceLogs
{
    [LoggerMessage(LogLevel.Information, "MailboxDeadlineService starting, sweeping every {Interval}")]
    internal static partial void MailboxDeadlineSweepStarted(
        this ILogger<MailboxDeadlineService> logger,
        TimeSpan interval
    );

    [LoggerMessage(LogLevel.Information, "MailboxDeadlineService shutting down")]
    internal static partial void MailboxDeadlineSweepStopped(this ILogger<MailboxDeadlineService> logger);

    [LoggerMessage(
        LogLevel.Information,
        "Mailbox deadline sweep closed {Closed} overdue mailbox(es), releasing {ReceiversReleased} parked receiver(s) and finding {UnconsumedDeliveries} unconsumed delivery(ies); {Failed} could not be closed and stay claimable"
    )]
    internal static partial void MailboxDeadlinesPassed(
        this ILogger<MailboxDeadlineService> logger,
        int closed,
        int receiversReleased,
        long unconsumedDeliveries,
        int failed
    );

    [LoggerMessage(
        LogLevel.Error,
        "Mailbox deadline sweep failed (attempt {ConsecutiveFailures}, backing off {Delay}): {ErrorMessage}"
    )]
    internal static partial void MailboxDeadlineSweepFailed(
        this ILogger<MailboxDeadlineService> logger,
        int consecutiveFailures,
        TimeSpan delay,
        string errorMessage,
        Exception ex
    );
}
