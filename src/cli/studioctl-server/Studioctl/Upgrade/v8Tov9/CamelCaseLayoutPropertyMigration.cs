using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Migrates layout-property contracts that changed from snake_case to camelCase in frontend v9.
/// Only properties on their owning components are renamed.
/// </summary>
internal static class CamelCaseLayoutPropertyMigration
{
    private static readonly IReadOnlyDictionary<string, string> _organizationLookupBindings = new Dictionary<
        string,
        string
    >
    {
        ["organization_lookup_orgnr"] = "orgnr",
        ["organization_lookup_name"] = "name",
    };

    private static readonly IReadOnlyDictionary<string, string> _personLookupBindings = new Dictionary<string, string>
    {
        ["person_lookup_ssn"] = "ssn",
        ["person_lookup_name"] = "fullName",
        ["person_lookup_first_name"] = "firstName",
        ["person_lookup_middle_name"] = "middleName",
        ["person_lookup_last_name"] = "lastName",
    };

    private static readonly IReadOnlyDictionary<string, string> _repeatingGroupTextResourceBindings = new Dictionary<
        string,
        string
    >
    {
        ["add_button_full"] = "addButtonFull",
        ["add_button"] = "addButton",
        ["save_button"] = "saveButton",
        ["save_and_next_button"] = "saveAndNextButton",
        ["edit_button_close"] = "editButtonClose",
        ["edit_button_open"] = "editButtonOpen",
        ["pagination_next_button"] = "paginationNextButton",
        ["pagination_back_button"] = "paginationBackButton",
        ["multipage_back_button"] = "multipageBackButton",
        ["multipage_next_button"] = "multipageNextButton",
    };

    public static async Task<int> Migrate(string projectFolder)
    {
        var workspace = await LayoutMigrationWorkspace.Load(projectFolder);
        if (workspace is null)
        {
            UpgradeConsole.Skip("No UI directory found");
            return 0;
        }

        var result = Apply(workspace);
        await workspace.Save();

        if (result.FilesChanged == 0)
            UpgradeConsole.Skip("No snake_case layout property contracts found");
        else
            UpgradeConsole.Ok(
                $"Migrated {result.Changes} camelCase layout property name(s) across {result.FilesChanged} layout file(s)"
            );
        return 0;
    }

    internal static LayoutMutationResult Apply(LayoutMigrationWorkspace workspace) =>
        workspace.Apply(RenameLegacyProperties);

    private static int RenameLegacyProperties(JsonNode node)
    {
        var changes = 0;
        if (node is JsonObject obj)
        {
            if (obj["type"]?.GetValue<string>() is { } type)
            {
                var (container, properties) = type switch
                {
                    "OrganizationLookup" => (obj["dataModelBindings"], _organizationLookupBindings),
                    "PersonLookup" => (obj["dataModelBindings"], _personLookupBindings),
                    "RepeatingGroup" => (obj["textResourceBindings"], _repeatingGroupTextResourceBindings),
                    _ => (null, null),
                };
                if (container is JsonObject propertyObject && properties is not null)
                {
                    foreach (var (oldName, newName) in properties)
                        changes += RenameProperty(propertyObject, oldName, newName, type);
                }
            }

            foreach (var child in obj.Select(static property => property.Value).OfType<JsonNode>().ToList())
                changes += RenameLegacyProperties(child);
        }
        else if (node is JsonArray array)
        {
            foreach (var child in array.OfType<JsonNode>().ToList())
                changes += RenameLegacyProperties(child);
        }

        return changes;
    }

    private static int RenameProperty(JsonObject obj, string oldName, string newName, string componentType)
    {
        if (!obj.TryGetPropertyValue(oldName, out var value))
            return 0;
        if (obj.ContainsKey(newName))
            throw new InvalidOperationException(
                $"Cannot rename {oldName} to {newName}: both properties exist on {componentType}"
            );

        obj.Remove(oldName);
        obj[newName] = value?.DeepClone();
        return 1;
    }
}
