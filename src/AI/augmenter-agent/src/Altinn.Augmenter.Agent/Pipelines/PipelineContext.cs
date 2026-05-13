using System.Collections.Concurrent;

namespace Altinn.Augmenter.Agent.Pipelines;

/// <summary>
/// Scoped service that allows pipeline steps to share intermediate results
/// within a single pipeline execution. Steps store and retrieve data by key.
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
}
