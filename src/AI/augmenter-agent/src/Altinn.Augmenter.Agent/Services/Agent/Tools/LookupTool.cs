using System.Collections.Concurrent;
using System.Text.Json;
using Altinn.Augmenter.Agent.Services.Registries;

namespace Altinn.Augmenter.Agent.Services.Agent.Tools;

/// <summary>
/// Generic key→value lookup against a named registry. The registry name maps
/// directly to a file under <c>ContentPaths.RegistriesRoot</c> — the image has
/// no compile-time knowledge of which registries are available. Tools that
/// would shape or rename entry fields belong elsewhere; this is pure passthrough.
///
/// Unknown keys and unknown registries return <c>{ "error": "..." }</c> rather
/// than a silent default — the LLM needs an explicit signal so it can degrade
/// gracefully instead of citing wrong data.
/// </summary>
public sealed class LookupTool(RegistryProvider registries) : ITool
{
    public string Name => "lookup";

    private readonly ConcurrentDictionary<string, LookupRegistry> _cache = new();

    public object Invoke(JsonElement arguments, JsonDocument application)
    {
        var registryName = arguments.TryGetProperty("registry", out var r) ? r.GetString()?.Trim() ?? "" : "";
        var key = arguments.TryGetProperty("key", out var k) ? k.GetString()?.Trim() ?? "" : "";

        if (registryName.Length == 0)
            return new { error = "Missing 'registry' argument." };

        LookupRegistry registry;
        try
        {
            registry = _cache.GetOrAdd(registryName, n => registries.Load<LookupRegistry>($"{n}.json"));
        }
        catch (FileNotFoundException)
        {
            return new { error = $"Unknown registry: '{registryName}'." };
        }

        if (!registry.Entries.TryGetValue(key, out var entry))
        {
            var known = string.Join(", ", registry.Entries.Keys.OrderBy(x => x));
            return new { error = $"Unknown key '{key}' in registry '{registryName}'. Known: [{known}]" };
        }
        return entry;
    }
}
