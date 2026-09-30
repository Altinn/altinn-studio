using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.NavigationButtonsMigration;

internal sealed record ShowBackButtonMigrationResult(int FilesChanged, int PropertiesRemoved);

internal sealed class ShowBackButtonMigrator
{
    private readonly string _projectFolder;

    public ShowBackButtonMigrator(string projectFolder)
    {
        _projectFolder = projectFolder;
    }

    public async Task<ShowBackButtonMigrationResult> Migrate()
    {
        var workspace = await LayoutMigrationWorkspace.Load(_projectFolder);
        if (workspace is null)
            return new ShowBackButtonMigrationResult(0, 0);

        var result = Apply(workspace);
        await workspace.Save();
        return new ShowBackButtonMigrationResult(result.FilesChanged, result.Changes);
    }

    internal static LayoutMutationResult Apply(LayoutMigrationWorkspace workspace) =>
        workspace.Apply(RemoveRedundantProperties);

    private static int RemoveRedundantProperties(JsonNode node)
    {
        var removed = 0;
        if (
            node is JsonObject obj
            && obj["type"] is JsonValue typeValue
            && typeValue.TryGetValue<string>(out var type)
            && type == "NavigationButtons"
            && obj["showBackButton"] is JsonValue value
            && value.TryGetValue<bool>(out var showBackButton)
            && showBackButton
        )
        {
            obj.Remove("showBackButton");
            removed++;
        }

        foreach (var child in GetChildren(node))
            removed += RemoveRedundantProperties(child);

        return removed;
    }

    private static IEnumerable<JsonNode> GetChildren(JsonNode node) =>
        node switch
        {
            JsonObject obj => obj.Select(property => property.Value).OfType<JsonNode>(),
            JsonArray array => array.OfType<JsonNode>(),
            _ => [],
        };
}
