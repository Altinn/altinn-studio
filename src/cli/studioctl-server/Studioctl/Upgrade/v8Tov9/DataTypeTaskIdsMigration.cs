using System.Text;
using System.Text.Json;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Replaces the <c>taskId</c> of the data types in applicationmetadata.json with <c>taskIds</c>, the only one v9
/// reads. The file is edited in place, keeping its encoding, line endings and indentation. Property names are matched
/// ignoring case, as the app reads them.
/// </summary>
internal static class DataTypeTaskIdsMigration
{
    private const string TaskIdName = "taskId";
    private const string TaskIdsName = "taskIds";
    private const string MetadataPath = "config/applicationmetadata.json";

    private static readonly JsonReaderOptions _readerOptions = new() { AllowTrailingCommas = true };

    public static async Task<MigrationResult> Migrate(string projectFolder)
    {
        var messages = new List<UpgradeMessage>();

        var metadataFile = AppFiles.Resolve(projectFolder, MetadataPath);
        if (metadataFile is null)
            return new MigrationResult(messages);

        string text;
        bool hadBom;
        byte[] json;
        List<DataType> dataTypes;
        try
        {
            (text, hadBom) = Utf8TextFile.Decode(await File.ReadAllBytesAsync(metadataFile));
            json = Encoding.UTF8.GetBytes(text);
            dataTypes = ReadDataTypes(json);
        }
        catch (Exception ex) when (ex is DecoderFallbackException or JsonException)
        {
            messages.Todo(
                $"Could not read {MetadataPath} ({ex.Message}); replace taskId with taskIds on its data types manually."
            );
            return new MigrationResult(messages);
        }

        var findings = dataTypes
            .SelectMany(dataType =>
                dataType.TaskIdProperties.Select(property => new Finding(
                    dataType,
                    property,
                    Decide(dataType, property)
                ))
            )
            .ToList();
        var edits = findings.Where(finding => EditsTheFile(finding.Outcome)).ToList();
        if (edits.Count > 0)
        {
            var edited = Apply(json, edits.SelectMany(finding => Edits(json, finding)));
            await Utf8TextFile.Write(metadataFile, edited, hadBom);
        }

        foreach (var outcome in findings.GroupBy(finding => finding.Outcome).OrderBy(group => group.Key))
            messages.Add(Report(outcome.Key, [.. outcome]));

        return new MigrationResult(messages);
    }

    /// <summary>
    /// The tasks a data type is bound to: the strings in its <c>taskIds</c> when it has one, otherwise a non-empty
    /// <c>taskId</c>. The migration keeps this, so a step that reads the binding with it gets the same tasks before and
    /// after the migration.
    /// </summary>
    internal static List<string> BoundTasks(JsonElement dataType)
    {
        JsonElement? taskId = null;
        JsonElement? taskIds = null;
        foreach (var property in dataType.EnumerateObject())
        {
            if (IsProperty(property.Name, TaskIdsName))
                taskIds = property.Value;
            else if (IsProperty(property.Name, TaskIdName))
                taskId = property.Value;
        }

        if (taskIds is { } list)
        {
            return list.ValueKind == JsonValueKind.Array
                ? [.. list.EnumerateArray().Where(IsString).Select(task => task.GetString()).OfType<string>()]
                : [];
        }

        return taskId is { } single && IsString(single) && single.GetString() is { Length: > 0 } task ? [task] : [];

        static bool IsString(JsonElement element) => element.ValueKind == JsonValueKind.String;
    }

    private static Outcome Decide(DataType dataType, TaskIdProperty property)
    {
        // v8 reads only the last taskId, which editing each on its own would not keep.
        if (dataType.TaskIdProperties.Count > 1)
            return Outcome.SeveralTaskIds;
        if (property is { Kind: JsonTokenType.Null } or { Kind: JsonTokenType.String, Value: "" })
            return Outcome.RemovedEmpty;
        if (property is not { Kind: JsonTokenType.String, Value: { } task })
            return Outcome.NotAString;
        if (!dataType.HasTaskIds)
            return Outcome.Replaced;
        // v9 cannot read a taskIds that is a string or an object, and a null one binds no task.
        if (dataType.ListedTasks is not { } listed)
            return Outcome.TaskIdsNotAList;
        return listed.Contains(task) ? Outcome.RemovedListed : Outcome.RemovedNotListed;
    }

    private static bool EditsTheFile(Outcome outcome) =>
        outcome is Outcome.Replaced or Outcome.RemovedListed or Outcome.RemovedEmpty or Outcome.RemovedNotListed;

    private static UpgradeMessage Report(Outcome outcome, List<Finding> found) =>
        outcome switch
        {
            Outcome.Replaced => new(
                $"Replaced taskId with taskIds on data type(s) {Ids(found)} in {MetadataPath}; v9 reads only taskIds.",
                UpgradeMessageStatus.Ok
            ),
            Outcome.RemovedListed => new(
                $"Removed taskId from data type(s) {Ids(found)} in {MetadataPath}: their taskIds lists the same task, "
                    + "and v9 reads only taskIds.",
                UpgradeMessageStatus.Ok
            ),
            Outcome.RemovedEmpty => new(
                $"Removed the empty taskId from data type(s) {Ids(found)} in {MetadataPath}: it bound them to no task.",
                UpgradeMessageStatus.Ok
            ),
            Outcome.RemovedNotListed => new(
                $"Removed taskId from data type(s) {IdsWithTask(found)} in {MetadataPath}: their taskIds does not "
                    + "list that task, so v9 does not bind them to it. Add it to taskIds where it belongs.",
                UpgradeMessageStatus.Warning
            ),
            Outcome.NotAString => new(
                $"Data type(s) {Ids(found)} in {MetadataPath} have a taskId that is not a string, and v9 cannot read "
                    + "the file with it. Replace it with \"taskIds\": [\"<task id>\"], or remove it.",
                UpgradeMessageStatus.Todo
            ),
            Outcome.TaskIdsNotAList => new(
                $"Data type(s) {IdsWithTask(found)} in {MetadataPath} have a taskIds that is not a list of task ids. "
                    + "Make taskIds the list of their tasks, and remove taskId.",
                UpgradeMessageStatus.Todo
            ),
            Outcome.SeveralTaskIds => new(
                $"Data type(s) {Ids(found)} in {MetadataPath} have more than one taskId, and v8 reads only the last. "
                    + "List their task in taskIds, and remove every taskId.",
                UpgradeMessageStatus.Todo
            ),
            _ => throw new InvalidOperationException($"No report for outcome {outcome}."),
        };

    /// <summary>
    /// Finds the objects in the root <c>dataTypes</c> array, each with its <c>taskIds</c> and the position of every
    /// <c>taskId</c> property on it. A property elsewhere in the file or a mention inside a string value is never
    /// among them.
    /// </summary>
    private static List<DataType> ReadDataTypes(byte[] json)
    {
        var reader = new Utf8JsonReader(json, _readerOptions);
        var dataTypes = new List<DataType>();
        string? rootProperty = null;
        var inDataTypes = false;

        while (reader.Read())
        {
            switch (reader.TokenType, reader.CurrentDepth)
            {
                case (JsonTokenType.PropertyName, 1):
                    rootProperty = reader.GetString();
                    break;
                case (JsonTokenType.StartArray, 1):
                    inDataTypes = IsProperty(rootProperty, "dataTypes");
                    break;
                case (JsonTokenType.EndArray, 1):
                    inDataTypes = false;
                    break;
                case (JsonTokenType.StartObject, 2) when inDataTypes:
                    dataTypes.Add(ReadDataType(ref reader));
                    break;
            }
        }

        return dataTypes;
    }

    /// <summary>Reads the data type object the reader is on, leaving the reader on its end.</summary>
    private static DataType ReadDataType(ref Utf8JsonReader reader)
    {
        var dataType = new DataType();
        var previousEnd = (int)reader.TokenStartIndex + 1;
        while (reader.Read() && reader.TokenType == JsonTokenType.PropertyName)
        {
            var name = reader.GetString() ?? "";
            var start = (int)reader.TokenStartIndex;
            // The name as written, escapes included, plus its quotes.
            var nameEnd = start + reader.ValueSpan.Length + 2;
            reader.Read();
            var valueStart = (int)reader.TokenStartIndex;
            var kind = reader.TokenType;
            var value = kind == JsonTokenType.String ? reader.GetString() : null;
            List<string>? listed = null;
            if (IsProperty(name, TaskIdsName) && kind == JsonTokenType.StartArray)
                listed = ReadStrings(ref reader);
            else
                reader.Skip();
            var end = (int)reader.BytesConsumed;

            if (IsProperty(name, "id"))
            {
                dataType.Id = value;
            }
            else if (IsProperty(name, TaskIdsName))
            {
                dataType.HasTaskIds = true;
                dataType.ListedTasks = listed;
            }
            else if (IsProperty(name, TaskIdName))
            {
                dataType.TaskIdProperties.Add(
                    new TaskIdProperty(start, nameEnd, valueStart, end, previousEnd, kind, value)
                );
            }

            previousEnd = end;
        }

        return dataType;
    }

    /// <summary>The strings in the array the reader is on, leaving the reader on its end.</summary>
    private static List<string> ReadStrings(ref Utf8JsonReader reader)
    {
        var strings = new List<string>();
        while (reader.Read() && reader.TokenType != JsonTokenType.EndArray)
        {
            if (reader.TokenType == JsonTokenType.String && reader.GetString() is { } item)
                strings.Add(item);
            reader.Skip();
        }

        return strings;
    }

    private static IEnumerable<Edit> Edits(byte[] json, Finding finding)
    {
        var property = finding.Property;
        if (finding.Outcome == Outcome.Replaced)
        {
            return
            [
                new Edit(property.Start, property.NameEnd, Encoding.UTF8.GetBytes($"\"{TaskIdsName}\"")),
                new Edit(property.ValueStart, property.ValueStart, "["u8.ToArray()),
                new Edit(property.End, property.End, "]"u8.ToArray()),
            ];
        }

        return Removal(json, property).Select(range => new Edit(range.Start, range.End, []));
    }

    /// <summary>
    /// The byte ranges that remove <paramref name="property"/> and one comma next to it: the comma after it, or the
    /// one before it when it is the last property. A property alone on its lines is removed with its lines; otherwise
    /// the spaces after it go with it, and the spaces before it too when nothing else follows on its line.
    /// </summary>
    private static List<(int Start, int End)> Removal(byte[] json, TaskIdProperty property)
    {
        var ranges = new List<(int Start, int End)>();
        var end = property.End;
        var next = SkipWhitespace(json, end);
        if (next < json.Length && json[next] == (byte)',')
        {
            end = next + 1;
        }
        else
        {
            var previous = SkipWhitespace(json, property.PreviousEnd);
            if (previous < property.Start && json[previous] == (byte)',')
                ranges.Add((previous, previous + 1));
        }

        if (WholeLines(json, property.Start, end) is { } lines)
        {
            ranges.Add(lines);
        }
        else
        {
            end = SkipSpaces(json, end);
            var endsLine = end == json.Length || json[end] is (byte)'\r' or (byte)'\n';
            ranges.Add((endsLine ? SkipSpacesBack(json, property.Start) : property.Start, end));
        }

        return ranges;
    }

    /// <summary>
    /// The lines from <paramref name="start"/> to <paramref name="end"/>, line break included, when only spaces share
    /// them; otherwise null.
    /// </summary>
    private static (int Start, int End)? WholeLines(byte[] json, int start, int end)
    {
        var lineStart = SkipSpacesBack(json, start);
        var lineEnd = end;
        while (lineEnd < json.Length && json[lineEnd] is (byte)' ' or (byte)'\t' or (byte)'\r')
            lineEnd++;
        var startsLine = lineStart == 0 || json[lineStart - 1] == (byte)'\n';
        return startsLine && lineEnd < json.Length && json[lineEnd] == (byte)'\n' ? (lineStart, lineEnd + 1) : null;
    }

    private static int SkipWhitespace(byte[] json, int position)
    {
        while (position < json.Length && json[position] is (byte)' ' or (byte)'\t' or (byte)'\r' or (byte)'\n')
            position++;
        return position;
    }

    private static int SkipSpaces(byte[] json, int position)
    {
        while (position < json.Length && json[position] is (byte)' ' or (byte)'\t')
            position++;
        return position;
    }

    private static int SkipSpacesBack(byte[] json, int position)
    {
        while (position > 0 && json[position - 1] is (byte)' ' or (byte)'\t')
            position--;
        return position;
    }

    /// <summary>The text of <paramref name="json"/> with the edits made</summary>
    private static string Apply(byte[] json, IEnumerable<Edit> edits)
    {
        var result = new List<byte>(json.Length + 64);
        var copied = 0;
        foreach (var edit in edits.OrderBy(edit => edit.Start).ThenBy(edit => edit.End))
        {
            result.AddRange(json.AsSpan(copied, edit.Start - copied));
            result.AddRange(edit.Replacement);
            copied = edit.End;
        }
        result.AddRange(json.AsSpan(copied));
        return Encoding.UTF8.GetString([.. result]);
    }

    private static bool IsProperty(string? name, string property) =>
        string.Equals(name, property, StringComparison.OrdinalIgnoreCase);

    private static string Ids(IEnumerable<Finding> findings) =>
        string.Join(", ", findings.Select(finding => $"'{finding.DataType.Id ?? "<unknown>"}'").Distinct());

    private static string IdsWithTask(IEnumerable<Finding> findings) =>
        string.Join(
            ", ",
            findings.Select(finding => $"'{finding.DataType.Id ?? "<unknown>"}' (taskId '{finding.Property.Value}')")
        );

    /// <summary>What happens to a <c>taskId</c>, in the order they are reported</summary>
    private enum Outcome
    {
        Replaced,
        RemovedListed,
        RemovedEmpty,
        RemovedNotListed,
        NotAString,
        TaskIdsNotAList,
        SeveralTaskIds,
    }

    private sealed record Finding(DataType DataType, TaskIdProperty Property, Outcome Outcome);

    private sealed record Edit(int Start, int End, byte[] Replacement);

    /// <param name="Start">The position of the name's opening quote</param>
    /// <param name="NameEnd">The position after the name's closing quote</param>
    /// <param name="ValueStart">The position of the value's first byte</param>
    /// <param name="End">The position after the value's last byte</param>
    /// <param name="PreviousEnd">
    /// The position after the value of the property before it, or after the brace that opens its object
    /// </param>
    /// <param name="Kind">The kind of the value's first token</param>
    /// <param name="Value">The value when it is a string</param>
    private sealed record TaskIdProperty(
        int Start,
        int NameEnd,
        int ValueStart,
        int End,
        int PreviousEnd,
        JsonTokenType Kind,
        string? Value
    );

    private sealed class DataType
    {
        public string? Id { get; set; }

        public List<TaskIdProperty> TaskIdProperties { get; } = [];

        /// <summary>Whether the data type has a <c>taskIds</c> property, whatever its value</summary>
        public bool HasTaskIds { get; set; }

        /// <summary>The strings in <c>taskIds</c>, or null when it is not a list</summary>
        public List<string>? ListedTasks { get; set; }
    }
}
