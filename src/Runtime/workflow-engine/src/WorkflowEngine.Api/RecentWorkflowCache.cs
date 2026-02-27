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

    public IReadOnlyList<DashboardWorkflowDto> GetRecent(int count) => _entries.Reverse().Take(count).ToList();

    public IReadOnlyList<DashboardWorkflowDto> GetAll() => _entries.Reverse().ToList();

    public bool Remove(string idempotencyKey, DateTimeOffset createdAt)
    {
        // ConcurrentQueue doesn't support removal, so drain and re-enqueue everything except the match.
        // The cache is small (max 100 entries) so this is fine.
        int count = _entries.Count;
        bool removed = false;
        for (int i = 0; i < count; i++)
        {
            if (!_entries.TryDequeue(out DashboardWorkflowDto? entry))
                break;

            if (!removed && entry.IdempotencyKey == idempotencyKey && entry.CreatedAt == createdAt)
            {
                removed = true;
                continue;
            }

            _entries.Enqueue(entry);
        }

        return removed;
    }

    public void Clear()
    {
        while (_entries.TryDequeue(out _)) { }
    }
}
