using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

internal static class InvalidValidationMaskMigration
{
    public static Task<int> Migrate(string projectFolder) => Migrate(projectFolder, settingsOnly: false);

    internal static Task<int> MigrateSettings(string projectFolder) => Migrate(projectFolder, settingsOnly: true);

    private static async Task<int> Migrate(string projectFolder, bool settingsOnly)
    {
        var uiDirectory = Path.Combine(projectFolder, "App", "ui");
        if (!Directory.Exists(uiDirectory))
            uiDirectory = Path.Combine(projectFolder, "ui");
        if (!Directory.Exists(uiDirectory))
        {
            UpgradeConsole.Skip("No UI directory found");
            return 0;
        }

        var changedFiles = 0;
        foreach (var file in Directory.EnumerateFiles(uiDirectory, "*.json", SearchOption.AllDirectories))
        {
            if (
                Path.GetFileName(file) != "Settings.json"
                && (settingsOnly || Path.GetFileName(Path.GetDirectoryName(file)) != "layouts")
            )
                continue;

            var decoded = Utf8TextFile.Decode(await File.ReadAllBytesAsync(file));
            var migrated = AddInvalidMask(decoded.Text);
            if (migrated == decoded.Text)
                continue;

            await Utf8TextFile.Write(file, migrated, decoded.HadBom);
            changedFiles++;
            UpgradeConsole.Ok($"Added Invalid to explicit Schema validation lists in {file}");
        }

        if (changedFiles == 0)
            UpgradeConsole.Skip("No Schema validation lists require Invalid");
        return 0;
    }

    internal static LayoutMutationResult Apply(LayoutMigrationWorkspace workspace) =>
        workspace.Apply(node => AddInvalidMasks(node, null, null));

    private static int AddInvalidMasks(JsonNode node, string? propertyName, string? parentProperty)
    {
        var changes = 0;
        if (node is JsonObject obj)
        {
            foreach (var property in obj)
            {
                if (property.Value is not null)
                    changes += AddInvalidMasks(property.Value, property.Key, propertyName);
            }
        }
        else if (node is JsonArray array)
        {
            if (IsValidationList(propertyName, parentProperty))
            {
                var schemaIndex = -1;
                var hasInvalid = false;
                for (var index = 0; index < array.Count; index++)
                {
                    if (array[index] is not JsonValue value || !value.TryGetValue<string>(out var mask))
                        continue;
                    if (mask == "Schema" && schemaIndex < 0)
                        schemaIndex = index;
                    hasInvalid |= mask == "Invalid";
                }
                if (schemaIndex >= 0 && !hasInvalid)
                {
                    array.Insert(schemaIndex + 1, JsonValue.Create("Invalid"));
                    changes++;
                }
            }
            foreach (var child in array)
            {
                if (child is not null)
                    changes += AddInvalidMasks(child, null, propertyName);
            }
        }
        return changes;
    }

    private static bool IsValidationList(string? propertyName, string? parentProperty) =>
        propertyName is "showValidations" or "validateOnSaveRow"
        || propertyName == "show"
            && parentProperty
                is "validation"
                    or "validationOnNavigation"
                    or "validateOnNext"
                    or "validateOnPrevious"
                    or "validateOnForward"
                    or "validateOnBackward";

    private static string AddInvalidMask(string content)
    {
        var utf8 = Encoding.UTF8.GetBytes(content);
        var reader = new Utf8JsonReader(
            utf8,
            new JsonReaderOptions { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true }
        );
        if (!reader.Read())
            throw new JsonException("UI file does not contain JSON");

        var insertions = new List<int>();
        FindInsertions(ref reader, null, null, insertions);
        // Read through the end to reject extra content before writing any changes.
        if (reader.Read())
            throw new JsonException("Unexpected content after the UI JSON value");
        if (insertions.Count == 0)
            return content;

        using var output = new MemoryStream();
        var offset = 0;
        foreach (var insertion in insertions.Order())
        {
            output.Write(utf8, offset, insertion - offset);
            output.Write(", \"Invalid\""u8);
            offset = insertion;
        }
        output.Write(utf8, offset, utf8.Length - offset);
        return Encoding.UTF8.GetString(output.ToArray());
    }

    private static void FindInsertions(
        ref Utf8JsonReader reader,
        string? propertyName,
        string? parentProperty,
        ICollection<int> insertions
    )
    {
        if (reader.TokenType == JsonTokenType.StartObject)
        {
            while (reader.Read() && reader.TokenType != JsonTokenType.EndObject)
            {
                var name = reader.GetString();
                if (!reader.Read())
                    throw new JsonException("Expected a property value");
                FindInsertions(ref reader, name, propertyName, insertions);
            }
        }
        else if (reader.TokenType == JsonTokenType.StartArray)
        {
            var isValidationList = IsValidationList(propertyName, parentProperty);
            int? schemaEnd = null;
            var hasInvalid = false;
            while (reader.Read() && reader.TokenType != JsonTokenType.EndArray)
            {
                if (isValidationList && reader.TokenType == JsonTokenType.String)
                {
                    var value = reader.GetString();
                    if (value == "Schema")
                        schemaEnd ??= checked((int)reader.BytesConsumed);
                    hasInvalid |= value == "Invalid";
                }
                FindInsertions(ref reader, null, propertyName, insertions);
            }
            if (schemaEnd is { } end && !hasInvalid)
                insertions.Add(end);
        }
    }
}
