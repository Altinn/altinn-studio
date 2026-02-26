using System.Diagnostics.CodeAnalysis;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Internal.Data;

/// <summary>
/// Simple wrapper around a Dictionary using Lazy to ensure that the valueFactory is only called once
/// </summary>
internal sealed class DataElementCache<T>
{
    private readonly Dictionary<Guid, Task<T>> _cache = [];
    private readonly List<DataElementIdentifier> _keys = [];

    public async Task<T> GetOrCreate(DataElementIdentifier key, Func<Task<T>> valueFactory)
    {
        Task<T>? lazyTask;
        lock (_cache)
        {
            if (!_cache.TryGetValue(key.Guid, out lazyTask))
            {
                lazyTask = valueFactory();
                _cache.Add(key.Guid, lazyTask);
                _keys.Add(key);
            }
        }
        return await lazyTask.ConfigureAwait(false);
    }

    public void Set(DataElementIdentifier key, T data)
    {
        lock (_cache)
        {
            _cache[key.Guid] = Task.FromResult(data);
            if (!_keys.Contains(key))
            {
                _keys.Add(key);
            }
        }
    }

    public bool TryGetCachedValue(DataElementIdentifier identifier, [NotNullWhen(true)] out T? value)
    {
        lock (_cache)
        {
            if (_cache.TryGetValue(identifier.Guid, out var task) && task.IsCompletedSuccessfully)
            {
                value = task.Result ?? throw new InvalidOperationException("Value in cache is null");
                return true;
            }
        }
        value = default;
        return false;
    }

    public IEnumerable<(DataElementIdentifier, T)> GetCachedEntries()
    {
        List<DataElementIdentifier> entries;
        lock (_cache)
        {
            entries = _keys.ToList();
        }

        foreach (var entry in entries)
        {
            if (TryGetCachedValue(entry, out var value))
            {
                yield return (entry, value);
            }
        }
    }
}
