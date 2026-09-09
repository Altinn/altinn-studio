using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.Studio.Cli.Upgrade.JsonWhitespaceRestoration;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.DatepickerMigration;

/// <summary>
/// Adds explicit <c>timeStamp: true</c> on Datepicker components that omit the property.
/// In v9 the runtime default is <c>false</c> (date only); upgrading apps must keep the old
/// timestamp-with-time behavior unless they already set the flag.
/// </summary>
internal sealed record DatepickerTimeStampMigrationResult(int FilesChanged, int PropertiesAdded);

internal sealed class DatepickerTimeStampMigrator
{
    private static readonly JsonSerializerOptions _jsonOptions = new() { WriteIndented = true };
    private readonly string _projectFolder;

    public DatepickerTimeStampMigrator(string projectFolder)
    {
        _projectFolder = projectFolder;
    }

    public async Task<DatepickerTimeStampMigrationResult> Migrate()
    {
        var uiPath = ResolveUiPath();
        if (uiPath is null)
            return new DatepickerTimeStampMigrationResult(0, 0);

        var filesChanged = 0;
        var propertiesAdded = 0;
        var changedFiles = new List<string>();

        foreach (var path in Directory.EnumerateFiles(uiPath, "*.json", SearchOption.AllDirectories))
        {
            if (!string.Equals(Path.GetFileName(Path.GetDirectoryName(path)), "layouts", StringComparison.Ordinal))
                continue;

            var (text, hadBom) = Utf8TextFile.Decode(await File.ReadAllBytesAsync(path));
            var root = JsonNode.Parse(
                text,
                new JsonNodeOptions { PropertyNameCaseInsensitive = false },
                new JsonDocumentOptions { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true }
            );
            if (root is null)
                continue;

            var addedFromFile = AddMissingTimeStampTrue(root);
            if (addedFromFile == 0)
                continue;

            var hadTrailingNewline = text.EndsWith('\n');
            var updated = root.ToJsonString(_jsonOptions);
            if (hadTrailingNewline)
                updated += Environment.NewLine;

            await Utf8TextFile.Write(path, updated, withBom: hadBom);
            changedFiles.Add(path);
            filesChanged++;
            propertiesAdded += addedFromFile;
        }

        if (filesChanged > 0)
        {
            try
            {
                new WhitespaceRestorationProcessor(uiPath).RestoreWhitespaceOnlyChanges(changedFiles);
            }
            catch
            {
                // Formatting restoration is best-effort, for example when upgrading outside a Git repository.
            }
        }

        return new DatepickerTimeStampMigrationResult(filesChanged, propertiesAdded);
    }

    private string? ResolveUiPath()
    {
        var appUiPath = Path.Combine(_projectFolder, "App", "ui");
        if (Directory.Exists(appUiPath))
            return appUiPath;

        var uiPath = Path.Combine(_projectFolder, "ui");
        return Directory.Exists(uiPath) ? uiPath : null;
    }

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
