using System.Text.Json;
using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// Pins the v9 rename of the app-overridable datepicker text-resource keys: an override left under
/// the old key would silently stop applying after the upgrade.
/// </summary>
public sealed class DatepickerTextResourceKeyMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private async Task Migrate()
    {
        using var outputScope = UpgradeConsole.Use(TextWriter.Null, TextWriter.Null);
        var exitCode = await DatepickerTextResourceKeyMigration.Migrate(_app.Root);
        Assert.Equal(0, exitCode);
    }

    [Fact]
    public async Task RenamesOverriddenKeysInEveryResourceFile()
    {
        _app.Write(
            "config/texts/resource.nb.json",
            """
            {
              "language": "nb",
              "resources": [
                { "id": "appName", "value": "test" },
                { "id": "date_picker.min_date_exeeded", "value": "For tidlig" },
                { "id": "date_picker.max_date_exeeded", "value": "For sent" }
              ]
            }
            """
        );
        _app.Write(
            "config/texts/resource.en.json",
            """
            {
              "language": "en",
              "resources": [{ "id": "date_picker.min_date_exeeded", "value": "Too early" }]
            }
            """
        );

        await Migrate();

        var nb = _app.Read("config/texts/resource.nb.json");
        Assert.Contains("\"date_picker.min_date_exceeded\"", nb, StringComparison.Ordinal);
        Assert.Contains("\"date_picker.max_date_exceeded\"", nb, StringComparison.Ordinal);
        Assert.DoesNotContain("exeeded", nb, StringComparison.Ordinal);
        Assert.Contains("\"For tidlig\"", nb, StringComparison.Ordinal);
        Assert.Contains(
            "\"date_picker.min_date_exceeded\"",
            _app.Read("config/texts/resource.en.json"),
            StringComparison.Ordinal
        );
        using var _ = JsonDocument.Parse(nb);
    }

    [Fact]
    public async Task LeavesAppsWithoutTheOverrideUntouched()
    {
        var content = """
            {
              "language": "nb",
              "resources": [{ "id": "date_picker.min_date_exceeded", "value": "Allerede migrert" }]
            }
            """;
        _app.Write("config/texts/resource.nb.json", content);

        await Migrate();

        Assert.Equal(content, _app.Read("config/texts/resource.nb.json"));
    }
}
