using System.Text;
using System.Text.Json;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

internal static class InvalidValidationMaskMigration
{
    public static async Task<int> Migrate(string projectFolder)
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
            if (Path.GetFileName(file) != "Settings.json" && Path.GetFileName(Path.GetDirectoryName(file)) != "layouts")
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
            var isValidationList =
                propertyName is "showValidations" or "validateOnSaveRow"
                || propertyName == "show"
                    && parentProperty
                        is "validation"
                            or "validationOnNavigation"
                            or "validateOnNext"
                            or "validateOnPrevious"
                            or "validateOnForward"
                            or "validateOnBackward";
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
