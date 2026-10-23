using System.Collections.Concurrent;
using System.Text.Json;

namespace Altinn.App.Ai.Enrichment.Registries;

/// <summary>
/// Loads and caches typed registry data from an agent's <c>registries/</c> folder.
/// The library ships no knowledge of which registries exist — callers ask for a
/// specific file by name.
/// </summary>
public sealed class RegistryProvider(string registriesDirectory)
{
    private readonly ConcurrentDictionary<string, object> _cache = new();
    private static readonly JsonSerializerOptions DeserializeOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    public T Load<T>(string fileName)
    {
        var key = $"{typeof(T).FullName}:{fileName}";
        return (T)_cache.GetOrAdd(key, _ =>
        {
            var path = Path.Combine(registriesDirectory, fileName);
            if (!File.Exists(path))
                throw new FileNotFoundException($"Registry file not found: {path}");

            var json = File.ReadAllText(path);
            return JsonSerializer.Deserialize<T>(json, DeserializeOptions)
                ?? throw new InvalidOperationException($"Registry file is empty or invalid JSON: {path}");
        })!;
    }
}
