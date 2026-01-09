using System.Net.Sockets;
using System.Runtime.CompilerServices;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WorkflowEngine.Data.Context;
using WorkflowEngine.Data.Entities;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience.Extensions;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Data.Repository;

internal sealed class EnginePgRepository : IEngineRepository
{
    private readonly EngineDbContext _context;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<EnginePgRepository> _logger;
    private readonly IOptionsMonitor<EngineSettings> _settings;

    private RetryStrategy _dbRetryStrategy => _settings.CurrentValue.DatabaseRetryStrategy;
    private static List<PersistentItemStatus> _incompleteItemStatuses =>
        [PersistentItemStatus.Enqueued, PersistentItemStatus.Processing, PersistentItemStatus.Requeued];

    public EnginePgRepository(
        EngineDbContext context,
        IOptionsMonitor<EngineSettings> settings,
        ILogger<EnginePgRepository> logger,
        TimeProvider? timeProvider = null
    )
    {
        _context = context;
        _settings = settings;
        _logger = logger;
        _timeProvider = timeProvider ?? TimeProvider.System;
    }

    public async Task<IReadOnlyList<Workflow>> GetIncompleteWorkflows(CancellationToken cancellationToken = default) =>
        await ExecuteWithRetry(
            async ct =>
                await _context
                    .Jobs.Include(j => j.Tasks)
                    .Where(j => _incompleteItemStatuses.Contains(j.Status))
                    .Select(x => x.ToDomainModel())
                    .ToListAsync(ct),
            cancellationToken
        );

    public async Task<Workflow> AddWorkflow(Request request, CancellationToken cancellationToken = default) =>
        await ExecuteWithRetry(
            async ct =>
            {
                var job = Workflow.FromRequest(request);
                var entity = WorkflowEntity.FromDomainModel(job);

                var dbRecord = _context.Jobs.Add(entity);
                await _context.SaveChangesAsync(ct);

                return dbRecord.Entity.ToDomainModel();
            },
            cancellationToken
        );

    public async Task UpdateWorkflow(Workflow workflow, CancellationToken cancellationToken = default) =>
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

    public async Task UpdateStep(Step step, CancellationToken cancellationToken = default) =>
        await ExecuteWithRetry(
            async ct =>
            {
                await _context
                    .Steps.Where(t => t.Id == step.DatabaseId)
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

    private async Task ExecuteWithRetry(
        Func<CancellationToken, Task> operation,
        CancellationToken cancellationToken = default,
        [CallerMemberName] string operationName = ""
    ) =>
        await _dbRetryStrategy.Execute(
            operation,
            RetryErrorHandler,
            _timeProvider,
            _logger,
            cancellationToken,
            operationName
        );

    private async Task<T> ExecuteWithRetry<T>(
        Func<CancellationToken, Task<T>> operation,
        CancellationToken cancellationToken = default,
        [CallerMemberName] string operationName = ""
    ) =>
        await _dbRetryStrategy.Execute(
            operation,
            RetryErrorHandler,
            _timeProvider,
            _logger,
            cancellationToken,
            operationName
        );

    private static RetryDecision RetryErrorHandler(Exception exception) =>
        exception switch
        {
            // Network/connection issues - retryable
            TimeoutException => RetryDecision.Retry,
            SocketException => RetryDecision.Retry,
            HttpRequestException => RetryDecision.Retry,

            // Database-specific transient errors - retryable
            _ when exception.GetType().Name.Contains("timeout", StringComparison.OrdinalIgnoreCase) =>
                RetryDecision.Retry,
            _ when exception.GetType().Name.Contains("connection", StringComparison.OrdinalIgnoreCase) =>
                RetryDecision.Retry,
            _ when exception.Message.Contains("timeout", StringComparison.OrdinalIgnoreCase) => RetryDecision.Retry,
            _ when exception.Message.Contains("connection", StringComparison.OrdinalIgnoreCase) => RetryDecision.Retry,

            // Permanent errors - don't retry
            ArgumentNullException => RetryDecision.Abort,
            ArgumentException => RetryDecision.Abort,
            InvalidOperationException => RetryDecision.Abort,

            // Default to retrying for unknown exceptions (conservative approach)
            _ => RetryDecision.Retry,
        };
}
