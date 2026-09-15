using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Rewrites legacy (moment.js style) Datepicker <c>format</c> values to the Unicode tokens v9
/// requires (e.g. <c>DD.MM.YYYY</c> → <c>dd.MM.yyyy</c>) under <c>App/ui/**/layouts</c>. The v8
/// frontend silently accepted the legacy tokens; v9 does not.
/// </summary>
internal static class DatepickerFormatMigration
{
    private const string ComponentType = "Datepicker";

    private static readonly IReadOnlyDictionary<string, string> _legacyFormats = new Dictionary<string, string>(
        StringComparer.Ordinal
    )
    {
        ["DD.MM.YYYY"] = "dd.MM.yyyy",
        ["DD/MM/YYYY"] = "dd/MM/yyyy",
        ["YYYY-MM-DD"] = "yyyy-MM-dd",
    };

    public static async Task<int> Migrate(string projectFolder)
    {
        var workspace = await LayoutMigrationWorkspace.Load(projectFolder);
        if (workspace is null)
        {
            UpgradeConsole.Skip("No UI directory found, skipping Datepicker format migration");
            return 0;
        }

        var result = Apply(workspace);
        await workspace.Save();

        if (result.FilesChanged == 0)
        {
            UpgradeConsole.Skip("No legacy Datepicker format values found to migrate");
        }
        else
        {
            UpgradeConsole.Ok(
                $"Migrated {result.Changes} legacy Datepicker format value(s) across {result.FilesChanged} layout file(s)"
            );
        }

        return 0;
    }

    internal static LayoutMutationResult Apply(LayoutMigrationWorkspace workspace) =>
        workspace.Apply(ReplaceLegacyFormats);

    private static int ReplaceLegacyFormats(JsonNode node)
    {
        var replaced = 0;
        if (
            node is JsonObject obj
            && obj["type"] is JsonValue typeValue
            && typeValue.TryGetValue<string>(out var type)
            && type == ComponentType
            && obj["format"] is JsonValue formatValue
            && formatValue.TryGetValue<string>(out var format)
            && _legacyFormats.TryGetValue(format, out var newFormat)
        )
        {
            obj["format"] = newFormat;
            replaced++;
        }

        foreach (var child in GetChildren(node))
            replaced += ReplaceLegacyFormats(child);

        return replaced;
    }

    private static IEnumerable<JsonNode> GetChildren(JsonNode node) =>
        node switch
        {
            JsonObject obj => obj.Select(property => property.Value).OfType<JsonNode>(),
            JsonArray array => array.OfType<JsonNode>(),
            _ => [],
        };
}
