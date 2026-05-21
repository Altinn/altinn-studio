using System.Collections.Concurrent;
using Altinn.Augmenter.Agent.Configuration;
using Altinn.Augmenter.Agent.Pipelines.Generic.Mapping;
using Altinn.Augmenter.Agent.Services.Registries;
using Microsoft.Extensions.Options;

namespace Altinn.Augmenter.Agent.Pipelines.Generic;

/// <summary>
/// Lazy mapper resolver: on first <see cref="Get"/> for a name, loads
/// <c>&lt;MappingsRoot&gt;/&lt;name&gt;.json</c> as a <see cref="JsonPathMapper"/>
/// and caches it. Missing files surface as <see cref="FileNotFoundException"/>
/// with a message that names both the requested mapper and the resolved path
/// so misconfigured pipelines fail loud.
/// </summary>
public sealed class FileSystemDataMapperRegistry(
    IOptions<ContentPathsOptions> contentPaths,
    RegistryProvider registries) : IDataMapperRegistry
{
    private readonly ConcurrentDictionary<string, IDataMapper> _cache = new(StringComparer.Ordinal);

    public IDataMapper Get(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Mapper name is required.", nameof(name));

        return _cache.GetOrAdd(name, n =>
        {
            var specPath = Path.Combine(contentPaths.Value.MappingsRoot, n + ".json");
            if (!File.Exists(specPath))
            {
                throw new FileNotFoundException(
                    $"Mapper '{n}' not found at {specPath}. " +
                    $"Drop a {n}.json spec into ContentPaths.MappingsRoot.",
                    specPath);
            }
            return new JsonPathMapper(specPath, registries);
        });
    }
}
