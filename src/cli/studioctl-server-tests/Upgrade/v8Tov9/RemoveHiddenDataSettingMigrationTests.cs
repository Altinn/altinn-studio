using System.Text;
using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class RemoveHiddenDataSettingMigrationTests : IDisposable
{
    private const string LayoutPath = "ui/form/layouts/Page1.json";

    private const string AppSettings = """
        {
          "AppSettings": {
            "AppOidcProvider": "altinn"
          },
          "Logging": { "LogLevel": { "Default": "Information" } }
        }

        """;

    private const string HiddenBoundComponent = """
        { "id": "name", "type": "Input", "dataModelBindings": { "simpleBinding": "Model.Name" }, "hidden": true }
        """;

    private readonly TempAppFolder _app = new();

    public RemoveHiddenDataSettingMigrationTests() => _app.Write("appsettings.json", AppSettings);

    public void Dispose() => _app.Dispose();

    private Task<MigrationResult> Migrate() =>
        RemoveHiddenDataSettingMigration.Migrate(_app.Root, Path.Combine(_app.Root, "App"));

    private void WriteLayout(string components, string pageProperties = "", string path = LayoutPath) =>
        _app.Write(path, $$"""{ "data": { {{pageProperties}} "layout": [ {{components}} ] } }""");

    /// <summary>The single message, asserted to be information that asks nothing of the reader.</summary>
    private static string Notice(MigrationResult result)
    {
        var message = Assert.Single(result.Messages);
        Assert.Equal(UpgradeMessageStatus.Info, message.Status);
        return message.Text;
    }

    private async Task AssertSilentAndUnchanged(string appSettings = AppSettings)
    {
        Assert.Empty((await Migrate()).Messages);
        Assert.Equal(appSettings, _app.Read("appsettings.json"));
    }

    [Fact]
    public async Task HiddenExpressionOnBoundComponent_SetsTheSettingInTheExistingSection()
    {
        WriteLayout(
            """
            { "id": "name", "type": "Input", "dataModelBindings": { "simpleBinding": "Model.Name" },
              "hidden": ["equals", ["dataModel", "Model.Show"], false] },
            { "id": "visible", "type": "Input", "dataModelBindings": { "simpleBinding": "Model.Other" } }
            """
        );

        var notice = Notice(await Migrate());

        Assert.Contains(
            $"such as {Path.Combine("App", "ui", "form", "layouts", "Page1.json")}: name (1 in total)",
            notice
        );
        Assert.DoesNotContain("visible", notice, StringComparison.Ordinal);
        Assert.Contains("set AppSettings:RemoveHiddenData to false", notice, StringComparison.Ordinal);
        Assert.Contains("\"removeWhenHidden\": false", notice, StringComparison.Ordinal);
        Assert.Equal(
            """
            {
              "AppSettings": {
                "RemoveHiddenData": false,
                "AppOidcProvider": "altinn"
              },
              "Logging": { "LogLevel": { "Default": "Information" } }
            }

            """,
            _app.Read("appsettings.json")
        );
    }

    [Fact]
    public async Task MissingSection_IsCreated()
    {
        _app.Write("appsettings.json", "{\n    \"Logging\": { \"LogLevel\": { \"Default\": \"Information\" } }\n}\n");
        WriteLayout(HiddenBoundComponent);

        Notice(await Migrate());

        Assert.Equal(
            "{\n    \"AppSettings\": {\n        \"RemoveHiddenData\": false\n    },\n"
                + "    \"Logging\": { \"LogLevel\": { \"Default\": \"Information\" } }\n}\n",
            _app.Read("appsettings.json")
        );
    }

    [Fact]
    public async Task EmptySection_GetsTheSettingWithoutAComma()
    {
        _app.Write("appsettings.json", "{\n  \"AppSettings\": {\n  }\n}\n");
        WriteLayout(HiddenBoundComponent);

        Notice(await Migrate());

        Assert.Equal(
            "{\n  \"AppSettings\": {\n    \"RemoveHiddenData\": false\n  }\n}\n",
            _app.Read("appsettings.json")
        );
    }

    [Fact]
    public async Task BomLineEndingsCommentsAndTrailingCommas_ArePreserved()
    {
        var original =
            "{\r\n\t// Local overrides\r\n\t\"appSettings\": { // case-insensitive\r\n"
            + "\t\t\"AppOidcProvider\": \"altinn\",\r\n\t},\r\n}\r\n";
        _app.WriteBytes("appsettings.json", [.. Encoding.UTF8.GetPreamble(), .. Encoding.UTF8.GetBytes(original)]);
        WriteLayout(HiddenBoundComponent);

        Notice(await Migrate());

        var expected =
            "{\r\n\t// Local overrides\r\n\t\"appSettings\": { // case-insensitive\r\n\t\t\"RemoveHiddenData\": false,\r\n"
            + "\t\t\"AppOidcProvider\": \"altinn\",\r\n\t},\r\n}\r\n";
        Assert.Equal(
            [.. Encoding.UTF8.GetPreamble(), .. Encoding.UTF8.GetBytes(expected)],
            _app.ReadBytes("appsettings.json")
        );
    }

    [Fact]
    public async Task SecondRun_IsSilentAndUnchanged()
    {
        WriteLayout(HiddenBoundComponent);
        Notice(await Migrate());

        await AssertSilentAndUnchanged(_app.Read("appsettings.json"));
    }

    [Theory]
    [InlineData("appsettings.json", "true")]
    [InlineData("appsettings.json", "false")]
    [InlineData("appsettings.Production.json", "true")]
    public async Task SettingAlreadySet_IsSilentAndUntouched(string file, string value)
    {
        WriteLayout(HiddenBoundComponent);
        var appSettings = $$"""{ "appSettings": { "removeHiddenData": {{value}} } }""";
        _app.Write(file, appSettings);

        Assert.Empty((await Migrate()).Messages);
        Assert.Equal(appSettings, _app.Read(file));
        if (file != "appsettings.json")
            Assert.Equal(AppSettings, _app.Read("appsettings.json"));
    }

    [Theory]
    [InlineData("""{ "AppSettings": { "AppOidcProvider": "altinn" } }""")]
    [InlineData("""{ "AppSettings": "not an object" }""")]
    [InlineData("not json")]
    public async Task FileThatCannotBeEditedSafely_GetsATodoAndIsUnchanged(string appSettings)
    {
        _app.Write("appsettings.json", appSettings);
        WriteLayout(HiddenBoundComponent);

        var todo = Assert.Single((await Migrate()).Todos);

        Assert.Contains("\"AppSettings\": { \"RemoveHiddenData\": false }", todo, StringComparison.Ordinal);
        Assert.Contains("Page1.json: name (1 in total)", todo, StringComparison.Ordinal);
        Assert.Equal(appSettings, _app.Read("appsettings.json"));
    }

    [Fact]
    public async Task MissingAppSettingsFile_GetsATodo()
    {
        var file = Path.Combine(_app.Root, "App", "appsettings.json");
        File.Delete(file);
        WriteLayout(HiddenBoundComponent);

        Assert.Single((await Migrate()).Todos);
        Assert.False(File.Exists(file));
    }

    [Fact]
    public async Task HiddenPageWithBoundComponent_SetsTheSetting()
    {
        WriteLayout(
            """{ "id": "name", "type": "Input", "dataModelBindings": { "simpleBinding": "Model.Name" } }""",
            pageProperties: """ "hidden": ["equals", ["dataModel", "Model.Show"], false], """
        );

        Assert.Contains("Page1.json (hidden page)", Notice(await Migrate()), StringComparison.Ordinal);
        Assert.Contains("\"RemoveHiddenData\": false", _app.Read("appsettings.json"), StringComparison.Ordinal);
    }

    [Fact]
    public async Task HiddenPageWithoutBoundComponents_IsSilent()
    {
        WriteLayout("""{ "id": "info", "type": "Paragraph" }""", pageProperties: """ "hidden": true, """);

        await AssertSilentAndUnchanged();
    }

    [Fact]
    public async Task HiddenRow_SetsTheSetting()
    {
        WriteLayout(
            """
            { "id": "people", "type": "RepeatingGroup", "children": ["person"],
              "dataModelBindings": { "group": "Model.People" },
              "hiddenRow": ["equals", ["dataModel", "Model.People.Active"], false] },
            { "id": "person", "type": "Input", "dataModelBindings": { "simpleBinding": "Model.People.Name" } }
            """
        );

        Assert.Contains("Page1.json: people (hidden rows)", Notice(await Migrate()), StringComparison.Ordinal);
        Assert.Contains("\"RemoveHiddenData\": false", _app.Read("appsettings.json"), StringComparison.Ordinal);
    }

    [Fact]
    public async Task HiddenContainerWithBoundChild_SetsTheSetting()
    {
        WriteLayout(
            """
            { "id": "section", "type": "Group", "children": ["name"], "hidden": true },
            { "id": "name", "type": "Input", "dataModelBindings": { "simpleBinding": "Model.Name" } }
            """
        );

        Assert.Contains("Page1.json: section", Notice(await Migrate()), StringComparison.Ordinal);
    }

    [Fact]
    public async Task RemoveWhenHiddenFalseOnTheOnlyHiddenComponent_IsSilent()
    {
        WriteLayout(
            """
            { "id": "name", "type": "Input", "dataModelBindings": { "simpleBinding": "Model.Name" },
              "hidden": true, "removeWhenHidden": false }
            """
        );

        await AssertSilentAndUnchanged();
    }

    [Fact]
    public async Task HiddenContainerWhoseBoundChildKeepsItsData_IsSilent()
    {
        WriteLayout(
            """
            { "id": "section", "type": "Group", "children": ["name"], "hidden": true },
            { "id": "name", "type": "Input", "dataModelBindings": { "simpleBinding": "Model.Name" },
              "removeWhenHidden": false }
            """
        );

        await AssertSilentAndUnchanged();
    }

    [Fact]
    public async Task NoHideableData_IsSilentAndUnchanged()
    {
        WriteLayout(
            """
            { "id": "name", "type": "Input", "dataModelBindings": { "simpleBinding": "Model.Name" }, "hidden": false },
            { "id": "info", "type": "Paragraph", "hidden": true },
            { "id": "people", "type": "RepeatingGroup", "dataModelBindings": { "group": "Model.People" },
              "hiddenRow": false }
            """
        );

        await AssertSilentAndUnchanged();
    }

    [Fact]
    public async Task ManyAffectedComponents_ListsFiveAndTheTotal()
    {
        var components = Enumerable
            .Range(1, 7)
            .Select(i =>
                $$"""{ "id": "field{{i}}", "type": "Input", "dataModelBindings": { "simpleBinding": "Model.F{{i}}" }, "hidden": true }"""
            );
        WriteLayout(string.Join(",", components));

        var notice = Notice(await Migrate());

        Assert.Contains("Page1.json: field5 (7 in total)", notice, StringComparison.Ordinal);
        Assert.DoesNotContain("field6", notice, StringComparison.Ordinal);
    }

    [Fact]
    public async Task ReadsV9UiFolders()
    {
        WriteLayout(HiddenBoundComponent, path: "ui/Task_1/layouts/Page1.json");

        Assert.Contains(
            $"{Path.Combine("App", "ui", "Task_1", "layouts", "Page1.json")}: name",
            Notice(await Migrate()),
            StringComparison.Ordinal
        );
    }
}
