using System.Text;
using System.Text.Json.Nodes;
using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class InvalidValidationMaskMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private async Task Migrate(string? folder = null)
    {
        using var output = UpgradeConsole.Use(TextWriter.Null, TextWriter.Null);
        Assert.Equal(0, await InvalidValidationMaskMigration.Migrate(folder ?? _app.Root));
    }

    [Theory]
    [InlineData("showValidations")]
    [InlineData("validateOnSaveRow")]
    [InlineData("validation")]
    [InlineData("validationOnNavigation")]
    [InlineData("validateOnNext")]
    [InlineData("validateOnPrevious")]
    [InlineData("validateOnForward")]
    [InlineData("validateOnBackward")]
    public async Task AddsInvalidToEachExplicitSchemaValidationList(string property)
    {
        var masks = new JsonArray("Schema", "Required");
        var value = property is "showValidations" or "validateOnSaveRow"
            ? (JsonNode)masks
            : new JsonObject { ["show"] = masks };
        var component = new JsonObject { [property] = value };
        var content = new JsonObject
        {
            ["data"] = new JsonObject { ["layout"] = new JsonArray(component) },
        }.ToJsonString();
        _app.Write("ui/book/layouts/page.json", content);

        await Migrate();

        var migrated = _app.Read("ui/book/layouts/page.json");
        Assert.Equal(content.Replace("\"Schema\"", "\"Schema\", \"Invalid\""), migrated);
        await Migrate();
        Assert.Equal(migrated, _app.Read("ui/book/layouts/page.json"));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task MigratesNavigationSettingsForBothAppFolderShapes(bool appSubfolder)
    {
        const string content = """{"pages":{"validationOnNavigation":{"show":["Schema"]}}}""";
        _app.Write("ui/Task_1/Settings.json", content);
        var folder = appSubfolder ? _app.Root : Path.Combine(_app.Root, "App");

        await Migrate(folder);

        Assert.Equal(content.Replace("\"Schema\"", "\"Schema\", \"Invalid\""), _app.Read("ui/Task_1/Settings.json"));
    }

    [Fact]
    public async Task LeavesOtherListsAndAlreadyMigratedValidationListsUntouched()
    {
        const string content = """
            {"data":{"layout":[
              {"showValidations":["Schema","Invalid"]},
              {"showValidations":["All"]},
              {"validateOnSaveRow":[]},
              {"showValidations":["Component"]},
              {"options":["Schema"],"show":["Schema"],"title":"Schema"}
            ]}}
            """;
        _app.Write("ui/Task_1/layouts/page.json", content);
        _app.Write("ui/options.json", """{"showValidations":["Schema"]}""");

        await Migrate();

        Assert.Equal(content, _app.Read("ui/Task_1/layouts/page.json"));
        Assert.Equal("""{"showValidations":["Schema"]}""", _app.Read("ui/options.json"));
    }

    [Fact]
    public async Task PreservesBomCommentsUnicodeAndLineEndings()
    {
        const string content =
            "{\r\n\t// Validation\r\n\t\"title\": \"Bøker\",\r\n\t\"showValidations\": [\"Schema\",],\r\n}\r\n";
        _app.WriteBytes(
            "ui/book/layouts/page.json",
            [.. Encoding.UTF8.GetPreamble(), .. Encoding.UTF8.GetBytes(content)]
        );

        await Migrate();

        var expected = content.Replace("\"Schema\"", "\"Schema\", \"Invalid\"");
        Assert.Equal(
            [.. Encoding.UTF8.GetPreamble(), .. Encoding.UTF8.GetBytes(expected)],
            _app.ReadBytes("ui/book/layouts/page.json")
        );
    }

    [Fact]
    public async Task SkipsAppsWithoutUi() => await Migrate();

    [Fact]
    public async Task UpgradeRunsInvalidValidationMaskMigration()
    {
        _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <ItemGroup>
                <PackageReference Include="Altinn.App.Api" Version="8.6.5" />
                <PackageReference Include="Altinn.App.Core" Version="8.6.5" />
              </ItemGroup>
            </Project>
            """
        );
        _app.Write("ui/Task_1/layouts/page.json", """{"data":{"layout":[{"showValidations":["Schema"]}]}}""");
        var report = new UpgradeReport();

        await V8Tov9Upgrade.RunAsync(
            new V8Tov9UpgradeOptions(
                ProjectFolder: _app.Root,
                ProjectFile: Path.Combine("App", "App.csproj"),
                TargetMajorVersion: 9,
                TargetFramework: "net10.0",
                SkipCsprojUpgrade: true,
                ConvertPackageReferences: false,
                StudioRoot: null,
                Report: report,
                Error: TextWriter.Null,
                CancellationToken: TestContext.Current.CancellationToken,
                SkipSemanticAnalysis: true
            )
        );

        Assert.Contains(report.Steps, step => step.Name == "Invalid input validation lists");
        Assert.Contains("\"Schema\", \"Invalid\"", _app.Read("ui/Task_1/layouts/page.json"), StringComparison.Ordinal);
    }
}
