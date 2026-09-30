using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Renames the misspelled <c>allowedContributers</c> property on the data types in applicationmetadata.json to
/// <c>allowedContributors</c>. The v9 app still reads the old spelling, but the application metadata schema
/// accepts only the new one, so a data type left on the old spelling fails schema validation.
/// </summary>
internal static class AllowedContributorsMigration
{
    private const string OldName = "allowedContributers";
    private const string NewName = "allowedContributors";
    private const string MetadataPath = "config/applicationmetadata.json";

    // The quoted name followed by a colon is a property name, never a mention inside a string value.
    private static readonly Regex _oldProperty = new(
        $"\"{OldName}\"(?=\\s*:)",
        RegexOptions.Compiled | RegexOptions.CultureInvariant
    );

    public static async Task<MigrationResult> Migrate(string projectFolder)
    {
        var messages = new List<UpgradeMessage>();

        var metadataFile = AppFiles.Resolve(projectFolder, MetadataPath);
        if (metadataFile is null)
            return new MigrationResult(messages);

        string text;
        bool hadBom;
        JsonNode? root;
        try
        {
            (text, hadBom) = Utf8TextFile.Decode(await File.ReadAllBytesAsync(metadataFile));
            root = JsonNode.Parse(
                text,
                documentOptions: new JsonDocumentOptions
                {
                    CommentHandling = JsonCommentHandling.Skip,
                    AllowTrailingCommas = true,
                }
            );
        }
        catch (Exception ex) when (ex is DecoderFallbackException or JsonException)
        {
            messages.Todo(
                $"Could not read {MetadataPath} ({ex.Message}); rename any {OldName} property to {NewName} manually."
            );
            return new MigrationResult(messages);
        }

        if (root is not JsonObject metadata || metadata["dataTypes"] is not JsonArray dataTypes)
            return new MigrationResult(messages);

        var renamed = new List<string>();
        var conflicts = new List<string>();
        foreach (var dataType in dataTypes.OfType<JsonObject>().Where(dataType => dataType.ContainsKey(OldName)))
        {
            var id = dataType["id"] is JsonValue value && value.TryGetValue<string>(out var s) ? s : "<unknown>";
            (dataType.ContainsKey(NewName) ? conflicts : renamed).Add($"'{id}'");
        }

        if (conflicts.Count > 0)
        {
            messages.Todo(
                $"Left {MetadataPath} unchanged: data type(s) {string.Join(", ", conflicts)} have both {OldName} and "
                    + $"{NewName}, and the app uses {OldName} when it is not empty. Keep the list you want under "
                    + $"{NewName}, remove {OldName} and re-run the upgrade."
            );
            return new MigrationResult(messages);
        }

        if (renamed.Count == 0)
            return new MigrationResult(messages);

        if (_oldProperty.Count(text) != renamed.Count)
        {
            messages.Todo(
                $"Left {MetadataPath} unchanged: {OldName} also appears outside the data types. Rename it to "
                    + $"{NewName} on data type(s) {string.Join(", ", renamed)} manually."
            );
            return new MigrationResult(messages);
        }

        await Utf8TextFile.Write(metadataFile, _oldProperty.Replace(text, $"\"{NewName}\""), hadBom);
        messages.Warn(
            $"Renamed {OldName} to {NewName} on data type(s) {string.Join(", ", renamed)} in {MetadataPath}, the "
                + "spelling the application metadata schema accepts."
        );
        return new MigrationResult(messages);
    }
}
