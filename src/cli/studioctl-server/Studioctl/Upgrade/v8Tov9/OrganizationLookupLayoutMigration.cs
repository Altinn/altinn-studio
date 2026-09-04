using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

internal static class OrganizationLookupLayoutMigration
{
    private const string OldComponentType = "OrganisationLookup";
    private const string NewComponentType = "OrganizationLookup";
    private const string OldOrganizationNumberBinding = "organisation_lookup_orgnr";
    private const string OldOrganizationNameBinding = "organisation_lookup_name";

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
        {
            UpgradeConsole.Skip("No OrganisationLookup contract tokens found");
        }

        return 0;
    }

    internal static LayoutMutationResult Apply(LayoutMigrationWorkspace workspace) =>
        workspace.Apply(RenameLegacyContract);

    private static int RenameLegacyContract(JsonNode node)
    {
        var changes = 0;
        if (node is JsonObject obj)
        {
            if (HasLookupComponentType(obj, out var isLegacyComponent))
            {
                if (isLegacyComponent)
                {
                    obj["type"] = NewComponentType;
                    changes++;
                }
                if (obj["dataModelBindings"] is JsonObject bindings)
                {
                    changes += RenameProperty(bindings, OldOrganizationNumberBinding, "organization_lookup_orgnr");
                    changes += RenameProperty(bindings, OldOrganizationNameBinding, "organization_lookup_name");
                }
            }

            foreach (var child in obj.Select(property => property.Value).ToList())
            {
                if (child is not null)
                    changes += RenameLegacyContract(child);
            }
        }
        else if (node is JsonArray array)
        {
            foreach (var child in array.ToList())
            {
                if (child is not null)
                    changes += RenameLegacyContract(child);
            }
        }

        return changes;
    }

    private static bool HasLookupComponentType(JsonObject obj, out bool isLegacyComponent)
    {
        isLegacyComponent = false;
        if (obj["type"] is not JsonValue type || !type.TryGetValue<string>(out var componentType))
            return false;

        isLegacyComponent = componentType == OldComponentType;
        return isLegacyComponent || componentType == NewComponentType;
    }

    private static int RenameProperty(JsonObject obj, string oldName, string newName)
    {
        if (!obj.TryGetPropertyValue(oldName, out var value))
            return 0;
        if (obj.ContainsKey(newName))
            throw new InvalidOperationException(
                $"Cannot rename layout property '{oldName}' to '{newName}' because both properties exist."
            );

        obj.Remove(oldName);
        obj[newName] = value?.DeepClone();
        return 1;
    }
}
