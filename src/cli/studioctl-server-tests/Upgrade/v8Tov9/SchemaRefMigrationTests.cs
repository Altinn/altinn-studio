using System.Text;
using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class SchemaRefMigrationTests : IDisposable
{
    private const string Version = "9.0.0";
    private const string AppDist = $"https://altinn.studio/designer/app-dist/{Version}/schemas/json";
    private const string Toolkit = "https://altinncdn.no/toolkits/altinn-app-frontend/4";

    /// <summary>The UTF-8 byte order mark some editors put first in a file, as the character it decodes to.</summary>
    private const string Bom = "\uFEFF";

    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    [Fact]
    public async Task UpdatesEveryFormOfAltinnCdnReference()
    {
        var files = new Dictionary<string, (string Before, string After)>
        {
            ["ui/layouts/page.json"] = (
                $"{Toolkit}/schemas/json/layout/layout.schema.v1.json",
                $"{AppDist}/layout/layout.schema.v1.json"
            ),
            ["config/texts/resource.nb.json"] = (
                "https://altinncdn.no/toolkits/altinn-app-frontend/4.25.1/schemas/json/text-resources/text-resources.schema.v1.json",
                $"{AppDist}/text-resources/text-resources.schema.v1.json"
            ),
            ["ui/Task_1/Settings.json"] = (
                "https://altinncdn.no/schemas/json/layout/layoutSettings.schema.v1.json",
                $"{AppDist}/layout/layoutSettings.schema.v1.json"
            ),
        };
        foreach (var (path, (before, _)) in files)
            _app.Write(path, Schema(before));

        var result = await SchemaRefMigration.Migrate(_app.Root, Version);

        foreach (var (path, (_, after)) in files)
            Assert.Equal(Schema(after), _app.Read(path));
        Assert.Equal(3, result.ReferencesUpdated);
        Assert.Empty(result.Warnings);
    }

    [Fact]
    public async Task ChangesOnlyTheRootSchemaValue()
    {
        _app.Write(
            "ui/form/layouts/page.json",
            $$"""
            {
              // A comment the app accepts
              "data": {
                "$schema": "{{Toolkit}}/schemas/json/layout/layout.schema.v1.json",
                "layout": [],
              },
              "$schema" :  "{{Toolkit}}/schemas/json/layout/layout.schema.v1.json"
            }
            """
        );

        await SchemaRefMigration.Migrate(_app.Root, Version);

        Assert.Equal(
            $$"""
            {
              // A comment the app accepts
              "data": {
                "$schema": "{{Toolkit}}/schemas/json/layout/layout.schema.v1.json",
                "layout": [],
              },
              "$schema" :  "{{AppDist}}/layout/layout.schema.v1.json"
            }
            """,
            _app.Read("ui/form/layouts/page.json")
        );
    }

    [Fact]
    public async Task PreservesByteOrderMark()
    {
        _app.Write("ui/footer.json", Bom + Schema($"{Toolkit}/schemas/json/layout/footer.schema.v1.json"));

        await SchemaRefMigration.Migrate(_app.Root, Version);

        Assert.Equal(
            Bom + Schema($"{AppDist}/layout/footer.schema.v1.json"),
            Encoding.UTF8.GetString(_app.ReadBytes("ui/footer.json"))
        );
    }

    [Fact]
    public async Task WarnsAboutReferencesItCannotUpdate()
    {
        var unpublished = Schema($"{Toolkit}/schemas/json/layout/layout-sets.schema.v1.json");
        var unreadable = """{ "$schema" "https://altinncdn.no/schemas/json/layout/footer.schema.v1.json" }""";
        _app.Write("ui/layout-sets.json", unpublished);
        _app.Write("ui/footer.json", unreadable);
        _app.Write("ui/form/Settings.json", Schema($"{Toolkit}/schemas/json/layout/layoutSettings.schema.v1.json"));

        var result = await SchemaRefMigration.Migrate(_app.Root, Version);

        Assert.Equal(unpublished, _app.Read("ui/layout-sets.json"));
        Assert.Equal(unreadable, _app.Read("ui/footer.json"));
        Assert.Equal(Schema($"{AppDist}/layout/layoutSettings.schema.v1.json"), _app.Read("ui/form/Settings.json"));
        Assert.Equal(1, result.ReferencesUpdated);
        Assert.Collection(
            result.Warnings,
            warning => Assert.Contains("Could not read ui/footer.json", warning),
            warning => Assert.Contains("layout-sets.schema.v1.json unchanged in ui/layout-sets.json", warning)
        );
    }

    [Fact]
    public async Task LeavesOtherFilesAloneWithoutMessages()
    {
        var legacy = Schema($"{Toolkit}/schemas/json/layout/layout.schema.v1.json");
        var files = new Dictionary<string, string>
        {
            ["models/model.schema.json"] = Schema("https://json-schema.org/draft/2020-12/schema"),
            ["models/model.prefill.json"] = Schema("https://altinncdn.no/schemas/json/prefill/prefill.schema.v1.json"),
            ["wwwroot/testData.json"] = Schema(
                "https://altinncdn.no/schemas/json/test-users/test-users.schema.v1.json"
            ),
            ["ui/form/layouts/page.json"] = Schema($"{AppDist}/layout/layout.schema.v1.json"),
            ["bin/Debug/net10.0/ui/form/layouts/page.json"] = legacy,
            ["wwwroot/broken.json"] = """{ "unfinished": """,
        };
        foreach (var (path, content) in files)
            _app.Write(path, content);

        var result = await SchemaRefMigration.Migrate(_app.Root, Version);

        foreach (var (path, content) in files)
            Assert.Equal(content, _app.Read(path));
        Assert.Equal(0, result.ReferencesUpdated);
        Assert.Empty(result.Warnings);
    }

    private static string Schema(string url) => $$"""{ "$schema": "{{url}}", "pages": {} }""";
}
