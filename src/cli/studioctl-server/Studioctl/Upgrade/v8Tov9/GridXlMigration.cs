using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

internal sealed record GridXlMigrationResult(int FilesChanged, int PropertiesRemoved);

/// <summary>
/// Removes the unsupported <c>xl</c> component-grid setting from layout files.
/// </summary>
internal static class GridXlMigration
{
    private static readonly string[] _nestedGridProperties = ["innerGrid", "labelGrid", "validationGrid"];

    public static async Task<GridXlMigrationResult> Migrate(string projectFolder)
    {
        var workspace = await LayoutMigrationWorkspace.Load(projectFolder);
        if (workspace is null)
            return new GridXlMigrationResult(0, 0);

        var result = Apply(workspace);
        await workspace.Save();
        return new GridXlMigrationResult(result.FilesChanged, result.Changes);
    }

    internal static LayoutMutationResult Apply(LayoutMigrationWorkspace workspace) =>
        workspace.Apply(RemoveGridXlProperties);

    private static int RemoveGridXlProperties(JsonNode node)
    {
        var propertiesRemoved = 0;
        if (node is JsonObject obj)
        {
            if (obj["grid"] is JsonObject grid)
                propertiesRemoved += RemoveFromGrid(grid);

            foreach (var child in obj.Select(property => property.Value).ToList())
            {
                if (child is not null)
                    propertiesRemoved += RemoveGridXlProperties(child);
            }
        }
        else if (node is JsonArray array)
        {
            foreach (var child in array.ToList())
            {
                if (child is not null)
                    propertiesRemoved += RemoveGridXlProperties(child);
            }
        }

        return propertiesRemoved;
    }

    private static int RemoveFromGrid(JsonObject grid)
    {
        var propertiesRemoved = 0;
        if (RemoveXl(grid))
            propertiesRemoved++;

        foreach (var propertyName in _nestedGridProperties)
        {
            if (grid[propertyName] is JsonObject nestedGrid && RemoveXl(nestedGrid))
                propertiesRemoved++;
        }

        return propertiesRemoved;
    }

    private static bool RemoveXl(JsonObject grid) => grid.Remove("xl");
}
