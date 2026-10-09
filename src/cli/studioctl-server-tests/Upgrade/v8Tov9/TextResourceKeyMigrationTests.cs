using System.Text.Json;
using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// Pins the v9 rename of app-overridable built-in text-resource keys: an override left under the old
/// key would silently stop applying after the upgrade.
/// </summary>
public sealed class TextResourceKeyMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private async Task<string> Migrate()
    {
        using var output = new StringWriter();
        using (UpgradeConsole.Use(output, TextWriter.Null))
        {
            var exitCode = await TextResourceKeyMigration.Migrate(_app.Root);
            Assert.Equal(0, exitCode);
        }

        return output.ToString();
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

    [Theory]
    [InlineData("MissingContentType", "backend.validation_errors.missing_content_type")]
    [InlineData("DataElementTooLarge", "backend.validation_errors.file_too_large")]
    [InlineData("DataElementFileInfected", "backend.validation_errors.file_infected")]
    [InlineData("DataElementFileScanPending", "backend.validation_errors.file_scan_pending")]
    [InlineData("TooManyDataElementsOfType", "backend.validation_errors.too_many_data_elements")]
    [InlineData("TooFewDataElementsOfType", "backend.validation_errors.too_few_data_elements")]
    public async Task RenamesValidationIssueCodeKeys(string oldKey, string newKey)
    {
        _app.Write(
            "config/texts/resource.nb.json",
            $$"""
            {
              "language": "nb",
              "resources": [{ "id": "{{oldKey}}", "value": "Egen tekst" }]
            }
            """
        );

        await Migrate();

        var nb = _app.Read("config/texts/resource.nb.json");
        Assert.Contains($"\"{newKey}\"", nb, StringComparison.Ordinal);
        Assert.DoesNotContain($"\"{oldKey}\"", nb, StringComparison.Ordinal);
        Assert.Contains("\"Egen tekst\"", nb, StringComparison.Ordinal);
    }

    [Fact]
    public async Task KeepsBothKeysAndAddsTodoWhenTheNewKeyIsAlreadyOverridden()
    {
        var content = """
            {
              "language": "nb",
              "resources": [
                { "id": "DataElementTooLarge", "value": "Gammel tekst" },
                { "id": "backend.validation_errors.file_too_large", "value": "Ny tekst" }
              ]
            }
            """;
        _app.Write("config/texts/resource.nb.json", content);

        var output = await Migrate();

        Assert.Equal(content, _app.Read("config/texts/resource.nb.json"));
        Assert.Contains("'DataElementTooLarge'", output, StringComparison.Ordinal);
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
