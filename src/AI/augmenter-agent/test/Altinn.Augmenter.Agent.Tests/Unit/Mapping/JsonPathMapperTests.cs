using System.Text.Json;
using Altinn.Augmenter.Agent.Configuration;
using Altinn.Augmenter.Agent.Pipelines.Generic.Mapping;
using Altinn.Augmenter.Agent.Services.Registries;
using FluentAssertions;
using Microsoft.Extensions.Options;

namespace Altinn.Augmenter.Agent.Tests.Unit.Mapping;

public class JsonPathMapperTests
{
    // Covers each spec primitive in isolation. Each test writes a spec file
    // to a temp folder, feeds in a sample FlatData, and asserts the output.
    // Date-sensitive tests pin DateTime.UtcNow via the optional ctor parameter.

    private static JsonElement SampleApp() => JsonDocument.Parse("""
        {
          "BevillingsType": "skjenke",
          "Kommunenummer": "4204",
          "Bevillingsansvarlig": {
            "Styrer": { "Fornavn": "Ola", "Etternavn": "Hansen", "Foedselsnummer": "01018012345" },
            "Stedfortreder": { "FulltNavn": "Per Olsen", "Foedselsnummer": "02028012345" }
          },
          "Arrangement": {
            "Type": "innendoers",
            "ArrangementPeriode": [{ "StartDato": "2026-12-19" }],
            "AntallDeltakere": "150",
            "VaregruppeAlkohol": "gruppeTo"
          },
          "SkalFornyeBevilling": true,
          "VedleggsListe": { "Rader": [{ "Navn": "leiekontrakt.pdf" }, { "Filnavn": "plantegning.png" }] }
        }
        """).RootElement;

    private static (JsonPathMapper mapper, IDisposable cleanup) Build(string spec, DateTime? today = null)
    {
        var dir = Path.Combine(Path.GetTempPath(), $"jsonpath-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(dir);
        var registriesDir = Path.Combine(dir, "registries");
        Directory.CreateDirectory(registriesDir);
        File.WriteAllText(Path.Combine(registriesDir, "kommuner.json"), """
            {
              "default": { "name": "Default", "klage_epost": "default@example.com" },
              "entries": {
                "4204": { "name": "Kristiansand", "klage_epost": "post@kristiansand.kommune.no" }
              }
            }
            """);
        File.WriteAllText(Path.Combine(registriesDir, "alkoholgrupper.json"), """
            {
              "default": "–",
              "rules": [
                { "contains": ["to", "2"], "value": "Gruppe 1 og 2" },
                { "fallback": true, "value": "Gruppe 1" }
              ]
            }
            """);
        File.WriteAllText(Path.Combine(registriesDir, "bevillingstyper.json"), """
            {
              "default": "default-value",
              "references": ["Lov A §1", "Lov B §2"],
              "mapping": { "skjenke": "alminnelig skjenkebevilling", "salg": "salgsbevilling" }
            }
            """);

        var specPath = Path.Combine(dir, "spec.json");
        File.WriteAllText(specPath, spec);

        var registries = new RegistryProvider(Options.Create(new ContentPathsOptions { RegistriesRoot = registriesDir }));
        var mapper = new JsonPathMapper(specPath, registries, today.HasValue ? () => today.Value : null);
        return (mapper, new Cleanup(dir));
    }

    private sealed class Cleanup(string dir) : IDisposable
    {
        public void Dispose() { try { Directory.Delete(dir, true); } catch { /* test cleanup is best-effort */ } }
    }

    // --- Leaves ----------------------------------------------------------------

    [Fact]
    public void Const_WritesValue()
    {
        var (mapper, cleanup) = Build("""{"output":{"x":{"kind":"const","value":"hello"}}}""");
        using (cleanup)
        {
            var doc = mapper.Map(SampleApp());
            doc.RootElement.GetProperty("x").GetString().Should().Be("hello");
        }
    }

    [Fact]
    public void Today_WritesCurrentUtcDate()
    {
        var (mapper, cleanup) = Build(
            """{"output":{"d":{"kind":"today"}}}""",
            today: new DateTime(2026, 5, 20, 12, 0, 0, DateTimeKind.Utc));
        using (cleanup)
        {
            var doc = mapper.Map(SampleApp());
            doc.RootElement.GetProperty("d").GetString().Should().Be("2026-05-20");
        }
    }

    [Fact]
    public void Path_Present_ReturnsValue()
    {
        var (mapper, cleanup) = Build("""{"output":{"v":{"kind":"path","source":"BevillingsType","default":"ukjent"}}}""");
        using (cleanup)
        {
            mapper.Map(SampleApp()).RootElement.GetProperty("v").GetString().Should().Be("skjenke");
        }
    }

    [Fact]
    public void Path_Missing_ReturnsDefault()
    {
        var (mapper, cleanup) = Build("""{"output":{"v":{"kind":"path","source":"DoesNotExist","default":"ukjent"}}}""");
        using (cleanup)
        {
            mapper.Map(SampleApp()).RootElement.GetProperty("v").GetString().Should().Be("ukjent");
        }
    }

    [Fact]
    public void Chain_FallsThroughToFirstHit()
    {
        var (mapper, cleanup) = Build("""
            {"output":{"v":{"kind":"chain","sources":["Missing","Bevillingsansvarlig.Stedfortreder.FulltNavn","BevillingsType"],"default":"–"}}}
            """);
        using (cleanup)
        {
            mapper.Map(SampleApp()).RootElement.GetProperty("v").GetString().Should().Be("Per Olsen");
        }
    }

    [Fact]
    public void Switch_KnownCase_ReturnsCaseValue()
    {
        var (mapper, cleanup) = Build("""
            {"output":{"v":{"kind":"switch","source":"Arrangement.Type","cases":{"innendoers":"Innendørs","utendoers":"Utendørs"},"default":"–"}}}
            """);
        using (cleanup)
        {
            mapper.Map(SampleApp()).RootElement.GetProperty("v").GetString().Should().Be("Innendørs");
        }
    }

    [Fact]
    public void Switch_UnknownCase_ReturnsDefault()
    {
        var (mapper, cleanup) = Build("""
            {"output":{"v":{"kind":"switch","source":"BevillingsType","cases":{"salg":"S"},"default":"x"}}}
            """);
        using (cleanup)
        {
            mapper.Map(SampleApp()).RootElement.GetProperty("v").GetString().Should().Be("x");
        }
    }

    [Fact]
    public void Concat_JoinsPathsAndLiterals_Whitespace()
    {
        var (mapper, cleanup) = Build("""
            {"output":{"v":{"kind":"concat","parts":["$Bevillingsansvarlig.Styrer.Fornavn","$Bevillingsansvarlig.Styrer.Etternavn"],"separator":" "}}}
            """);
        using (cleanup)
        {
            mapper.Map(SampleApp()).RootElement.GetProperty("v").GetString().Should().Be("Ola Hansen");
        }
    }

    [Fact]
    public void Boolean_PresentAndTrue_True()
    {
        var (mapper, cleanup) = Build("""{"output":{"b":{"kind":"boolean","source":"SkalFornyeBevilling"}}}""");
        using (cleanup)
        {
            mapper.Map(SampleApp()).RootElement.GetProperty("b").GetBoolean().Should().BeTrue();
        }
    }

    [Fact]
    public void Boolean_Missing_False()
    {
        var (mapper, cleanup) = Build("""{"output":{"b":{"kind":"boolean","source":"Missing"}}}""");
        using (cleanup)
        {
            mapper.Map(SampleApp()).RootElement.GetProperty("b").GetBoolean().Should().BeFalse();
        }
    }

    [Fact]
    public void Int_StringValueParses()
    {
        var (mapper, cleanup) = Build("""{"output":{"n":{"kind":"int","source":"Arrangement.AntallDeltakere","default":0}}}""");
        using (cleanup)
        {
            mapper.Map(SampleApp()).RootElement.GetProperty("n").GetInt32().Should().Be(150);
        }
    }

    [Fact]
    public void Int_MissingPath_ReturnsDefault()
    {
        var (mapper, cleanup) = Build("""{"output":{"n":{"kind":"int","source":"Missing","default":42}}}""");
        using (cleanup)
        {
            mapper.Map(SampleApp()).RootElement.GetProperty("n").GetInt32().Should().Be(42);
        }
    }

    [Fact]
    public void RegistryField_KnownKey_ReturnsField()
    {
        var (mapper, cleanup) = Build("""
            {"output":{"k":{"kind":"registry_field","registry":"kommuner.json","key_sources":["Kommunenummer"],"field":"name","default":"–"}}}
            """);
        using (cleanup)
        {
            mapper.Map(SampleApp()).RootElement.GetProperty("k").GetString().Should().Be("Kristiansand");
        }
    }

    [Fact]
    public void RegistryField_UnknownKey_UseDefault_True_ReturnsDefaultEntry()
    {
        var (mapper, cleanup) = Build("""
            {"output":{"k":{"kind":"registry_field","registry":"kommuner.json","key_sources":["Missing"],"field":"name","use_default":true,"default":"–"}}}
            """);
        using (cleanup)
        {
            mapper.Map(SampleApp()).RootElement.GetProperty("k").GetString().Should().Be("Default");
        }
    }

    [Fact]
    public void RegistryField_UnknownKey_NoDefault_FallbackSource_ReturnsFallback()
    {
        var (mapper, cleanup) = Build("""
            {"output":{"k":{"kind":"registry_field","registry":"kommuner.json","key_sources":["Missing"],"field":"name","fallback_sources":["BevillingsType"],"default":"–"}}}
            """);
        using (cleanup)
        {
            mapper.Map(SampleApp()).RootElement.GetProperty("k").GetString().Should().Be("skjenke");
        }
    }

    [Fact]
    public void RuleMatch_ContainsMatches_ReturnsValue()
    {
        var (mapper, cleanup) = Build("""
            {"output":{"g":{"kind":"rule_match","registry":"alkoholgrupper.json","source":"Arrangement.VaregruppeAlkohol"}}}
            """);
        using (cleanup)
        {
            mapper.Map(SampleApp()).RootElement.GetProperty("g").GetString().Should().Be("Gruppe 1 og 2");
        }
    }

    [Fact]
    public void Mapping_KnownInput_ReturnsMapped()
    {
        var (mapper, cleanup) = Build("""
            {"output":{"t":{"kind":"mapping","registry":"bevillingstyper.json","source":"BevillingsType"}}}
            """);
        using (cleanup)
        {
            mapper.Map(SampleApp()).RootElement.GetProperty("t").GetString().Should().Be("alminnelig skjenkebevilling");
        }
    }

    // --- Nested objects + arrays ----------------------------------------------

    [Fact]
    public void NestedObject_WritesShape()
    {
        var (mapper, cleanup) = Build("""
            {"output":{"meta":{"x":{"kind":"const","value":"a"},"y":{"kind":"const","value":"b"}}}}
            """);
        using (cleanup)
        {
            var meta = mapper.Map(SampleApp()).RootElement.GetProperty("meta");
            meta.GetProperty("x").GetString().Should().Be("a");
            meta.GetProperty("y").GetString().Should().Be("b");
        }
    }

    [Fact]
    public void ListPluck_PicksFromFirstAvailableField()
    {
        var (mapper, cleanup) = Build("""
            {"output":{"v":{"kind":"list_pluck","source":"VedleggsListe.Rader","fields":["Navn","Filnavn"]}}}
            """);
        using (cleanup)
        {
            var arr = mapper.Map(SampleApp()).RootElement.GetProperty("v");
            arr.GetArrayLength().Should().Be(2);
            arr[0].GetString().Should().Be("leiekontrakt.pdf");
            arr[1].GetString().Should().Be("plantegning.png");
        }
    }

    [Fact]
    public void ListConst_References_EmitsRegistryReferences()
    {
        var (mapper, cleanup) = Build("""
            {"output":{"refs":{"kind":"list_const","registry":"bevillingstyper.json","field":"references"}}}
            """);
        using (cleanup)
        {
            var arr = mapper.Map(SampleApp()).RootElement.GetProperty("refs");
            arr.GetArrayLength().Should().Be(2);
            arr[0].GetString().Should().Be("Lov A §1");
            arr[1].GetString().Should().Be("Lov B §2");
        }
    }

    [Fact]
    public void ListConcat_CombinesObjectAndListMap_DeduplicatesByMatchingId()
    {
        // Innsender (fnr=01018012345) should be excluded because Styrer has same fnr.
        var app = JsonDocument.Parse("""
            {
              "Bevillingsansvarlig": {
                "Styrer": { "FulltNavn": "Styrer-S", "Foedselsnummer": "01018012345" }
              },
              "Innsender": { "FulltNavn": "Innsender-I", "Foedselsnummer": "01018012345" }
            }
            """).RootElement;

        var (mapper, cleanup) = Build("""
            {"output":{"personer":{"kind":"list_concat","parts":[
              {"kind":"object_if_present","source":"Bevillingsansvarlig.Styrer","fields":{
                  "rolle":{"kind":"const","value":"Styrer"},
                  "navn":{"kind":"chain","sources":["FulltNavn"]},
                  "id":{"kind":"path","source":"Foedselsnummer"}}},
              {"kind":"object_if_present","source":"Innsender",
                  "exclude_when_id_matches":["Bevillingsansvarlig.Styrer.Foedselsnummer"],
                  "id_field":"Foedselsnummer",
                  "fields":{
                      "rolle":{"kind":"const","value":"Innsender"},
                      "navn":{"kind":"path","source":"FulltNavn"},
                      "id":{"kind":"path","source":"Foedselsnummer"}}}
            ]}}}
            """);
        using (cleanup)
        {
            var arr = mapper.Map(app).RootElement.GetProperty("personer");
            arr.GetArrayLength().Should().Be(1);
            arr[0].GetProperty("rolle").GetString().Should().Be("Styrer");
        }
    }

    [Fact]
    public void Concat_AllPartsMissing_ReturnsDefault()
    {
        var (mapper, cleanup) = Build("""
            {"output":{"v":{"kind":"concat","parts":["$Missing.A","$Missing.B"],"default":"Ukjent"}}}
            """);
        using (cleanup)
        {
            mapper.Map(SampleApp()).RootElement.GetProperty("v").GetString().Should().Be("Ukjent");
        }
    }
}
