using System.Text.Json;
using Altinn.Augmenter.Agent.Services.Domain;

namespace Altinn.Augmenter.Agent.Services.Agent.Tools;

/// <summary>
/// Generic key→value lookup against a named registry exposed by
/// <see cref="DomainDataProvider"/>. The image ships only the routing logic;
/// the registries themselves (kommuner, etc.) come from <c>config/domain/</c>.
///
/// Unknown keys return { "error": "..." } rather than a silent default so the
/// LLM can mark the punkt 'maa_undersokes' instead of citing wrong data.
/// Unknown registries are also surfaced as errors with a list of supported names.
/// </summary>
public sealed class LookupTool(DomainDataProvider domain) : ITool
{
    public string Name => "lookup";

    private static readonly string[] SupportedRegistries = ["kommuner"];

    public object Invoke(JsonElement arguments, JsonDocument application)
    {
        var registry = arguments.TryGetProperty("registry", out var r) ? r.GetString()?.Trim() ?? "" : "";
        var key = arguments.TryGetProperty("key", out var k) ? k.GetString()?.Trim() ?? "" : "";

        return registry switch
        {
            "kommuner" => LookupKommuner(key),
            _ => new { error = $"Unknown registry: '{registry}'. Supported: [{string.Join(", ", SupportedRegistries)}]" },
        };
    }

    private object LookupKommuner(string key)
    {
        if (!domain.Kommuner.Kommuner.TryGetValue(key, out var entry))
        {
            var known = string.Join(", ", domain.Kommuner.Kommuner.Keys.OrderBy(x => x));
            return new { error = $"Unknown key '{key}' in registry 'kommuner'. Known: [{known}]" };
        }
        return new { name = entry.Navn, klage_epost = entry.KlageEpost };
    }
}
