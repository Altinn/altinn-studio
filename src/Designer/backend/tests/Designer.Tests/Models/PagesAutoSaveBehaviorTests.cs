using System.Text.Json;
using Altinn.Studio.Designer.Models;
using Xunit;

namespace Designer.Tests.Models;

/// <summary>
/// Designer wrote "autoSaveBehaviour" into an app's layout Settings.json until v9, while the app
/// runtime only ever read "autoSaveBehavior" - so the setting had no effect. Designer now writes the
/// current spelling and reads both, and these tests pin that down in the file format itself.
/// </summary>
public class PagesAutoSaveBehaviorTests
{
    [Fact]
    public void Deserialize_CurrentSpelling_IsRead()
    {
        var pages = Deserialize("""{ "order": ["p1"], "autoSaveBehavior": "onChangeFormData" }""");

        Assert.Equal(AutoSaveBehaviorType.OnChangeFormData, pages.AutoSaveBehavior);
    }

    [Fact]
    public void Deserialize_DeprecatedSpelling_IsStillRead()
    {
        var pages = Deserialize("""{ "order": ["p1"], "autoSaveBehaviour": "onChangeFormData" }""");

        Assert.Equal(AutoSaveBehaviorType.OnChangeFormData, pages.AutoSaveBehavior);
    }

    [Theory]
    // Both orderings, because the deprecated alias assigns with ??= and the current spelling
    // assigns unconditionally - the current spelling has to win either way round.
    [InlineData("""{ "order": ["p1"], "autoSaveBehavior": "onChangePage", "autoSaveBehaviour": "onChangeFormData" }""")]
    [InlineData("""{ "order": ["p1"], "autoSaveBehaviour": "onChangeFormData", "autoSaveBehavior": "onChangePage" }""")]
    public void Deserialize_BothSpellings_CurrentWins(string json)
    {
        var pages = Deserialize(json);

        Assert.Equal(AutoSaveBehaviorType.OnChangePage, pages.AutoSaveBehavior);
    }

    [Fact]
    public void Serialize_WritesOnlyTheCurrentSpelling()
    {
        var pages = new PagesWithOrder { Order = ["p1"], AutoSaveBehavior = AutoSaveBehaviorType.OnChangeFormData };

        var json = JsonSerializer.Serialize<Pages>(pages);

        Assert.Contains("\"autoSaveBehavior\"", json);
        Assert.DoesNotContain("autoSaveBehaviour", json);
    }

    [Fact]
    public void RoundTrip_DeprecatedSpelling_IsRewrittenToCurrent()
    {
        var pages = Deserialize("""{ "order": ["p1"], "autoSaveBehaviour": "onChangeFormData" }""");

        var json = JsonSerializer.Serialize(pages);

        Assert.Contains("\"autoSaveBehavior\"", json);
        Assert.DoesNotContain("autoSaveBehaviour", json);
    }

    private static Pages Deserialize(string json) =>
        JsonSerializer.Deserialize<Pages>(json) ?? throw new JsonException("Expected a Pages instance");
}
