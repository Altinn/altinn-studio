using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Rewrites built-in text-resource keys that v9 renamed. Apps may override these texts in their own
/// <c>resource.*.json</c>; an override left under the old key would silently stop applying after the
/// upgrade — the lookup misses and the built-in default text is shown instead.
/// </summary>
internal static class TextResourceKeyMigration
{
    private static readonly (string Old, string New)[] _keyRenames =
    [
        // The app frontend corrected the spelling of the datepicker validation keys.
        ("date_picker.min_date_exeeded", "date_picker.min_date_exceeded"),
        ("date_picker.max_date_exeeded", "date_picker.max_date_exceeded"),
        // Built-in backend validation issues used their issue code as the message, so the code was the
        // text key an app could override. They now set a text key of their own.
        ("MissingContentType", "backend.validation_errors.missing_content_type"),
        ("DataElementTooLarge", "backend.validation_errors.file_too_large"),
        ("DataElementFileInfected", "backend.validation_errors.file_infected"),
        ("DataElementFileScanPending", "backend.validation_errors.file_scan_pending"),
        ("TooManyDataElementsOfType", "backend.validation_errors.too_many_data_elements"),
        ("TooFewDataElementsOfType", "backend.validation_errors.too_few_data_elements"),
    ];

    public static async Task<int> Migrate(string projectFolder)
    {
        var textsDirectory = ResolveTextsDirectory(projectFolder);
        if (textsDirectory is null)
        {
            UpgradeConsole.Skip("No texts directory found");
            return 0;
        }

        var changedFiles = 0;
        foreach (var resourceFile in Directory.EnumerateFiles(textsDirectory, "resource.*.json"))
        {
            var decoded = Utf8TextFile.Decode(await File.ReadAllBytesAsync(resourceFile));
            var root = JsonNode.Parse(
                decoded.Text,
                new JsonNodeOptions { PropertyNameCaseInsensitive = false },
                new JsonDocumentOptions { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true }
            );
            if (root?["resources"] is not JsonArray resources)
            {
                continue;
            }

            var migrated = decoded.Text;
            var fileRenames = 0;
            foreach (var (oldKey, newKey) in _keyRenames)
            {
                var structural = CountIds(resources, oldKey);
                if (structural == 0)
                {
                    continue;
                }

                if (CountIds(resources, newKey) > 0)
                {
                    UpgradeConsole.Todo(
                        $"{resourceFile} has texts for both '{oldKey}' and '{newKey}'. Only '{newKey}' is used in v9; remove '{oldKey}' when you have checked its text"
                    );
                    continue;
                }

                // The quoted key must occur exactly as often as the structural count says, so a
                // mention inside a VALUE text cannot be rewritten by accident.
                var pattern = new Regex($"\"{Regex.Escape(oldKey)}\"");
                if (pattern.Count(migrated) != structural)
                {
                    throw new InvalidOperationException(
                        $"Could not safely migrate {resourceFile}: '{oldKey}' occurs outside an id field"
                    );
                }

                migrated = pattern.Replace(migrated, $"\"{newKey}\"");
                fileRenames += structural;
            }

            if (fileRenames == 0)
            {
                continue;
            }

            await Utf8TextFile.Write(resourceFile, migrated, decoded.HadBom);
            changedFiles++;
            UpgradeConsole.Ok($"Renamed {fileRenames} text key(s) in {resourceFile}");
        }

        if (changedFiles == 0)
        {
            UpgradeConsole.Skip("No overrides of the renamed text keys");
        }

        return 0;
    }

    private static int CountIds(JsonArray resources, string key) =>
        resources.Count(r =>
            r is JsonObject entry && entry["id"] is JsonValue id && id.TryGetValue<string>(out var v) && v == key
        );

    private static string? ResolveTextsDirectory(string projectFolder)
    {
        var appTexts = Path.Combine(projectFolder, "App", "config", "texts");
        if (Directory.Exists(appTexts))
            return appTexts;

        var texts = Path.Combine(projectFolder, "config", "texts");
        return Directory.Exists(texts) ? texts : null;
    }
}
