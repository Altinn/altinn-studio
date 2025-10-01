using System.Diagnostics.CodeAnalysis;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Internal.Data;

/// <summary>
/// Simple wrapper around a Dictionary using Lazy to ensure that the valueFactory is only called once
/// </summary>
internal sealed class DataElementCache<T>
{
    private readonly Dictionary<Guid, Lazy<Task<T>>> _cache = [];

    public async Task<T> GetOrCreate(DataElementIdentifier key, Func<Task<T>> valueFactory)
    {
        Lazy<Task<T>>? lazyTask;
        lock (_cache)
        {
            if (!_cache.TryGetValue(key.Guid, out lazyTask))
            {
                lazyTask = new Lazy<Task<T>>(valueFactory);
                _cache.Add(key.Guid, lazyTask);
            }
        }
        return await lazyTask.Value.ConfigureAwait(false);
    }

    public void Set(DataElementIdentifier key, T data)
    {
        lock (_cache)
        {
            _cache[key.Guid] = new Lazy<Task<T>>(Task.FromResult(data));
        }
    }

    public bool TryGetCachedValue(DataElementIdentifier identifier, [NotNullWhen(true)] out T? value)
    {
        lock (_cache)
        {
            if (
                _cache.TryGetValue(identifier.Guid, out var lazyTask)
                && lazyTask is { IsValueCreated: true, Value.IsCompletedSuccessfully: true }
            )
            {
                value = lazyTask.Value.Result ?? throw new InvalidOperationException("Value in cache is null");
                return true;
            }
        }
        value = default;
        return false;
    }
}
