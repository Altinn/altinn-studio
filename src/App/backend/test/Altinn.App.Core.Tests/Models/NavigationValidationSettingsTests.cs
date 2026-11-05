using System.Text.Json;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Tests.Models;

public class NavigationValidationSettingsTests
{
    [Fact]
    public void UiConfiguration_PreservesTaskAndAppValidationSettings()
    {
        const string json = """
            {
              "folders": {
                "Task_1": {
                  "pages": {
                    "order": ["details", "summary"],
                    "validationOnNavigation": { "page": "current", "show": ["Required"] },
                    "validateOnBackToSummary": { "page": "current", "show": [] }
                  }
                }
              },
              "settings": {
                "validateOnBackToSummary": { "page": "all", "show": ["Schema"] }
              }
            }
            """;

        var configuration = JsonSerializer.Deserialize<UiConfiguration>(json, JsonSerializerOptions.Web);
        Assert.NotNull(configuration);
        var pages = configuration.Folders["Task_1"].Pages;
        Assert.NotNull(pages);
        Assert.Equal([ValidationMask.Required], pages.ValidationOnNavigation?.Show);
        Assert.NotNull(pages.ValidateOnBackToSummary);
        Assert.Empty(pages.ValidateOnBackToSummary.Show);
        Assert.Equal(PageValidationScope.All, configuration.Settings?.ValidateOnBackToSummary?.Page);
        Assert.Equal([ValidationMask.Schema], configuration.Settings?.ValidateOnBackToSummary?.Show);

        var roundTrip = JsonSerializer.SerializeToElement(configuration, JsonSerializerOptions.Web);
        Assert.Equal(
            0,
            roundTrip
                .GetProperty("folders")
                .GetProperty("Task_1")
                .GetProperty("pages")
                .GetProperty("validateOnBackToSummary")
                .GetProperty("show")
                .GetArrayLength()
        );
        Assert.Equal(
            "all",
            roundTrip.GetProperty("settings").GetProperty("validateOnBackToSummary").GetProperty("page").GetString()
        );
    }
}
