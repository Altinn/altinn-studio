using System.Text.Json;
using Altinn.Augmenter.Agent.Services.Agent.Orchestration;
using FluentAssertions;

namespace Altinn.Augmenter.Agent.Tests.Unit.Orchestration;

public class ChecklistAggregatorTests
{
    private static readonly JsonDocument MiniSchema = JsonDocument.Parse("""
        {
          "defaultStatus": "ikke_vurdert",
          "sections": [
            {
              "id": "formelle_krav",
              "label": "Formelle krav",
              "items": [
                { "id": "soknad_komplett", "label": "Søknad komplett" },
                { "id": "kommune_riktig",  "label": "Riktig kommune"  }
              ]
            },
            {
              "id": "personkrav",
              "label": "Personkrav",
              "items": [
                { "id": "styrer_alder", "label": "Styrer over 20" }
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
            ["formelle_krav.soknad_komplett"] = new() { Status = "vurdert_ok", Merknad = "OK" },
            ["formelle_krav.kommune_riktig"] = new() { Status = "maa_undersokes", Merknad = "Mangler kommune-nr" },
            ["personkrav.styrer_alder"] = new() { Status = "vurdert_ok", Merknad = "46 år" },
        };

        using var result = ChecklistAggregator.Aggregate(MiniSchema, verdicts);
        var root = result.RootElement;

        var sjekkliste = root.GetProperty("sjekkliste");
        var formelle = sjekkliste.GetProperty("formelle_krav");
        formelle.GetProperty("label").GetString().Should().Be("Formelle krav");

        var komplett = formelle.GetProperty("punkter").GetProperty("soknad_komplett");
        komplett.GetProperty("label").GetString().Should().Be("Søknad komplett");
        komplett.GetProperty("status").GetString().Should().Be("vurdert_ok");
        komplett.GetProperty("merknad").GetString().Should().Be("OK");

        sjekkliste.GetProperty("personkrav").GetProperty("punkter").GetProperty("styrer_alder")
            .GetProperty("status").GetString().Should().Be("vurdert_ok");
    }

    [Fact]
    public void Aggregate_MissingVerdict_FallsBackToDefaultStatusWithMerknad()
    {
        // Only 1 of 3 punkter has a verdict — the other 2 should fall back.
        var verdicts = new Dictionary<string, ItemVerdict>
        {
            ["formelle_krav.soknad_komplett"] = new() { Status = "vurdert_ok", Merknad = "OK" },
        };

        using var result = ChecklistAggregator.Aggregate(MiniSchema, verdicts);
        var missing = result.RootElement.GetProperty("sjekkliste")
            .GetProperty("personkrav").GetProperty("punkter").GetProperty("styrer_alder");

        missing.GetProperty("status").GetString().Should().Be("ikke_vurdert");
        missing.GetProperty("merknad").GetString().Should().Contain("Ingen markdown-regel");
    }
}
