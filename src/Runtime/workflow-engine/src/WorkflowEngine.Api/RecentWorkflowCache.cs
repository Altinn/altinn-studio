using System.Collections.Concurrent;
using WorkflowEngine.Models;

namespace WorkflowEngine.Api;

internal sealed class RecentWorkflowCache
{
    private readonly ConcurrentQueue<CachedWorkflow> _entries = new();
    private readonly int _maxEntries;

    public RecentWorkflowCache(int maxEntries = 100)
    {
        _maxEntries = maxEntries;
    }

    public void Add(Workflow workflow)
    {
        var cached = new CachedWorkflow
        {
            IdempotencyKey = workflow.IdempotencyKey,
            OperationId = workflow.OperationId,
            Status = workflow.Status.ToString(),
            InstanceInformation = workflow.InstanceInformation,
            CreatedAt = workflow.CreatedAt,
            ExecutionStartedAt = workflow.ExecutionStartedAt,
            RemovedAt = DateTimeOffset.UtcNow,
            TraceId = workflow.EngineActivity?.TraceId.ToString(),
            Steps = workflow
                .Steps.OrderBy(s => s.ProcessingOrder)
                .Select(s => new CachedStep
                {
                    IdempotencyKey = s.IdempotencyKey,
                    OperationId = s.OperationId,
                    CommandType = s.Command.GetType().Name,
                    CommandDetail = s.Command.OperationId,
                    CommandPayload = (s.Command as Command.AppCommand)?.Payload,
                    LastError = s.LastError,
                    Status = s.Status.ToString(),
                    ProcessingOrder = s.ProcessingOrder,
                    RetryCount = s.RequeueCount,
                    BackoffUntil = s.BackoffUntil,
                    CreatedAt = s.CreatedAt,
                    ExecutionStartedAt = s.ExecutionStartedAt,
                    UpdatedAt = s.UpdatedAt,
                })
                .ToList(),
        };

        _entries.Enqueue(cached);

        while (_entries.Count > _maxEntries)
            _entries.TryDequeue(out _);
    }

    public IReadOnlyList<CachedWorkflow> GetRecent(int count) => _entries.Reverse().Take(count).ToList();

    public IReadOnlyList<CachedWorkflow> GetAll() => _entries.Reverse().ToList();

    public void Clear()
    {
        while (_entries.TryDequeue(out _)) { }
    }
}

internal sealed record CachedWorkflow
{
    public required string IdempotencyKey { get; init; }
    public required string OperationId { get; init; }
    public required string Status { get; init; }
    public required InstanceInformation InstanceInformation { get; init; }
    public required DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset? ExecutionStartedAt { get; init; }
    public required DateTimeOffset RemovedAt { get; init; }
    public string? TraceId { get; init; }
    public required IReadOnlyList<CachedStep> Steps { get; init; }
}

internal sealed record CachedStep
{
    public required string IdempotencyKey { get; init; }
    public required string OperationId { get; init; }
    public required string CommandType { get; init; }
    public required string CommandDetail { get; init; }
    public string? CommandPayload { get; init; }
    public string? LastError { get; init; }
    public required string Status { get; init; }
    public required int ProcessingOrder { get; init; }
    public required int RetryCount { get; init; }
    public DateTimeOffset? BackoffUntil { get; init; }
    public required DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset? ExecutionStartedAt { get; init; }
    public DateTimeOffset? UpdatedAt { get; init; }
}
