using System.Net.Sockets;
using System.Runtime.CompilerServices;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WorkflowEngine.Data.Entities;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Extensions;

namespace WorkflowEngine.Data;

internal sealed class ProcessEnginePgRepository : IProcessEngineRepository
{
    private readonly ProcessEngineDbContext _context;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<ProcessEnginePgRepository> _logger;
    private readonly IOptionsMonitor<WorkflowEngineSettings> _settings;

    public ProcessEnginePgRepository(
        ProcessEngineDbContext context,
        IOptionsMonitor<WorkflowEngineSettings> settings,
        ILogger<ProcessEnginePgRepository> logger,
        TimeProvider? timeProvider = null
    )
    {
        _context = context;
        _settings = settings;
        _logger = logger;
        _timeProvider = timeProvider ?? TimeProvider.System;
    }

    public async Task<IReadOnlyList<Workflow>> GetIncompleteJobs(CancellationToken cancellationToken = default) =>
        await ExecuteWithRetry(
            async ct =>
            {
                var incompleteStatuses = new[]
                {
                    PersistentItemStatus.Enqueued,
                    PersistentItemStatus.Processing,
                    PersistentItemStatus.Requeued,
                };

                var jobs = await _context
                    .Jobs.Include(j => j.Tasks)
                    .Where(j => incompleteStatuses.Contains(j.Status))
                    .Select(x => x.ToDomainModel())
                    .ToListAsync(ct);

                return jobs;
            },
            cancellationToken
        );

    public async Task<Workflow> AddJob(Request request, CancellationToken cancellationToken = default) =>
        await ExecuteWithRetry(
            async ct =>
            {
                var job = Workflow.FromRequest(request);
                var entity = ProcessEngineJobEntity.FromDomainModel(job);

                var dbRecord = _context.Jobs.Add(entity);
                await _context.SaveChangesAsync(ct);

                return dbRecord.Entity.ToDomainModel();
            },
            cancellationToken
        );

    public async System.Threading.Tasks.Task UpdateJob(
        Workflow workflow,
        CancellationToken cancellationToken = default
    ) =>
        await ExecuteWithRetry(
            async ct =>
            {
                await _context
                    .Jobs.Where(t => t.Id == workflow.DatabaseId)
                    .ExecuteUpdateAsync(
                        setters =>
                            setters
                                .SetProperty(t => t.Status, workflow.Status)
                                .SetProperty(t => t.UpdatedAt, DateTime.Now),
                        ct
                    );
            },
            cancellationToken
        );

    public async System.Threading.Tasks.Task UpdateTask(Step step, CancellationToken cancellationToken = default) =>
        await ExecuteWithRetry(
            async ct =>
            {
                await _context
                    .Tasks.Where(t => t.Id == step.DatabaseId)
                    .ExecuteUpdateAsync(
                        setters =>
                            setters
                                .SetProperty(t => t.Status, step.Status)
                                .SetProperty(t => t.BackoffUntil, step.BackoffUntil)
                                .SetProperty(t => t.RequeueCount, step.RequeueCount)
                                .SetProperty(t => t.UpdatedAt, DateTime.Now),
                        ct
                    );
            },
            cancellationToken
        );

    private async System.Threading.Tasks.Task ExecuteWithRetry(
        Func<CancellationToken, System.Threading.Tasks.Task> operation,
        CancellationToken cancellationToken = default,
        [CallerMemberName] string operationName = ""
    ) =>
        await ExecuteWithRetry<object?>(
            async ct =>
            {
                await operation(ct);
                return null;
            },
            cancellationToken,
            operationName
        );

    private async Task<T> ExecuteWithRetry<T>(
        Func<CancellationToken, Task<T>> operation,
        CancellationToken cancellationToken = default,
        [CallerMemberName] string operationName = ""
    )
    {
        var retryStrategy = _settings.CurrentValue.DatabaseRetryStrategy;
        var attempt = 1;

        while (true)
        {
            try
            {
                var result = await operation(cancellationToken);

                if (attempt > 1)
                {
                    _logger.LogDebug(
                        "Database operation '{OperationName}' succeeded on attempt {Attempt}",
                        operationName,
                        attempt
                    );
                }

                return result; // Success
            }
            catch (Exception ex) when (ShouldRetry(ex))
            {
                if (!retryStrategy.CanRetry(attempt))
                {
                    _logger.LogError(
                        ex,
                        "Database operation '{OperationName}' failed permanently after {Attempts} attempts",
                        operationName,
                        attempt
                    );
                    throw; // Give up after max retries
                }

                var delay = retryStrategy.CalculateDelay(attempt);

                _logger.LogWarning(
                    ex,
                    "Database operation '{OperationName}' failed on attempt {Attempt}, retrying in {Delay}ms",
                    operationName,
                    attempt,
                    delay.TotalMilliseconds
                );

                await Task.Delay(delay, _timeProvider, cancellationToken);
                attempt++;
            }
        }
    }

    private static bool ShouldRetry(Exception exception) =>
        exception switch
        {
            // Network/connection issues - retryable
            TimeoutException => true,
            SocketException => true,
            HttpRequestException => true,

            // Database-specific transient errors - retryable
            _ when exception.GetType().Name.Contains("timeout", StringComparison.OrdinalIgnoreCase) => true,
            _ when exception.GetType().Name.Contains("connection", StringComparison.OrdinalIgnoreCase) => true,
            _ when exception.Message.Contains("timeout", StringComparison.OrdinalIgnoreCase) => true,
            _ when exception.Message.Contains("connection", StringComparison.OrdinalIgnoreCase) => true,

            // Permanent errors - don't retry
            ArgumentNullException => false,
            ArgumentException => false,
            InvalidOperationException => false,

            // Default to retrying for unknown exceptions (conservative approach)
            _ => true,
        };
}
