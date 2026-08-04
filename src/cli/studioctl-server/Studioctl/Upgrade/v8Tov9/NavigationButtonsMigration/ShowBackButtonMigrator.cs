using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.Studio.Cli.Upgrade.JsonWhitespaceRestoration;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.NavigationButtonsMigration;

internal sealed record ShowBackButtonMigrationResult(int FilesChanged, int PropertiesRemoved);

internal sealed class ShowBackButtonMigrator
{
    private static readonly JsonSerializerOptions _jsonOptions = new() { WriteIndented = true };
    private readonly string _projectFolder;

    public ShowBackButtonMigrator(string projectFolder)
    {
        _projectFolder = projectFolder;
    }

    public async Task<ShowBackButtonMigrationResult> Migrate()
    {
        var uiPath = ResolveUiPath();
        if (uiPath is null)
            return new ShowBackButtonMigrationResult(0, 0);

        var filesChanged = 0;
        var propertiesRemoved = 0;

        foreach (var path in Directory.EnumerateFiles(uiPath, "*.json", SearchOption.AllDirectories))
        {
            if (!string.Equals(Path.GetFileName(Path.GetDirectoryName(path)), "layouts", StringComparison.Ordinal))
                continue;

            var (text, hadBom) = Utf8TextFile.Decode(await File.ReadAllBytesAsync(path));
            var root = JsonNode.Parse(text);
            if (root is null)
                continue;

            var removedFromFile = RemoveRedundantProperties(root);
            if (removedFromFile == 0)
                continue;

            var hadTrailingNewline = text.EndsWith('\n');
            var updated = root.ToJsonString(_jsonOptions);
            if (hadTrailingNewline)
                updated += Environment.NewLine;

            await Utf8TextFile.Write(path, updated, withBom: hadBom);
            filesChanged++;
            propertiesRemoved += removedFromFile;
        }

        if (filesChanged > 0)
        {
            try
            {
                new WhitespaceRestorationProcessor(uiPath).RestoreWhitespaceOnlyChanges();
            }
            catch
            {
                // Formatting restoration is best-effort, for example when upgrading outside a Git repository.
            }
        }

        return new ShowBackButtonMigrationResult(filesChanged, propertiesRemoved);
    }

    private string? ResolveUiPath()
    {
        var appUiPath = Path.Combine(_projectFolder, "App", "ui");
        if (Directory.Exists(appUiPath))
            return appUiPath;

        var uiPath = Path.Combine(_projectFolder, "ui");
        return Directory.Exists(uiPath) ? uiPath : null;
    }

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
