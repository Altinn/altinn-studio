using System.Text.RegularExpressions;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Renames misspelled and British-spelled keys in an app's own config files.
///
/// All three are read under both spellings in v9, so this migration is cosmetic and safe to skip —
/// except for <c>autoSaveBehaviour</c>, where rewriting the key is what makes an already-configured
/// value visible to the app for the first time (Designer wrote the British spelling while the app
/// only ever read the American one).
///
/// Keys are matched in key position only - as a property name, or as the <c>"id"</c> of a text
/// resource entry - so a value that happens to contain the old spelling is never rewritten.
/// </summary>
internal static class SpellingConfigMigration
{
    private sealed record KeyRename(string Old, string New, string Why);

    /// <summary>Where in the JSON a key name appears, which decides how it is matched.</summary>
    private enum KeyPosition
    {
        /// <summary>A JSON property name: <c>"allowedContributers": [...]</c>.</summary>
        PropertyName,

        /// <summary>
        /// The value of an <c>"id"</c> property. Altinn text resources are a list of
        /// <c>{ "id": "some.key", "value": "..." }</c> objects, so the key is not a property name.
        /// </summary>
        TextResourceId,
    }

    private static readonly KeyRename[] _applicationMetadataKeys =
    [
        new(
            "allowedContributers",
            "allowedContributors",
            "Altinn Storage still accepts both; the correct spelling has always worked"
        ),
    ];

    private static readonly KeyRename[] _layoutSettingsKeys =
    [
        new(
            "autoSaveBehaviour",
            "autoSaveBehavior",
            "the app reads autoSaveBehavior, so the British spelling had no effect"
        ),
    ];

    /// <summary>
    /// Built-in text resource keys an app may override in App/config/texts/resource.*.json.
    /// Only keys the app frontend actually ships are listed - app-authored keys are none of our business.
    /// </summary>
    private static readonly KeyRename[] _textResourceKeys =
    [
        new("date_picker.min_date_exeeded", "date_picker.min_date_exceeded", "misspelled built-in text key"),
        new("date_picker.max_date_exeeded", "date_picker.max_date_exceeded", "misspelled built-in text key"),
    ];

    public static async Task<MigrationResult> Migrate(string projectFolder)
    {
        var warnings = new List<string>();
        var changed = 0;

        changed += await MigrateFile(
            AppFiles.Resolve(projectFolder, Path.Combine("config", "applicationmetadata.json")),
            _applicationMetadataKeys,
            KeyPosition.PropertyName,
            warnings
        );

        foreach (var settingsFile in FindLayoutSettingsFiles(projectFolder))
            changed += await MigrateFile(settingsFile, _layoutSettingsKeys, KeyPosition.PropertyName, warnings);

        foreach (var textFile in FindTextResourceFiles(projectFolder))
            changed += await MigrateFile(textFile, _textResourceKeys, KeyPosition.TextResourceId, warnings);

        await UpgradeConsole.Out.WriteLineAsync(
            changed == 0 ? "No misspelled config keys found to migrate" : $"Renamed {changed} misspelled config key(s)"
        );
        return new MigrationResult(false, warnings);
    }

    private static async Task<int> MigrateFile(
        string? path,
        KeyRename[] renames,
        KeyPosition position,
        List<string> warnings
    )
    {
        if (path is null || !File.Exists(path))
            return 0;

        var decoded = Utf8TextFile.Decode(await File.ReadAllBytesAsync(path));
        var text = decoded.Text;
        var updated = text;
        var changed = 0;

        foreach (var rename in renames)
        {
            var pattern = MatchKey(rename.Old, position);
            var count = pattern.Matches(updated).Count;
            if (count == 0)
                continue;

            // If the file already carries the new spelling, renaming would create a duplicate key.
            if (MatchKey(rename.New, position).IsMatch(updated))
            {
                warnings.Add(
                    $"{path}: both '{rename.Old}' and '{rename.New}' are present. Left as-is to avoid creating a "
                        + $"duplicate key - remove '{rename.Old}' by hand ({rename.Why})."
                );
                continue;
            }

            updated = pattern.Replace(updated, Replacement(rename.New, position));
            changed += count;
            await UpgradeConsole.Out.WriteLineAsync($"  {rename.Old} -> {rename.New} in {path}");
        }

        if (changed > 0)
            await Utf8TextFile.Write(path, updated, decoded.HadBom);
        return changed;
    }

    private static Regex MatchKey(string key, KeyPosition position) =>
        position switch
        {
            // "key" followed by a colon - a property name, never a value.
            KeyPosition.PropertyName => new Regex($"\"{Regex.Escape(key)}\"(?=\\s*:)", RegexOptions.CultureInvariant),
            // "id": "key" - the key sits in value position in a text resource entry.
            KeyPosition.TextResourceId => new Regex(
                $"(\"id\"\\s*:\\s*)\"{Regex.Escape(key)}\"",
                RegexOptions.CultureInvariant
            ),
            _ => throw new ArgumentOutOfRangeException(nameof(position)),
        };

    private static string Replacement(string key, KeyPosition position) =>
        position switch
        {
            KeyPosition.PropertyName => $"\"{key}\"",
            KeyPosition.TextResourceId => $"$1\"{key}\"",
            _ => throw new ArgumentOutOfRangeException(nameof(position)),
        };

    private static IEnumerable<string> FindLayoutSettingsFiles(string projectFolder)
    {
        var uiDirectory = ResolveDirectory(projectFolder, "ui");
        if (uiDirectory is null)
            yield break;

        foreach (var file in Directory.EnumerateFiles(uiDirectory, "Settings.json", SearchOption.AllDirectories))
            yield return file;
    }

    private static IEnumerable<string> FindTextResourceFiles(string projectFolder)
    {
        var textsDirectory = ResolveDirectory(projectFolder, Path.Combine("config", "texts"));
        if (textsDirectory is null)
            yield break;

        foreach (var file in Directory.EnumerateFiles(textsDirectory, "resource.*.json", SearchOption.AllDirectories))
            yield return file;
    }

    private static string? ResolveDirectory(string projectFolder, string relativePath)
    {
        var underApp = Path.Combine(projectFolder, "App", relativePath);
        if (Directory.Exists(underApp))
            return underApp;

        var direct = Path.Combine(projectFolder, relativePath);
        return Directory.Exists(direct) ? direct : null;
    }
}
