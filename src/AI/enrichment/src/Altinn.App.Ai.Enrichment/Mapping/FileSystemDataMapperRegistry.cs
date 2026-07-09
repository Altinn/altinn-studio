using System.Collections.Concurrent;
using Altinn.App.Ai.Enrichment.Registries;

namespace Altinn.App.Ai.Enrichment.Mapping;

/// <summary>
/// Lazy mapper resolver: on first <see cref="Get"/> for a name, loads
/// <c>&lt;mappings-dir&gt;/&lt;name&gt;.json</c> as a <see cref="JsonPathMapper"/>
/// and caches it. Missing files surface as <see cref="FileNotFoundException"/>
/// with a message that names both the requested mapper and the resolved path
/// so misconfigured agents fail loud.
/// </summary>
public sealed class FileSystemDataMapperRegistry(
    string mappingsDirectory,
    RegistryProvider registries) : IDataMapperRegistry
{
    private readonly ConcurrentDictionary<string, IDataMapper> _cache = new(StringComparer.Ordinal);

    public IDataMapper Get(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Mapper name is required.", nameof(name));

        return _cache.GetOrAdd(name, n =>
        {
            var specPath = Path.Combine(mappingsDirectory, n + ".json");
            if (!File.Exists(specPath))
            {
                throw new FileNotFoundException(
                    $"Mapper '{n}' not found at {specPath}. " +
                    $"Drop a {n}.json spec into the agent's mappings/ folder.",
                    specPath);
            }
            return new JsonPathMapper(specPath, registries);
        });
    }
}
