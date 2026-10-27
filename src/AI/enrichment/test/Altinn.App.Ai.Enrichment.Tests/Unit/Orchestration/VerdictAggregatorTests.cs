using System.Text.Json;
using Altinn.App.Ai.Enrichment.Orchestration;
using FluentAssertions;

namespace Altinn.App.Ai.Enrichment.Tests.Unit.Orchestration;

public class VerdictAggregatorTests
{
    private static readonly JsonDocument MiniSchema = JsonDocument.Parse("""
        {
          "defaultStatus": "ikke_vurdert",
          "sections": [
            {
              "id": "formalia",
              "label": "Formalia",
              "items": [
                { "id": "soknad_komplett", "label": "Søknad komplett" },
                { "id": "dato_gyldig",     "label": "Gyldig dato"    }
              ]
            },
            {
              "id": "praktisk",
              "label": "Praktisk",
              "items": [
                { "id": "ansvarlig_myndig", "label": "Ansvarlig er myndig" }
              ]
            }
          ]
        }
        """);

    [Fact]
    public void Aggregate_AllVerdictsPresent_BuildsExpectedShape()
    {
        var verdicts = new Dictionary<string, ItemVerdict>
        {
            ["formalia.soknad_komplett"] = new() { Status = "vurdert_ok", Merknad = "OK" },
            ["formalia.dato_gyldig"] = new() { Status = "maa_undersokes", Merknad = "Mangler dato" },
            ["praktisk.ansvarlig_myndig"] = new() { Status = "vurdert_ok", Merknad = "46 år" },
        };

        using var result = VerdictAggregator.Aggregate(MiniSchema, verdicts);
        var root = result.RootElement;

        var sjekkliste = root.GetProperty("sjekkliste");
        var formalia = sjekkliste.GetProperty("formalia");
        formalia.GetProperty("label").GetString().Should().Be("Formalia");

        var komplett = formalia.GetProperty("punkter").GetProperty("soknad_komplett");
        komplett.GetProperty("label").GetString().Should().Be("Søknad komplett");
        komplett.GetProperty("status").GetString().Should().Be("vurdert_ok");
        komplett.GetProperty("merknad").GetString().Should().Be("OK");

        sjekkliste.GetProperty("praktisk").GetProperty("punkter").GetProperty("ansvarlig_myndig")
            .GetProperty("status").GetString().Should().Be("vurdert_ok");
    }

    [Fact]
    public void Aggregate_MissingVerdict_FallsBackToDefaultStatusWithMerknad()
    {
        // Only 1 of 3 punkter has a verdict — the other 2 should fall back.
        var verdicts = new Dictionary<string, ItemVerdict>
        {
            ["formalia.soknad_komplett"] = new() { Status = "vurdert_ok", Merknad = "OK" },
        };

        using var result = VerdictAggregator.Aggregate(MiniSchema, verdicts);
        var missing = result.RootElement.GetProperty("sjekkliste")
            .GetProperty("praktisk").GetProperty("punkter").GetProperty("ansvarlig_myndig");

        missing.GetProperty("status").GetString().Should().Be("ikke_vurdert");
        missing.GetProperty("merknad").GetString().Should().Contain("Ingen markdown-regel");
    }
}
