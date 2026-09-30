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
        var legacyProperties = new[]
        {
            "organization_lookup_orgnr",
            "organization_lookup_name",
            "person_lookup_ssn",
            "person_lookup_name",
            "person_lookup_first_name",
            "person_lookup_middle_name",
            "person_lookup_last_name",
            "add_button_full",
            "add_button",
            "save_button",
            "save_and_next_button",
            "edit_button_close",
            "edit_button_open",
            "pagination_next_button",
            "pagination_back_button",
            "multipage_next_button",
            "multipage_back_button",
        };
        foreach (var property in legacyProperties)
            Assert.DoesNotContain($"\"{property}\"", layout, StringComparison.Ordinal);

        using var document = System.Text.Json.JsonDocument.Parse(layout);
        var components = document.RootElement.GetProperty("data").GetProperty("layout");
        AssertBindings(components[0].GetProperty("dataModelBindings"), ("orgnr", "org"), ("name", "name"));
        AssertBindings(
            components[1].GetProperty("dataModelBindings"),
            ("ssn", "ssn"),
            ("fullName", "name"),
            ("firstName", "first"),
            ("middleName", "middle"),
            ("lastName", "last")
        );
        AssertBindings(
            components[2].GetProperty("textResourceBindings"),
            ("addButtonFull", "addFull"),
            ("addButton", "add"),
            ("saveButton", "save"),
            ("saveAndNextButton", "next"),
            ("editButtonClose", "close"),
            ("editButtonOpen", "open"),
            ("paginationNextButton", "pageNext"),
            ("paginationBackButton", "pageBack"),
            ("multipageNextButton", "multiNext"),
            ("multipageBackButton", "multiBack")
        );
    }

    [Fact]
    public async Task LeavesMatchingPropertyNamesOutsideTheirOwningComponentUntouched()
    {
        var before = (
            "ui/Task_1/layouts/Page1.json",
            """{ "data": { "layout": [{ "id": "text", "type": "Text", "add_button": "must-not-change" }] } }"""
        );
        _app.Write(before.Item1, before.Item2);

        using var outputScope = UpgradeConsole.Use(TextWriter.Null, TextWriter.Null);
        Assert.Equal(0, await CamelCaseLayoutPropertyMigration.Migrate(_app.Root));
        Assert.Equal(before.Item2, _app.Read(before.Item1));
    }

    [Fact]
    public async Task RewritesEscapedPropertyNameWithoutCorruptingJson()
    {
        const string layoutPath = "ui/Task_1/layouts/Page1.json";
        _app.Write(
            layoutPath,
            """{ "data": { "layout": [{ "id": "group", "type": "RepeatingGroup", "textResourceBindings": { "\u0061dd_button": "add" } }] } }"""
        );

        using var outputScope = UpgradeConsole.Use(TextWriter.Null, TextWriter.Null);
        Assert.Equal(0, await CamelCaseLayoutPropertyMigration.Migrate(_app.Root));

        var layout = _app.Read(layoutPath);
        using var document = System.Text.Json.JsonDocument.Parse(layout);
        var bindings = document
            .RootElement.GetProperty("data")
            .GetProperty("layout")[0]
            .GetProperty("textResourceBindings");
        Assert.False(bindings.TryGetProperty("add_button", out _));
        AssertBindings(bindings, ("addButton", "add"));
    }

    private static void AssertBindings(
        System.Text.Json.JsonElement bindings,
        params (string Property, string Value)[] expected
    )
    {
        foreach (var (property, value) in expected)
            Assert.Equal(value, bindings.GetProperty(property).GetString());
    }
}
