using System.Collections.Concurrent;

namespace Altinn.App.Ai.Enrichment.Pipeline;

/// <summary>
/// Lets pipeline steps share intermediate results within a single execution.
/// Steps store and retrieve data by key; the caller reads the published
/// entries after the run (e.g. to store enrichment JSON as a data element).
/// </summary>
public sealed class PipelineContext
{
    private readonly ConcurrentDictionary<string, object> _data = new();

    public void Set<T>(string key, T value) where T : notnull
    {
        _data[key] = value;
    }

    public T? Get<T>(string key) where T : class
    {
        return _data.TryGetValue(key, out var value) ? value as T : null;
    }

    /// <summary>Snapshot of everything published during the run.</summary>
    public IReadOnlyDictionary<string, object> Entries => _data;
}
