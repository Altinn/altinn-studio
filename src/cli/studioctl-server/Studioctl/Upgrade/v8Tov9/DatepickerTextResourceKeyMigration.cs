using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Rewrites the two datepicker text-resource keys the app frontend corrected for v9. Apps may
/// override the validation messages in their own <c>resource.*.json</c>; an override left under the
/// old key would silently stop applying after the upgrade — the lookup misses and the component
/// falls back to the built-in default text.
/// </summary>
internal static class DatepickerTextResourceKeyMigration
{
    private static readonly (string Old, string New)[] _keyRenames =
    [
        ("date_picker.min_date_exeeded", "date_picker.min_date_exceeded"),
        ("date_picker.max_date_exeeded", "date_picker.max_date_exceeded"),
    ];

    public static async Task<int> Migrate(string projectFolder)
    {
        var textsDirectory = ResolveTextsDirectory(projectFolder);
        if (textsDirectory is null)
        {
            UpgradeConsole.Skip("No texts directory found");
            return 0;
        }

        var renamedKeys = 0;
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
                var structural = resources.Count(r =>
                    r is JsonObject entry
                    && entry["id"] is JsonValue id
                    && id.TryGetValue<string>(out var v)
                    && v == oldKey
                );
                if (structural == 0)
                {
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
            renamedKeys += fileRenames;
            changedFiles++;
            UpgradeConsole.Ok($"Renamed {fileRenames} datepicker text key(s) in {resourceFile}");
        }

        if (changedFiles == 0)
        {
            UpgradeConsole.Skip("No overrides of the renamed datepicker text keys");
        }

        return 0;
    }

    private static string? ResolveTextsDirectory(string projectFolder)
    {
        var appTexts = Path.Combine(projectFolder, "App", "config", "texts");
        if (Directory.Exists(appTexts))
            return appTexts;

        var texts = Path.Combine(projectFolder, "config", "texts");
        return Directory.Exists(texts) ? texts : null;
    }
}
