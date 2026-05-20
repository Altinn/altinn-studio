using System.Collections.Concurrent;
using System.Text.Json;
using Altinn.Augmenter.Agent.Configuration;
using Microsoft.Extensions.Options;

namespace Altinn.Augmenter.Agent.Services.Registries;

/// <summary>
/// Loads and caches typed registry data from the mounted registries folder.
/// The image ships no knowledge of which registries exist — callers ask for a
/// specific file by name. Files live in <c>ContentPaths.RegistriesRoot</c>
/// (Docker: <c>/etc/augmenter/registries</c>; dev: <c>config/registries/</c>).
/// </summary>
public sealed class RegistryProvider
{
    private readonly ConcurrentDictionary<string, object> _cache = new();
    private readonly string _root;
    private static readonly JsonSerializerOptions DeserializeOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    public RegistryProvider(IOptions<ContentPathsOptions> contentPaths)
        => _root = contentPaths.Value.RegistriesRoot;

    public T Load<T>(string fileName)
    {
        var key = $"{typeof(T).FullName}:{fileName}";
        return (T)_cache.GetOrAdd(key, _ =>
        {
            var path = Path.Combine(_root, fileName);
            if (!File.Exists(path))
                throw new FileNotFoundException($"Registry file not found: {path}");

            var json = File.ReadAllText(path);
            return JsonSerializer.Deserialize<T>(json, DeserializeOptions)
                ?? throw new InvalidOperationException($"Registry file is empty or invalid JSON: {path}");
        })!;
    }
}
