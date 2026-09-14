using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9.NavigationButtonsMigration;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class ShowBackButtonMigratorTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    [Fact]
    public async Task AcceptsLayoutFilesWithCommentsAndTrailingCommas()
    {
        var layout = """
            {
              // Kommentar som Studio har latt stå
              "data": {
                "layout": [
                  {
                    "id": "nav",
                    "type": "NavigationButtons",
                  },
                ],
              },
            }
            """;
        _app.Write("ui/Task_1/layouts/Side1.json", layout);
        using var outputScope = UpgradeConsole.Use(TextWriter.Null, TextWriter.Null);

        var result = await new ShowBackButtonMigrator(_app.Root).Migrate();

        Assert.Equal(0, result.FilesChanged);
        Assert.Equal(layout, _app.Read("ui/Task_1/layouts/Side1.json"));
    }
}
