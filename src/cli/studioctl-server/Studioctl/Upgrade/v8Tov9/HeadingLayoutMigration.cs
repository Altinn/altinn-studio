using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Rewrites layout component type <c>Header</c> to <c>Heading</c> (and matching summary
/// <c>componentType</c> refs) under <c>App/ui/**/layouts</c>.
/// </summary>
internal static class HeadingLayoutMigration
{
    private const string OldComponentType = "Header";
    private const string NewComponentType = "Heading";

    public static async Task<int> Migrate(string projectFolder)
    {
        var workspace = await LayoutMigrationWorkspace.Load(projectFolder);
        if (workspace is null)
        {
            UpgradeConsole.Skip("No UI directory found, skipping Heading migration");
            return 0;
        }

        var result = Apply(workspace);
        await workspace.Save();

        if (result.FilesChanged == 0)
        {
            UpgradeConsole.Skip("No Header layout contract tokens found to migrate");
        }
        else
        {
            UpgradeConsole.Ok(
                $"Migrated {result.Changes} Header contract value(s) across {result.FilesChanged} layout file(s)"
            );
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
            if (
                obj["type"] is JsonValue type
                && type.TryGetValue<string>(out var componentType)
                && componentType == OldComponentType
            )
            {
                obj["type"] = NewComponentType;
                changes++;
            }

            if (
                obj["componentType"] is JsonValue summaryType
                && summaryType.TryGetValue<string>(out var summaryComponentType)
                && summaryComponentType == OldComponentType
            )
            {
                obj["componentType"] = NewComponentType;
                changes++;
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
}
