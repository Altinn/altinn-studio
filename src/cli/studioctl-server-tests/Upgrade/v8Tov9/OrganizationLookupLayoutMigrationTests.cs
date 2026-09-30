using System.Text.Json;
using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// Pins the v8 OrganisationLookup layout contract this migration rewrites: the component type AND
/// both data-model binding names. The old spellings are wire data from real v8 layouts — a repo-wide
/// spelling pass once "corrected" the old binding constants into the new spelling, which turned the
/// binding rewrite into a silent identity (old == new, 0 == 0) while every other test stayed green.
/// </summary>
public sealed class OrganizationLookupLayoutMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private async Task Migrate()
    {
        using var outputScope = UpgradeConsole.Use(TextWriter.Null, TextWriter.Null);
        var exitCode = await OrganizationLookupLayoutMigration.Migrate(_app.Root);
        Assert.Equal(0, exitCode);
    }

    [Fact]
    public async Task RewritesComponentTypeAndBothBindingsFromV8Spelling()
    {
        _app.Write(
            "ui/Task_1/layouts/Side1.json",
            """
            {
              "data": {
                "layout": [
                  {
                    "id": "org",
                    "type": "OrganisationLookup",
                    "dataModelBindings": {
                      "organisation_lookup_orgnr": "Model.OrgNr",
                      "organisation_lookup_name": "Model.OrgName"
                    }
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
        Assert.Contains("\"type\": \"OrganizationLookup\"", after, StringComparison.Ordinal);
        Assert.Contains("\"organization_lookup_orgnr\": \"Model.OrgNr\"", after, StringComparison.Ordinal);
        Assert.Contains("\"organization_lookup_name\": \"Model.OrgName\"", after, StringComparison.Ordinal);
        Assert.DoesNotContain("Organisation", after, StringComparison.Ordinal);
        Assert.DoesNotContain("organisation_lookup", after, StringComparison.Ordinal);
        using var _ = JsonDocument.Parse(after);
    }

    [Fact]
    public async Task LeavesAlreadyMigratedLayoutUntouched()
    {
        var content = """
            {
              "data": {
                "layout": [
                  {
                    "id": "org",
                    "type": "OrganizationLookup",
                    "dataModelBindings": { "organization_lookup_orgnr": "Model.OrgNr" }
                  }
                ]
              }
            }
            """;
        _app.Write("ui/Task_1/layouts/Side1.json", content);

        await Migrate();

        Assert.Equal(content, _app.Read("ui/Task_1/layouts/Side1.json"));
    }
}
