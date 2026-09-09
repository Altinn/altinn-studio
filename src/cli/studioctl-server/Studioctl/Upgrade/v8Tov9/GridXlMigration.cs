using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Unicode;
using Altinn.Studio.Cli.Upgrade.JsonWhitespaceRestoration;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

internal sealed record GridXlMigrationResult(int FilesChanged, int PropertiesRemoved);

/// <summary>
/// Removes the unsupported <c>xl</c> component-grid setting from layout files.
/// </summary>
internal static class GridXlMigration
{
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        WriteIndented = true,
        Encoder = JavaScriptEncoder.Create(UnicodeRanges.All),
    };
    private static readonly string[] _nestedGridProperties = ["innerGrid", "labelGrid", "validationGrid"];

    public static async Task<GridXlMigrationResult> Migrate(string projectFolder)
    {
        var uiDirectory = ResolveUiDirectory(projectFolder);
        if (uiDirectory is null)
            return new GridXlMigrationResult(0, 0);

        var changedFiles = new List<string>();
        var propertiesRemoved = 0;
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

            var removedInFile = RemoveGridXlProperties(root);
            if (removedInFile == 0)
                continue;

            var hadTrailingNewline = decoded.Text.EndsWith('\n');
            var updated = root.ToJsonString(_jsonOptions);
            if (hadTrailingNewline)
                updated += Environment.NewLine;

            await Utf8TextFile.Write(layoutFile, updated, decoded.HadBom);
            changedFiles.Add(layoutFile);
            propertiesRemoved += removedInFile;
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

        return new GridXlMigrationResult(changedFiles.Count, propertiesRemoved);
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
