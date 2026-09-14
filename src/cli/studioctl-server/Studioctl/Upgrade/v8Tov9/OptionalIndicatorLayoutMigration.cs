using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.Studio.Cli.Upgrade.JsonWhitespaceRestoration;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

internal sealed record OptionalIndicatorLayoutMigrationResult(
    int FilesChanged,
    int PropertiesRemoved,
    IReadOnlyList<string> Warnings
);

/// <summary>
/// Removes <c>labelSettings.optionalIndicator: true</c> from layout components. In v9 the app frontend
/// follows the Designsystemet pattern for required and optional fields, where every field is marked as
/// either required or optional, so the optional marker is shown by default and the setting only does
/// anything when it is <c>false</c>. An empty <c>labelSettings</c> object left behind is removed too.
/// </summary>
internal static class OptionalIndicatorLayoutMigration
{
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        WriteIndented = true,
        // Keep "æøå" as they are instead of escaping every non-ASCII character in the file.
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    public static async Task<OptionalIndicatorLayoutMigrationResult> Migrate(string projectFolder)
    {
        var uiDirectory = ResolveUiDirectory(projectFolder);
        if (uiDirectory is null)
            return new OptionalIndicatorLayoutMigrationResult(0, 0, []);

        var warnings = new List<string>();
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

            var removedInFile = RemoveRedundantOptionalIndicators(root);
            if (removedInFile == 0)
                continue;

            // Comments never make it into the node tree, so rewriting the file from it would delete them.
            if (ContainsComments(decoded.Text))
            {
                warnings.Add(
                    $"{Path.GetFileName(layoutFile)}: left untouched because it has comments, which a rewrite would "
                        + "delete. The 'labelSettings.optionalIndicator: true' setting(s) in this file are redundant "
                        + "and can be removed by hand."
                );
                continue;
            }

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

        return new OptionalIndicatorLayoutMigrationResult(changedFiles.Count, propertiesRemoved, warnings);
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

    private static int RemoveRedundantOptionalIndicators(JsonNode node)
    {
        var propertiesRemoved = 0;
        if (node is JsonObject obj)
        {
            if (obj["labelSettings"] is JsonObject labelSettings && RemoveOptionalIndicator(labelSettings))
            {
                propertiesRemoved++;
                if (labelSettings.Count == 0)
                    obj.Remove("labelSettings");
            }

            foreach (var child in obj.Select(property => property.Value).ToList())
            {
                if (child is not null)
                    propertiesRemoved += RemoveRedundantOptionalIndicators(child);
            }
        }
        else if (node is JsonArray array)
        {
            foreach (var child in array.ToList())
            {
                if (child is not null)
                    propertiesRemoved += RemoveRedundantOptionalIndicators(child);
            }
        }

        return propertiesRemoved;
    }

    private static bool RemoveOptionalIndicator(JsonObject labelSettings)
    {
        if (
            labelSettings["optionalIndicator"] is JsonValue value
            && value.TryGetValue<bool>(out var enabled)
            && enabled
        )
        {
            return labelSettings.Remove("optionalIndicator");
        }

        return false;
    }

    /// <summary>
    /// Whether <paramref name="text"/> holds a JSON comment. Uses the reader rather than a text search so
    /// that "//" inside a string value - a URL, say - is not mistaken for one.
    /// </summary>
    private static bool ContainsComments(string text)
    {
        var reader = new Utf8JsonReader(
            Encoding.UTF8.GetBytes(text),
            new JsonReaderOptions { CommentHandling = JsonCommentHandling.Allow, AllowTrailingCommas = true }
        );

        try
        {
            while (reader.Read())
            {
                if (reader.TokenType == JsonTokenType.Comment)
                    return true;
            }
        }
        catch (JsonException)
        {
            return true;
        }

        return false;
    }
}
