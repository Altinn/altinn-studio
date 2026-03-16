using System.Collections.Concurrent;
using WorkflowEngine.Models;

namespace WorkflowEngine.Core;

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

    public void Clear()
    {
        while (_entries.TryDequeue(out _)) { }
    }
}
