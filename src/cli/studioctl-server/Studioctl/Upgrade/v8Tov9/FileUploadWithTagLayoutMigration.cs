using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>Rewrites the removed <c>FileUploadWithTag</c> layout component to <c>FileUpload</c>.</summary>
internal static class FileUploadWithTagLayoutMigration
{
    private const string OldComponentType = "FileUploadWithTag";
    private const string NewComponentType = "FileUpload";

    public static async Task<int> Migrate(string projectFolder)
    {
        var workspace = await LayoutMigrationWorkspace.Load(projectFolder);
        if (workspace is null)
        {
            UpgradeConsole.Skip("No UI directory found, skipping FileUploadWithTag migration");
            return 0;
        }

        var result = Apply(workspace);
        await workspace.Save();

        if (result.FilesChanged == 0)
            UpgradeConsole.Skip("No FileUploadWithTag layout component types found to migrate");
        else
            UpgradeConsole.Ok(
                $"Migrated {result.Changes} FileUploadWithTag components to FileUpload across {result.FilesChanged} layout file(s)"
            );

        return 0;
    }

    internal static LayoutMutationResult Apply(LayoutMigrationWorkspace workspace) =>
        workspace.Apply(RenameLegacyComponents);

    private static int RenameLegacyComponents(JsonNode node)
    {
        var count = 0;
        if (node is JsonObject obj)
        {
            if (
                obj["type"] is JsonValue type
                && type.TryGetValue<string>(out var componentType)
                && componentType == OldComponentType
            )
            {
                obj["type"] = NewComponentType;
                count++;
            }

            foreach (var child in obj.Select(property => property.Value).ToList())
                if (child is not null)
                    count += RenameLegacyComponents(child);
        }
        else if (node is JsonArray array)
        {
            foreach (var child in array.ToList())
                if (child is not null)
                    count += RenameLegacyComponents(child);
        }

        return count;
    }
}
