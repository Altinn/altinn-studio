using System.Text;
using System.Text.Json;
using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class HeadingLayoutMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private async Task Migrate()
    {
        using var outputScope = UpgradeConsole.Use(TextWriter.Null, TextWriter.Null);
        var exitCode = await HeadingLayoutMigration.Migrate(_app.Root);
        Assert.Equal(0, exitCode);
    }

    [Fact]
    public async Task RewritesHeaderComponentTypeToHeading()
    {
        _app.Write(
            "ui/Task_1/layouts/Side1.json",
            """
            {
              "data": {
                "layout": [
                  {
                    "id": "title",
                    "type": "Header",
                    "size": "L",
                    "textResourceBindings": { "title": "page.title" }
                  },
                  {
                    "id": "body",
                    "type": "Paragraph",
                    "textResourceBindings": { "title": "page.body" }
                  }
                ]
              }
            }
            """
        );

        await Migrate();

        var after = _app.Read("ui/Task_1/layouts/Side1.json");
        Assert.Contains("\"type\": \"Heading\"", after, StringComparison.Ordinal);
        Assert.DoesNotContain("\"type\": \"Header\"", after, StringComparison.Ordinal);
        Assert.Contains("\"type\": \"Paragraph\"", after, StringComparison.Ordinal);
        using var _ = JsonDocument.Parse(after);
    }

    [Fact]
    public async Task RewritesSummaryComponentTypeRefs()
    {
        _app.Write(
            "ui/Task_1/layouts/summary.json",
            """
            {
              "data": {
                "layout": [
                  {
                    "id": "summary",
                    "type": "Summary2",
                    "overrides": [
                      {
                        "componentType": "Header",
                        "hidden": true
                      }
                    ]
                  }
                ]
              }
            }
            """
        );

        await Migrate();

        var after = _app.Read("ui/Task_1/layouts/summary.json");
        Assert.Contains("\"componentType\": \"Heading\"", after, StringComparison.Ordinal);
        Assert.DoesNotContain("\"componentType\": \"Header\"", after, StringComparison.Ordinal);
        using var _ = JsonDocument.Parse(after);
    }

    [Fact]
    public async Task LeavesAlreadyMigratedLayoutsUntouched()
    {
        var before = """
            {
              "data": {
                "layout": [
                  {
                    "id": "title",
                    "type": "Heading",
                    "size": "M"
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
              "type": "Header"
            }
            """
        );

        await Migrate();

        Assert.Contains("\"type\": \"Header\"", _app.Read("ui/Task_1/Settings.json"), StringComparison.Ordinal);
    }

    [Fact]
    public async Task PreservesUtf8BomWhenPresent()
    {
        var layout = """
            {
              "data": {
                "layout": [
                  { "id": "title", "type": "Header", "size": "S" }
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
        Assert.Contains("\"type\": \"Heading\"", after, StringComparison.Ordinal);
    }

    [Fact]
    public async Task ReturnsSuccessWhenNoUiDirectoryExists()
    {
        using var outputScope = UpgradeConsole.Use(TextWriter.Null, TextWriter.Null);
        var exitCode = await HeadingLayoutMigration.Migrate(Path.Combine(_app.Root, "missing"));
        Assert.Equal(0, exitCode);
    }
}
