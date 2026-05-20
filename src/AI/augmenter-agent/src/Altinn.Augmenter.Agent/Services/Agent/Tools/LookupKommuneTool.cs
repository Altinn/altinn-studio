using System.Text.Json;
using Altinn.Augmenter.Agent.Services.Domain;

namespace Altinn.Augmenter.Agent.Services.Agent.Tools;

/// <summary>
/// Looks up a Norwegian kommune by 4-digit kommunenummer in
/// <see cref="DomainDataProvider"/>'s registry (loaded from
/// <c>config/domain/kommuner.json</c>). Returns the registry entry verbatim
/// so config can carry whatever fields each deployment cares about
/// (name + klage-epost + future additions).
///
/// Unknown numbers return { "error": "..." } rather than silently falling back
/// to the default kommune — the LLM needs an explicit signal that the input
/// wasn't recognized so it can mark the punkt "maa_undersokes" instead of
/// confidently citing a wrong kommune.
/// </summary>
public sealed class LookupKommuneTool(DomainDataProvider domain) : ITool
{
    public string Name => "lookup_kommune";

    public object Invoke(JsonElement arguments, JsonDocument application)
    {
        var nr = arguments.TryGetProperty("kommunenummer", out var k) ? k.GetString()?.Trim() ?? "" : "";
        if (!domain.Kommuner.Kommuner.TryGetValue(nr, out var entry))
        {
            var known = string.Join(", ", domain.Kommuner.Kommuner.Keys.OrderBy(x => x));
            return new { error = $"Unknown kommunenummer: '{nr}'. Known: [{known}]" };
        }
        return new { name = entry.Navn, klage_epost = entry.KlageEpost };
    }
}
