using System.Text;
using System.Text.Json;

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

    private static readonly JsonReaderOptions _readerOptions = new()
    {
        CommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    public static async Task<MigrationResult> Migrate(string projectFolder)
    {
        var messages = new List<UpgradeMessage>();

        var metadataFile = AppFiles.Resolve(projectFolder, MetadataPath);
        if (metadataFile is null)
            return new MigrationResult(messages);

        byte[] json;
        bool hadBom;
        List<DataType> dataTypes;
        try
        {
            var decoded = Utf8TextFile.Decode(await File.ReadAllBytesAsync(metadataFile));
            json = Encoding.UTF8.GetBytes(decoded.Text);
            hadBom = decoded.HadBom;
            dataTypes = ReadDataTypes(json);
        }
        catch (Exception ex) when (ex is DecoderFallbackException or JsonException)
        {
            messages.Todo(
                $"Could not read {MetadataPath} ({ex.Message}); rename any {OldName} property to {NewName} manually."
            );
            return new MigrationResult(messages);
        }

        var conflicts = dataTypes.Where(dataType => dataType.OldNames.Count > 0 && dataType.HasNewName).ToList();
        if (conflicts.Count > 0)
        {
            messages.Todo(
                $"Left {MetadataPath} unchanged: data type(s) {Ids(conflicts)} have both {OldName} and {NewName}, and "
                    + $"the app uses {OldName} when it is not empty. Keep the list you want under {NewName}, remove "
                    + $"{OldName} and re-run the upgrade."
            );
            return new MigrationResult(messages);
        }

        var renamed = dataTypes.Where(dataType => dataType.OldNames.Count > 0).ToList();
        if (renamed.Count == 0)
            return new MigrationResult(messages);

        var replacement = Encoding.UTF8.GetBytes($"\"{NewName}\"");
        var result = new List<byte>(json.Length);
        var copied = 0;
        foreach (var (start, length) in renamed.SelectMany(dataType => dataType.OldNames).OrderBy(name => name.Start))
        {
            result.AddRange(json.AsSpan(copied, start - copied));
            result.AddRange(replacement);
            copied = start + length;
        }
        result.AddRange(json.AsSpan(copied));

        await Utf8TextFile.Write(metadataFile, Encoding.UTF8.GetString([.. result]), hadBom);
        messages.Warn(
            $"Renamed {OldName} to {NewName} on data type(s) {Ids(renamed)} in {MetadataPath}, the spelling the "
                + "application metadata schema accepts."
        );
        return new MigrationResult(messages);
    }

    /// <summary>
    /// Finds the objects in the root <c>dataTypes</c> array, with the position of every <see cref="OldName"/>
    /// property name directly on them. Positions are byte ranges covering the quoted name as written, escapes
    /// included, so a property elsewhere in the file or a mention inside a string value is never among them.
    /// </summary>
    private static List<DataType> ReadDataTypes(byte[] json)
    {
        var reader = new Utf8JsonReader(json, _readerOptions);
        var dataTypes = new List<DataType>();
        string? rootProperty = null;
        var inDataTypes = false;
        DataType? current = null;

        while (reader.Read())
        {
            switch (reader.TokenType, reader.CurrentDepth)
            {
                case (JsonTokenType.PropertyName, 1):
                    rootProperty = reader.GetString();
                    break;
                case (JsonTokenType.StartArray, 1):
                    inDataTypes = rootProperty == "dataTypes";
                    break;
                case (JsonTokenType.EndArray, 1):
                    inDataTypes = false;
                    break;
                case (JsonTokenType.StartObject, 2) when inDataTypes:
                    current = new DataType();
                    dataTypes.Add(current);
                    break;
                case (JsonTokenType.EndObject, 2):
                    current = null;
                    break;
                case (JsonTokenType.PropertyName, 3) when current is not null:
                    switch (reader.GetString())
                    {
                        case OldName:
                            current.OldNames.Add(((int)reader.TokenStartIndex, reader.ValueSpan.Length + 2));
                            break;
                        case NewName:
                            current.HasNewName = true;
                            break;
                        case "id":
                            // A non-string id is skipped token by token by the loop; no case matches inside it.
                            if (reader.Read() && reader.TokenType == JsonTokenType.String)
                                current.Id = reader.GetString();
                            break;
                    }
                    break;
            }
        }

        return dataTypes;
    }

    private static string Ids(IEnumerable<DataType> dataTypes) =>
        string.Join(", ", dataTypes.Select(dataType => $"'{dataType.Id ?? "<unknown>"}'"));

    private sealed class DataType
    {
        public string? Id { get; set; }

        public bool HasNewName { get; set; }

        public List<(int Start, int Length)> OldNames { get; } = [];
    }
}
