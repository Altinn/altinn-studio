using System.Text;
using System.Text.Json;
using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class DatepickerFormatMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private async Task Migrate()
    {
        using var outputScope = UpgradeConsole.Use(TextWriter.Null, TextWriter.Null);
        var exitCode = await DatepickerFormatMigration.Migrate(_app.Root);
        Assert.Equal(0, exitCode);
    }

    [Theory]
    [InlineData("DD.MM.YYYY", "dd.MM.yyyy")]
    [InlineData("DD/MM/YYYY", "dd/MM/yyyy")]
    [InlineData("YYYY-MM-DD", "yyyy-MM-dd")]
    public async Task RewritesLegacyFormatValues(string legacyFormat, string expectedFormat)
    {
        _app.Write(
            "ui/Task_1/layouts/Side1.json",
            $$"""
            {
              "data": {
                "layout": [
                  {
                    "id": "date",
                    "type": "Datepicker",
                    "dataModelBindings": { "simpleBinding": "Skjema.Dato" },
                    "format": "{{legacyFormat}}"
                  }
                ]
              }
            }
            """
        );

        await Migrate();

        var after = _app.Read("ui/Task_1/layouts/Side1.json");
        Assert.Contains($"\"format\": \"{expectedFormat}\"", after, StringComparison.Ordinal);
        Assert.DoesNotContain($"\"format\": \"{legacyFormat}\"", after, StringComparison.Ordinal);
        using var _ = JsonDocument.Parse(after);
    }

    [Fact]
    public async Task RewritesMultipleLegacyFormatsInOneFile()
    {
        _app.Write(
            "ui/Task_1/layouts/Side1.json",
            """
            {
              "data": {
                "layout": [
                  {
                    "id": "from",
                    "type": "Datepicker",
                    "format": "DD.MM.YYYY"
                  },
                  {
                    "id": "to",
                    "type": "Datepicker",
                    "format": "YYYY-MM-DD"
                  }
                ]
              }
            }
            """
        );

        await Migrate();

        var after = _app.Read("ui/Task_1/layouts/Side1.json");
        Assert.Contains("\"format\": \"dd.MM.yyyy\"", after, StringComparison.Ordinal);
        Assert.Contains("\"format\": \"yyyy-MM-dd\"", after, StringComparison.Ordinal);
        Assert.DoesNotContain("YYYY", after, StringComparison.Ordinal);
    }

    [Fact]
    public async Task LeavesModernFormatsUntouched()
    {
        var before = """
            {
              "data": {
                "layout": [
                  {
                    "id": "date",
                    "type": "Datepicker",
                    "format": "dd.MM.yyyy"
                  }
                ]
              }
            }
            """;
        _app.Write("ui/Task_1/layouts/Side1.json", before);

        await Migrate();

        Assert.Equal(before, _app.Read("ui/Task_1/layouts/Side1.json"));
    }

    [Fact]
    public async Task LeavesFormatOnOtherComponentTypesUntouched()
    {
        var before = """
            {
              "data": {
                "layout": [
                  {
                    "id": "text",
                    "type": "Paragraph",
                    "format": "DD.MM.YYYY"
                  }
                ]
              }
            }
            """;
        _app.Write("ui/Task_1/layouts/Side1.json", before);

        await Migrate();

        Assert.Equal(before, _app.Read("ui/Task_1/layouts/Side1.json"));
    }

    [Fact]
    public async Task IgnoresJsonOutsideLayoutsFolders()
    {
        _app.Write(
            "ui/Task_1/Settings.json",
            """
            {
              "type": "Datepicker",
              "format": "DD.MM.YYYY"
            }
            """
        );

        await Migrate();

        Assert.Contains("\"format\": \"DD.MM.YYYY\"", _app.Read("ui/Task_1/Settings.json"), StringComparison.Ordinal);
    }

    [Fact]
    public async Task PreservesUtf8BomWhenPresent()
    {
        var layout = """
            {
              "data": {
                "layout": [
                  { "id": "date", "type": "Datepicker", "format": "DD/MM/YYYY" }
                ]
              }
            }
            """;
        var withBom = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(layout)).ToArray();
        _app.WriteBytes("ui/Task_1/layouts/Side1.json", withBom);

        await Migrate();

        var bytes = _app.ReadBytes("ui/Task_1/layouts/Side1.json");
        Assert.True(bytes.AsSpan().StartsWith(Encoding.UTF8.GetPreamble()));
        var after = Encoding.UTF8.GetString(bytes.AsSpan(Encoding.UTF8.GetPreamble().Length));
        Assert.Contains("\"format\": \"dd/MM/yyyy\"", after, StringComparison.Ordinal);
    }

    [Fact]
    public async Task ReturnsSuccessWhenNoUiDirectoryExists()
    {
        using var outputScope = UpgradeConsole.Use(TextWriter.Null, TextWriter.Null);
        var exitCode = await DatepickerFormatMigration.Migrate(Path.Combine(_app.Root, "missing"));
        Assert.Equal(0, exitCode);
    }
}
