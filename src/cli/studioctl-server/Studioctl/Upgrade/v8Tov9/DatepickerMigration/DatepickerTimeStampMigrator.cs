using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.DatepickerMigration;

/// <summary>
/// Adds explicit <c>timeStamp: true</c> on Datepicker components that omit the property.
/// In v9 the runtime default is <c>false</c> (date only); upgrading apps must keep the old
/// timestamp-with-time behavior unless they already set the flag.
/// </summary>
internal sealed record DatepickerTimeStampMigrationResult(int FilesChanged, int PropertiesAdded);

internal sealed class DatepickerTimeStampMigrator
{
    private readonly string _projectFolder;

    public DatepickerTimeStampMigrator(string projectFolder)
    {
        _projectFolder = projectFolder;
    }

    public async Task<DatepickerTimeStampMigrationResult> Migrate()
    {
        var workspace = await LayoutMigrationWorkspace.Load(_projectFolder);
        if (workspace is null)
            return new DatepickerTimeStampMigrationResult(0, 0);

        var result = Apply(workspace);
        await workspace.Save();
        return new DatepickerTimeStampMigrationResult(result.FilesChanged, result.Changes);
    }

    internal static LayoutMutationResult Apply(LayoutMigrationWorkspace workspace) =>
        workspace.Apply(AddMissingTimeStampTrue);

    private static int AddMissingTimeStampTrue(JsonNode node)
    {
        var added = 0;
        if (
            node is JsonObject obj
            && obj["type"] is JsonValue typeValue
            && typeValue.TryGetValue<string>(out var type)
            && type == "Datepicker"
            && !obj.ContainsKey("timeStamp")
        )
        {
            obj["timeStamp"] = true;
            added++;
        }

        foreach (var child in GetChildren(node))
            added += AddMissingTimeStampTrue(child);

        return added;
    }

    private static IEnumerable<JsonNode> GetChildren(JsonNode node) =>
        node switch
        {
            JsonObject obj => obj.Select(property => property.Value).OfType<JsonNode>(),
            JsonArray array => array.OfType<JsonNode>(),
            _ => [],
        };
}
