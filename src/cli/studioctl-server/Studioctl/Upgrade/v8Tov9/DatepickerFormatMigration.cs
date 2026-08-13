using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.Studio.Cli.Upgrade.JsonWhitespaceRestoration;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Rewrites legacy (moment.js style) Datepicker <c>format</c> values to the Unicode tokens v9
/// requires (e.g. <c>DD.MM.YYYY</c> → <c>dd.MM.yyyy</c>) under <c>App/ui/**/layouts</c>. The v8
/// frontend silently accepted the legacy tokens; v9 does not.
/// </summary>
internal static class DatepickerFormatMigration
{
    private const string ComponentType = "Datepicker";

    private static readonly JsonSerializerOptions _jsonOptions = new() { WriteIndented = true };

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
        var uiDirectory = ResolveUiDirectory(projectFolder);
        if (uiDirectory is null)
        {
            UpgradeConsole.Skip("No UI directory found, skipping Datepicker format migration");
            return 0;
        }

        var changedFiles = new List<string>();
        var changedFormats = 0;
        foreach (var layoutFile in FindLayoutFiles(uiDirectory))
        {
            var decoded = Utf8TextFile.Decode(await File.ReadAllBytesAsync(layoutFile));
            var root = JsonNode.Parse(
                decoded.Text,
                new JsonNodeOptions { PropertyNameCaseInsensitive = false },
                new JsonDocumentOptions { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true }
            );
            if (root is null)
                throw new JsonException($"Layout file does not contain JSON: {layoutFile}");

            var replacedInFile = ReplaceLegacyFormats(root);
            if (replacedInFile == 0)
                continue;

            var hadTrailingNewline = decoded.Text.EndsWith('\n');
            var updated = root.ToJsonString(_jsonOptions);
            if (hadTrailingNewline)
                updated += Environment.NewLine;

            await Utf8TextFile.Write(layoutFile, updated, decoded.HadBom);
            changedFiles.Add(layoutFile);
            changedFormats += replacedInFile;
            UpgradeConsole.Ok($"Migrated {replacedInFile} legacy Datepicker format value(s) in {layoutFile}");
        }

        if (changedFiles.Count > 0)
        {
            try
            {
                new WhitespaceRestorationProcessor(uiDirectory).RestoreWhitespaceOnlyChanges(changedFiles);
            }
            catch
            {
                // Formatting restoration is best-effort, for example when upgrading outside a Git repository.
            }
        }

        if (changedFiles.Count == 0)
        {
            UpgradeConsole.Skip("No legacy Datepicker format values found to migrate");
        }
        else
        {
            UpgradeConsole.Ok(
                $"Migrated {changedFormats} legacy Datepicker format value(s) across {changedFiles.Count} layout file(s)"
            );
        }

        return 0;
    }

    private static string? ResolveUiDirectory(string projectFolder)
    {
        var appUiDirectory = Path.Combine(projectFolder, "App", "ui");
        if (Directory.Exists(appUiDirectory))
            return appUiDirectory;

        var uiDirectory = Path.Combine(projectFolder, "ui");
        return Directory.Exists(uiDirectory) ? uiDirectory : null;
    }

    private static IEnumerable<string> FindLayoutFiles(string uiDirectory) =>
        Directory
            .EnumerateFiles(uiDirectory, "*.json", SearchOption.AllDirectories)
            .Where(path =>
                string.Equals(Path.GetFileName(Path.GetDirectoryName(path)), "layouts", StringComparison.Ordinal)
            );

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
