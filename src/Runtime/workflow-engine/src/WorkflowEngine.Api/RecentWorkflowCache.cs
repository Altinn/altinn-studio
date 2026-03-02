using System.Collections.Concurrent;
using WorkflowEngine.Models;

namespace WorkflowEngine.Api;

internal sealed class RecentWorkflowCache
{
    private readonly ConcurrentQueue<DashboardWorkflowDto> _entries = new();
    private readonly int _maxEntries;

    public RecentWorkflowCache(int maxEntries = 100)
    {
        _maxEntries = maxEntries;
    }

    public void Add(Workflow workflow)
    {
        var dto = DashboardMapper.MapWorkflow(workflow) with { RemovedAt = DateTimeOffset.UtcNow };
        _entries.Enqueue(dto);

        while (_entries.Count > _maxEntries)
            _entries.TryDequeue(out _);
    }

    public void Remove(string idempotencyKey)
    {
        // ConcurrentQueue doesn't support removal — rebuild without the target entry.
        // This is rare (only on manual retry) and the queue is small (≤100 entries).
        var snapshot = _entries.ToArray();
        while (_entries.TryDequeue(out _)) { }
        foreach (DashboardWorkflowDto entry in snapshot)
        {
            if (entry.IdempotencyKey != idempotencyKey)
                _entries.Enqueue(entry);
        }
    }

    public IReadOnlyList<DashboardWorkflowDto> GetRecent(int count) => _entries.Reverse().Take(count).ToList();

    public IReadOnlyList<DashboardWorkflowDto> GetAll() => _entries.Reverse().ToList();

    public void Clear()
    {
        while (_entries.TryDequeue(out _)) { }
    }
}
