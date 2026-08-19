using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class CamelCaseLayoutPropertyMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    [Fact]
    public async Task RewritesOnlyPropertiesOwnedByTheAffectedComponents()
    {
        _app.Write(
            "ui/Task_1/layouts/Page1.json",
            """
            {
              "data": {
                "layout": [
                  { "id": "organization", "type": "OrganizationLookup", "dataModelBindings": { "organization_lookup_orgnr": "org", "organization_lookup_name": "name" } },
                  { "id": "person", "type": "PersonLookup", "dataModelBindings": { "person_lookup_ssn": "ssn", "person_lookup_name": "name", "person_lookup_first_name": "first", "person_lookup_middle_name": "middle", "person_lookup_last_name": "last" } },
                  { "id": "group", "type": "RepeatingGroup", "textResourceBindings": { "add_button_full": "addFull", "add_button": "add", "save_button": "save", "save_and_next_button": "next", "edit_button_close": "close", "edit_button_open": "open", "pagination_next_button": "pageNext", "pagination_back_button": "pageBack", "multipage_next_button": "multiNext", "multipage_back_button": "multiBack" } }
                ]
              }
            }
            """
        );

        using var outputScope = UpgradeConsole.Use(TextWriter.Null, TextWriter.Null);
        Assert.Equal(0, await CamelCaseLayoutPropertyMigration.Migrate(_app.Root));

        var layout = _app.Read("ui/Task_1/layouts/Page1.json");
        foreach (
            var property in new[]
            {
                "orgnr",
                "name",
                "ssn",
                "fullName",
                "firstName",
                "middleName",
                "lastName",
                "addButtonFull",
                "addButton",
                "saveButton",
                "saveAndNextButton",
                "editButtonClose",
                "editButtonOpen",
                "paginationNextButton",
                "paginationBackButton",
                "multipageNextButton",
                "multipageBackButton",
            }
        )
            Assert.Contains($"\"{property}\"", layout, StringComparison.Ordinal);
    }

    [Fact]
    public async Task LeavesMatchingPropertyNamesOutsideTheirOwningComponentUntouched()
    {
        _app.Write(
            "ui/Task_1/layouts/Page1.json",
            """{ "data": { "layout": [{ "id": "text", "type": "Text", "add_button": "must-not-change" }] } }"""
        );

        using var outputScope = UpgradeConsole.Use(TextWriter.Null, TextWriter.Null);
        Assert.Equal(0, await CamelCaseLayoutPropertyMigration.Migrate(_app.Root));
        Assert.Contains("\"add_button\": \"must-not-change\"", _app.Read("ui/Task_1/layouts/Page1.json"));
    }
}
