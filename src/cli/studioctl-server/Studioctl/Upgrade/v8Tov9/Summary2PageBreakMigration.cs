using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

internal static class Summary2PageBreakMigration
{
    private const string ComponentType = "Summary2";

    public static async Task<int> Migrate(string projectFolder)
    {
        var uiDirectory = ResolveUiDirectory(projectFolder);
        if (uiDirectory is null)
        {
            await UpgradeConsole.Out.WriteLineAsync("No UI directory found, skipping Summary2 pageBreak migration");
            return 0;
        }

        var changedFiles = 0;
        var removedProperties = 0;
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

            var removedInFile = RemovePageBreakFromSummary2(root);
            if (removedInFile == 0)
                continue;

            var options = new JsonSerializerOptions
            {
                WriteIndented = true,
                Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
            };
            var migrated = root.ToJsonString(options);
            if (decoded.Text.EndsWith('\n'))
                migrated += decoded.Text.EndsWith("\r\n", StringComparison.Ordinal) ? "\r\n" : "\n";

            await Utf8TextFile.Write(layoutFile, migrated, decoded.HadBom);
            changedFiles++;
            removedProperties += removedInFile;
            await UpgradeConsole.Out.WriteLineAsync(
                $"Removed pageBreak from {removedInFile} Summary2 component(s) in {layoutFile}"
            );
        }

        await UpgradeConsole.Out.WriteLineAsync(
            changedFiles == 0
                ? "No Summary2 pageBreak properties found to remove"
                : $"Removed pageBreak from {removedProperties} Summary2 component(s) across {changedFiles} layout file(s)"
        );
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

    private static int RemovePageBreakFromSummary2(JsonNode node)
    {
        var removed = 0;
        if (node is JsonObject obj)
        {
            if (
                obj["type"] is JsonValue type
                && type.TryGetValue<string>(out var componentType)
                && componentType == ComponentType
                && obj.Remove("pageBreak")
            )
            {
                removed++;
            }

            foreach (var child in obj.Select(property => property.Value).ToList())
            {
                if (child is not null)
                    removed += RemovePageBreakFromSummary2(child);
            }
        }
        else if (node is JsonArray array)
        {
            foreach (var child in array.ToList())
            {
                if (child is not null)
                    removed += RemovePageBreakFromSummary2(child);
            }
        }

        return removed;
    }
}
