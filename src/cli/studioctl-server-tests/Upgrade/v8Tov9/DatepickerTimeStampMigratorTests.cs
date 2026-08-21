using System.Text;
using System.Text.Json;
using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9.DatepickerMigration;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class DatepickerTimeStampMigratorTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private async Task<DatepickerTimeStampMigrationResult> Migrate()
    {
        using var outputScope = UpgradeConsole.Use(TextWriter.Null, TextWriter.Null);
        return await new DatepickerTimeStampMigrator(_app.Root).Migrate();
    }

    [Fact]
    public async Task AddsTimeStampTrueWhenPropertyIsMissing()
    {
        _app.Write(
            "ui/Task_1/layouts/Side1.json",
            """
            {
              "data": {
                "layout": [
                  {
                    "id": "birthdate",
                    "type": "Datepicker",
                    "dataModelBindings": { "simpleBinding": "BirthDate" },
                    "minDate": "1900-01-01T12:00:00.000Z"
                  },
                  {
                    "id": "title",
                    "type": "Paragraph",
                    "textResourceBindings": { "title": "page.title" }
                  }
                ]
              }
            }
            """
        );

        var result = await Migrate();

        Assert.Equal(1, result.FilesChanged);
        Assert.Equal(1, result.PropertiesAdded);
        var after = _app.Read("ui/Task_1/layouts/Side1.json");
        Assert.Contains("\"timeStamp\": true", after, StringComparison.Ordinal);
        Assert.Contains("\"type\": \"Paragraph\"", after, StringComparison.Ordinal);
        using var _ = JsonDocument.Parse(after);
    }

    [Fact]
    public async Task LeavesExplicitFalseUntouched()
    {
        var before = """
            {
              "data": {
                "layout": [
                  {
                    "id": "birthdate",
                    "type": "Datepicker",
                    "timeStamp": false,
                    "dataModelBindings": { "simpleBinding": "BirthDate" }
                  }
                ]
              }
            }
            """;
        _app.Write("ui/Task_1/layouts/Side1.json", before);

        var result = await Migrate();

        Assert.Equal(0, result.FilesChanged);
        Assert.Equal(0, result.PropertiesAdded);
        Assert.Equal(before, _app.Read("ui/Task_1/layouts/Side1.json"));
    }

    [Fact]
    public async Task LeavesExplicitTrueUntouched()
    {
        var before = """
            {
              "data": {
                "layout": [
                  {
                    "id": "birthdate",
                    "type": "Datepicker",
                    "timeStamp": true,
                    "dataModelBindings": { "simpleBinding": "BirthDate" }
                  }
                ]
              }
            }
            """;
        _app.Write("ui/Task_1/layouts/Side1.json", before);

        var result = await Migrate();

        Assert.Equal(0, result.FilesChanged);
        Assert.Equal(0, result.PropertiesAdded);
        Assert.Equal(before, _app.Read("ui/Task_1/layouts/Side1.json"));
    }

    [Fact]
    public async Task IgnoresJsonOutsideLayoutsFolders()
    {
        _app.Write(
            "ui/Task_1/Settings.json",
            """
            {
              "type": "Datepicker"
            }
            """
        );

        var result = await Migrate();

        Assert.Equal(0, result.FilesChanged);
        Assert.DoesNotContain("timeStamp", _app.Read("ui/Task_1/Settings.json"), StringComparison.Ordinal);
    }

    [Fact]
    public async Task PreservesUtf8BomWhenPresent()
    {
        var layout = """
            {
              "data": {
                "layout": [
                  {
                    "id": "birthdate",
                    "type": "Datepicker",
                    "dataModelBindings": { "simpleBinding": "BirthDate" }
                  }
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
        Assert.Contains("\"timeStamp\": true", after, StringComparison.Ordinal);
    }

    [Fact]
    public async Task ReturnsEmptyResultWhenNoUiDirectoryExists()
    {
        using var outputScope = UpgradeConsole.Use(TextWriter.Null, TextWriter.Null);
        var result = await new DatepickerTimeStampMigrator(Path.Combine(_app.Root, "missing")).Migrate();
        Assert.Equal(0, result.FilesChanged);
        Assert.Equal(0, result.PropertiesAdded);
    }
}
