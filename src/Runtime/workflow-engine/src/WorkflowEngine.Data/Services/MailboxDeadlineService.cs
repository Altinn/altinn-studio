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
/// The deadline's enforcement: a coarse periodic sweep closing every open mailbox past its deadline,
/// running exactly the routine <c>DELETE</c> runs. Signals accelerate, timers guarantee — a held receiver
/// has no timer of its own, so this sweep is the only thing between it and waiting forever. It has no
/// second half: closing releases the receiver that already exists.
/// </summary>
internal sealed class MailboxDeadlineService(
    ILogger<MailboxDeadlineService> logger,
    TimeProvider timeProvider,
    IEngineRepository repository,
    IOptions<EngineSettings> options
) : BackgroundService
{
    /// <summary>
    /// Backoff for a failed candidate scan; a single mailbox's close is contained and counted instead.
    /// </summary>
    private static readonly RetryStrategy _databaseBackoff = RetryStrategy.Exponential(
        baseInterval: TimeSpan.FromSeconds(1),
        maxDelay: TimeSpan.FromMinutes(2)
    );

    /// <summary>
    /// Not a default (that is <c>Defaults.EngineSettings.MailboxSweepInterval</c>): only keeps a hand-built,
    /// unnormalized <see cref="EngineSettings"/> from turning <c>Task.Delay(0)</c> into a hot loop.
    /// </summary>
    private static readonly TimeSpan _intervalWhenUnset = TimeSpan.FromSeconds(1);

    /// <summary>
    /// Bounds the <em>statement</em>, not the tick — the tick drains. One batch per tick would stretch the
    /// deadline-to-close gap to <c>ceil(overdue / SweepBatchSize)</c> sweep intervals, breaking
    /// <see cref="EngineSettings.MaxMailboxTimeout"/>'s derivation, which charges exactly one.
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
                // Delayed before the first pass: a deadline that passed while the pod was down is no more urgent
                // one cadence later.
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
    /// One tick: drain every overdue mailbox, not one batch. The <c>Closed &gt; 0</c> guard stops a full batch
    /// of persistently failing closes from spinning here forever.
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
                total.UnpairedDeliveries,
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
        "Mailbox deadline sweep closed {Closed} overdue mailbox(es), releasing {ReceiversReleased} parked receiver(s) and finding {UnpairedDeliveries} unpaired delivery(ies); {Failed} could not be closed and stay claimable"
    )]
    internal static partial void MailboxDeadlinesPassed(
        this ILogger<MailboxDeadlineService> logger,
        int closed,
        int receiversReleased,
        long unpairedDeliveries,
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
