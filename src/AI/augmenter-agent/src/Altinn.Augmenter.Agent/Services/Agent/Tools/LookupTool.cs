using System.Text.Json;
using Altinn.Augmenter.Agent.Services.Domain;

namespace Altinn.Augmenter.Agent.Services.Agent.Tools;

/// <summary>
/// Generic key→value lookup against a named registry exposed by
/// <see cref="DomainDataProvider"/>. The image ships only the routing logic;
/// the registries themselves come from <c>config/domain/</c>.
///
/// Unknown keys and unknown registries return { "error": "..." } rather than a
/// silent default — the LLM needs an explicit signal so it can degrade
/// gracefully instead of citing wrong data.
/// </summary>
public sealed class LookupTool(DomainDataProvider domain) : ITool
{
    public string Name => "lookup";

    private const string KommunerRegistry = "kommuner";
    private static readonly string[] SupportedRegistries = [KommunerRegistry];

    public object Invoke(JsonElement arguments, JsonDocument application)
    {
        var registry = arguments.TryGetProperty("registry", out var r) ? r.GetString()?.Trim() ?? "" : "";
        var key = arguments.TryGetProperty("key", out var k) ? k.GetString()?.Trim() ?? "" : "";

        return registry switch
        {
            KommunerRegistry => LookupInKommunerRegistry(key),
            _ => new { error = $"Unknown registry: '{registry}'. Supported: [{string.Join(", ", SupportedRegistries)}]" },
        };
    }

    private object LookupInKommunerRegistry(string key)
    {
        if (!domain.Kommuner.Kommuner.TryGetValue(key, out var entry))
        {
            var known = string.Join(", ", domain.Kommuner.Kommuner.Keys.OrderBy(x => x));
            return new { error = $"Unknown key '{key}' in registry '{KommunerRegistry}'. Known: [{known}]" };
        }
        return new { name = entry.Navn, klage_epost = entry.KlageEpost };
    }
}
