using System.Text.Json;
using Altinn.Augmenter.Agent.Services.Agent.Tools;
using FluentAssertions;

namespace Altinn.Augmenter.Agent.Tests.Unit.Tools;

/// <summary>
/// Covers the 8 deterministic tools ported from
/// <c>training/experiments/exp-direct-tools/scripts/tools.py</c>. Each tool gets
/// 2-4 parametrized cases focused on its mechanical logic and the
/// "returns { error: ... } rather than throws" contract.
/// </summary>
public class ToolTests
{
    private static readonly JsonDocument SampleApplication = JsonDocument.Parse("""
        {
          "Bevillingsansvarlig": {
            "Styrer": { "Foedselsnummer": "01018012345", "Navn": "Test Person" }
          },
          "Arrangement": {
            "ArrangementPeriode": [
              { "StartDato": "2026-12-19", "SluttDato": "2026-12-19" }
            ],
            "Vedlegg": [
              { "FileName": "leiekontrakt.pdf" },
              { "FileName": "plantegning.png" }
            ]
          },
          "Vedlegg": [
            "kvittering-gebyr.pdf"
          ]
        }
        """);

    private static JsonElement Args(string json) => JsonDocument.Parse(json).RootElement;

    // --- age_at_date_from_fnr -----------------------------------------------------

    [Theory]
    [InlineData("01018012345", "2026-05-20", 46)]   // born 1980-01-01 → age 46 on 2026-05-20
    [InlineData("31125012345", "2026-05-20", 75)]   // born 1950-12-31 → 75 (birthday already passed)
    [InlineData("01018012345", "2026-01-01", 46)]   // exactly on birthday → 46
    [InlineData("02018012345", "2026-01-01", 45)]   // day before birthday → still 45
    public void AgeFromId_FnrDecoder_ValidInputs_ReturnsExpectedAge(string fnr, string refDate, int expectedAge)
    {
        var tool = new AgeFromIdTool();
        var result = tool.Invoke(Args($$"""{ "id": "{{fnr}}", "reference_date": "{{refDate}}", "decoder": "fnr-no" }"""), SampleApplication);
        var json = JsonSerializer.SerializeToElement(result);
        json.GetProperty("age").GetInt32().Should().Be(expectedAge);
    }

    [Theory]
    [InlineData("not-a-fnr")]
    [InlineData("12345")]
    [InlineData("")]
    public void AgeFromId_FnrDecoder_InvalidId_ReturnsError(string fnr)
    {
        var tool = new AgeFromIdTool();
        var result = tool.Invoke(Args($$"""{ "id": "{{fnr}}", "reference_date": "2026-01-01", "decoder": "fnr-no" }"""), SampleApplication);
        var json = JsonSerializer.SerializeToElement(result);
        json.TryGetProperty("error", out _).Should().BeTrue();
    }

    [Fact]
    public void AgeFromId_FnrDecoder_DNumber_DecodesDayMinus40()
    {
        // D-number: day = real-day + 40. 41018012345 → day 1, month 01, 1980 → age 46 on 2026-05-20
        var tool = new AgeFromIdTool();
        var result = tool.Invoke(Args("""{ "id": "41018012345", "reference_date": "2026-05-20", "decoder": "fnr-no" }"""), SampleApplication);
        var json = JsonSerializer.SerializeToElement(result);
        json.GetProperty("age").GetInt32().Should().Be(46);
        json.GetProperty("birthdate").GetString().Should().Be("1980-01-01");
    }

    [Fact]
    public void AgeFromId_UnknownDecoder_ReturnsError()
    {
        var tool = new AgeFromIdTool();
        var result = tool.Invoke(Args("""{ "id": "01018012345", "reference_date": "2026-01-01", "decoder": "ssn-us" }"""), SampleApplication);
        var json = JsonSerializer.SerializeToElement(result);
        json.TryGetProperty("error", out _).Should().BeTrue();
    }

    // --- days_between -------------------------------------------------------------

    [Theory]
    [InlineData("2026-12-19", "2026-12-20", 1)]
    [InlineData("2026-12-19", "2026-12-19", 0)]
    [InlineData("2026-12-20", "2026-12-19", -1)]
    [InlineData("2026-01-01", "2027-01-01", 365)]
    public void DaysBetween_ValidDates_ReturnsExpected(string from, string to, int expected)
    {
        var tool = new DaysBetweenTool();
        var result = tool.Invoke(Args($$"""{ "from_date": "{{from}}", "to_date": "{{to}}" }"""), SampleApplication);
        var json = JsonSerializer.SerializeToElement(result);
        json.GetProperty("days").GetInt32().Should().Be(expected);
    }

    [Fact]
    public void DaysBetween_InvalidFormat_ReturnsError()
    {
        var tool = new DaysBetweenTool();
        var result = tool.Invoke(Args("""{ "from_date": "yesterday", "to_date": "today" }"""), SampleApplication);
        var json = JsonSerializer.SerializeToElement(result);
        json.TryGetProperty("error", out _).Should().BeTrue();
    }

    // --- time_within_window -------------------------------------------------------

    [Theory]
    [InlineData("18:00", "01:00", "06:00", "03:00", true)]   // period wraps midnight, fits 06:00-03:00 window
    [InlineData("06:00", "03:00", "06:00", "03:00", true)]   // exact match (both wrap)
    [InlineData("05:30", "02:00", "06:00", "03:00", false)]  // starts before window start
    [InlineData("18:00", "04:00", "06:00", "03:00", false)]  // ends after window end
    [InlineData("13:00", "03:00", "13:00", "03:00", true)]   // tighter window, exact match
    [InlineData("12:00", "03:00", "13:00", "03:00", false)]  // starts before tighter window start
    [InlineData("10:00", "14:00", "09:00", "17:00", true)]   // both intervals fully diurnal
    public void TimeWithinWindow_Cases(string start, string end, string winStart, string winEnd, bool within)
    {
        var tool = new TimeWithinWindowTool();
        var result = tool.Invoke(
            Args($$"""{ "start_time": "{{start}}", "end_time": "{{end}}", "window_start": "{{winStart}}", "window_end": "{{winEnd}}" }"""),
            SampleApplication);
        var json = JsonSerializer.SerializeToElement(result);
        json.GetProperty("within").GetBoolean().Should().Be(within);
    }

    [Fact]
    public void TimeWithinWindow_BadTime_ReturnsError()
    {
        var tool = new TimeWithinWindowTool();
        var result = tool.Invoke(
            Args("""{ "start_time": "25:00", "end_time": "03:00", "window_start": "06:00", "window_end": "03:00" }"""),
            SampleApplication);
        var json = JsonSerializer.SerializeToElement(result);
        json.TryGetProperty("error", out _).Should().BeTrue();
    }

    // --- lookup (registry, key) ---------------------------------------------------

    [Theory]
    [InlineData("4204", "Kristiansand")]
    [InlineData("4223", "Vennesla")]
    public void Lookup_KommunerRegistry_Known_ReturnsName(string nr, string expectedName)
    {
        var tool = new LookupTool(RealRegistryProvider());
        var result = tool.Invoke(Args($$"""{ "registry": "kommuner", "key": "{{nr}}" }"""), SampleApplication);
        var json = JsonSerializer.SerializeToElement(result);
        json.GetProperty("name").GetString().Should().Be(expectedName);
    }

    [Fact]
    public void Lookup_KommunerRegistry_Unknown_ReturnsError()
    {
        var tool = new LookupTool(RealRegistryProvider());
        var result = tool.Invoke(Args("""{ "registry": "kommuner", "key": "9999" }"""), SampleApplication);
        var json = JsonSerializer.SerializeToElement(result);
        json.TryGetProperty("error", out _).Should().BeTrue();
    }

    [Fact]
    public void Lookup_UnknownRegistry_ReturnsError()
    {
        var tool = new LookupTool(RealRegistryProvider());
        var result = tool.Invoke(Args("""{ "registry": "non_existent", "key": "x" }"""), SampleApplication);
        var json = JsonSerializer.SerializeToElement(result);
        json.TryGetProperty("error", out var err).Should().BeTrue();
        err.GetString().Should().Contain("Unknown registry");
    }

    private static Altinn.Augmenter.Agent.Services.Registries.RegistryProvider RealRegistryProvider()
        => new(Microsoft.Extensions.Options.Options.Create(
            new Altinn.Augmenter.Agent.Configuration.ContentPathsOptions
            {
                RegistriesRoot = Path.Combine(Altinn.Augmenter.Agent.Tests.Integration.Helpers.ConfigLocator.GetConfigRoot(), "registries"),
            }));

    // --- path_value ---------------------------------------------------------------

    [Fact]
    public void PathValue_Present_ReturnsValue()
    {
        var tool = new PathValueTool();
        var result = tool.Invoke(Args("""{ "json_path": "Bevillingsansvarlig.Styrer.Navn" }"""), SampleApplication);
        var json = JsonSerializer.SerializeToElement(result);
        json.GetProperty("present").GetBoolean().Should().BeTrue();
        json.GetProperty("value").GetString().Should().Be("Test Person");
    }

    [Fact]
    public void PathValue_WithIndex_ReturnsArrayElement()
    {
        var tool = new PathValueTool();
        var result = tool.Invoke(Args("""{ "json_path": "Arrangement.ArrangementPeriode[0].StartDato" }"""), SampleApplication);
        var json = JsonSerializer.SerializeToElement(result);
        json.GetProperty("present").GetBoolean().Should().BeTrue();
        json.GetProperty("value").GetString().Should().Be("2026-12-19");
    }

    [Fact]
    public void PathValue_Missing_ReturnsAbsent()
    {
        var tool = new PathValueTool();
        var result = tool.Invoke(Args("""{ "json_path": "Bevillingsansvarlig.NotAField" }"""), SampleApplication);
        var json = JsonSerializer.SerializeToElement(result);
        json.GetProperty("present").GetBoolean().Should().BeFalse();
        json.GetProperty("missing_at").GetString().Should().Be("Bevillingsansvarlig.NotAField");
    }

    // --- count_attachments --------------------------------------------------------

    [Fact]
    public void CountAttachments_NoFilter_CountsAllRecursive()
    {
        var tool = new CountAttachmentsTool();
        var result = tool.Invoke(Args("{}"), SampleApplication);
        var json = JsonSerializer.SerializeToElement(result);
        json.GetProperty("count").GetInt32().Should().Be(3); // 2 nested + 1 top-level
    }

    [Fact]
    public void CountAttachments_WithFilter_CaseInsensitiveSubstring()
    {
        var tool = new CountAttachmentsTool();
        var result = tool.Invoke(Args("""{ "name_contains": "PLAN" }"""), SampleApplication);
        var json = JsonSerializer.SerializeToElement(result);
        json.GetProperty("count").GetInt32().Should().Be(1);
        json.GetProperty("names")[0].GetString().Should().Be("plantegning.png");
    }

    // --- text_matches_any ---------------------------------------------------------

    [Fact]
    public void TextMatchesAny_ExactMatch_Found()
    {
        var tool = new TextMatchesAnyTool();
        var result = tool.Invoke(
            Args("""{ "haystack": "Julebord", "needles": ["julebord", "firmafest"] }"""),
            SampleApplication);
        var json = JsonSerializer.SerializeToElement(result);
        json.GetProperty("match").GetBoolean().Should().BeTrue();
        json.GetProperty("matched").GetString().Should().Be("julebord");
    }

    [Fact]
    public void TextMatchesAny_PartialMatch_NotFound()
    {
        var tool = new TextMatchesAnyTool();
        var result = tool.Invoke(
            Args("""{ "haystack": "Julebord 2026", "needles": ["julebord"] }"""),
            SampleApplication);
        var json = JsonSerializer.SerializeToElement(result);
        json.GetProperty("match").GetBoolean().Should().BeFalse();
    }

    // --- text_contains_any --------------------------------------------------------

    [Fact]
    public void TextContainsAny_Substring_Found()
    {
        var tool = new TextContainsAnyTool();
        var result = tool.Invoke(
            Args("""{ "haystack": "Maharaja Restaurant", "needles": ["restaurant", "kro"] }"""),
            SampleApplication);
        var json = JsonSerializer.SerializeToElement(result);
        json.GetProperty("contains").GetBoolean().Should().BeTrue();
        json.GetProperty("matched").GetString().Should().Be("restaurant");
    }

    [Fact]
    public void TextContainsAny_NoMatch_ReturnsFalse()
    {
        var tool = new TextContainsAnyTool();
        var result = tool.Invoke(
            Args("""{ "haystack": "Tannlegen", "needles": ["restaurant", "kro"] }"""),
            SampleApplication);
        var json = JsonSerializer.SerializeToElement(result);
        json.GetProperty("contains").GetBoolean().Should().BeFalse();
    }

    // --- ToolRegistry.Dispatch ----------------------------------------------------

    [Fact]
    public void ToolRegistry_Dispatch_UnknownTool_ReturnsErrorJson()
    {
        var registry = ToolRegistry.ForTesting();
        var json = registry.Dispatch("nonexistent_tool", Args("{}"), SampleApplication);
        var parsed = JsonDocument.Parse(json);
        parsed.RootElement.TryGetProperty("error", out var err).Should().BeTrue();
        err.GetString().Should().Contain("Unknown tool");
    }

    [Fact]
    public void ToolRegistry_Dispatch_KnownTool_ReturnsSerializedResult()
    {
        var registry = ToolRegistry.ForTesting();
        var json = registry.Dispatch(
            "days_between",
            Args("""{ "from_date": "2026-01-01", "to_date": "2026-01-15" }"""),
            SampleApplication);
        var parsed = JsonDocument.Parse(json);
        parsed.RootElement.GetProperty("days").GetInt32().Should().Be(14);
    }

    [Fact]
    public void ToolRegistry_BuiltIn_HasEightTools()
    {
        ToolRegistry.BuiltIn(RealRegistryProvider()).Select(t => t.Name).Should().BeEquivalentTo(
            "age_from_id", "days_between", "time_within_window",
            "lookup", "path_value", "count_attachments",
            "text_matches_any", "text_contains_any");
    }

    [Fact]
    public void ToolRegistry_MissingDefinition_ThrowsOnConstruction()
    {
        // BuiltIn() returns 8 impls; pass an empty defs map → registry should
        // refuse rather than silently produce a tool with no definition.
        var act = () => new ToolRegistry(ToolRegistry.BuiltIn(RealRegistryProvider()), new Dictionary<string, ToolDefinition>());
        act.Should().Throw<InvalidOperationException>().WithMessage("*has an implementation but no definition*");
    }

    [Fact]
    public void ToolRegistry_OrphanDefinition_ThrowsOnConstruction()
    {
        var defs = new Dictionary<string, ToolDefinition>
        {
            ["days_between"] = new() { Function = new ToolFunctionDefinition
            {
                Name = "days_between",
                Description = "x",
                Parameters = JsonDocument.Parse("{}").RootElement.Clone(),
            } },
            ["a_phantom_tool"] = new() { Function = new ToolFunctionDefinition
            {
                Name = "a_phantom_tool",
                Description = "x",
                Parameters = JsonDocument.Parse("{}").RootElement.Clone(),
            } },
        };
        var act = () => new ToolRegistry([new DaysBetweenTool()], defs);
        act.Should().Throw<InvalidOperationException>().WithMessage("*without an implementation*a_phantom_tool*");
    }

    [Fact]
    public void ToolDefinition_SerializesParametersAsSchema()
    {
        // Ensure JsonElementConverter prevents the outer snake_case naming policy
        // (used by SandkasseChatService) from mangling JSON-schema property names
        // like "type" or "properties".
        var def = new ToolDefinition
        {
            Function = new ToolFunctionDefinition
            {
                Name = "x",
                Description = "x",
                Parameters = JsonDocument.Parse("""{"type":"object","properties":{"a":{"type":"string"}},"required":["a"]}""").RootElement.Clone(),
            },
        };
        var snakeOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower };
        var serialized = JsonSerializer.Serialize(def, snakeOptions);
        serialized.Should().Contain("\"type\":");
        serialized.Should().Contain("\"properties\":");
        serialized.Should().Contain("\"required\":");
    }
}
