using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.KnownScenarios;

/// <summary>
/// applicationmetadata.json, read as the app reads it: comments and trailing commas allowed, property names matched
/// ignoring case. A file with duplicate properties is not edited. Edits replace spans of the text, which keeps the
/// rest of it.
/// </summary>
internal sealed class ApplicationMetadataText
{
    public const string RelativePath = "config/applicationmetadata.json";

    private static readonly JsonDocumentOptions _documentOptions = new()
    {
        CommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
        AllowDuplicateProperties = false,
    };

    private static readonly JsonReaderOptions _readerOptions = new()
    {
        CommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    private readonly string _file;
    private readonly byte[] _json;
    private readonly string _dataTypesName;
    private readonly JsonArray _dataTypes;

    private ApplicationMetadataText(string file, string text, string dataTypesName, JsonArray dataTypes)
    {
        _file = file;
        _json = Encoding.UTF8.GetBytes(text);
        _dataTypesName = dataTypesName;
        _dataTypes = dataTypes;
    }

    /// <summary>The app's applicationmetadata.json, or <c>null</c> when it cannot be read or has no <c>dataTypes</c>.</summary>
    /// <param name="projectFolder">The folder of the app's project file, which holds <c>config/</c>.</param>
    public static ApplicationMetadataText? Read(string projectFolder)
    {
        var file = Path.Combine(projectFolder, RelativePath);
        try
        {
            var text = Utf8TextFile.Decode(File.ReadAllBytes(file)).Text;
            return
                JsonNode.Parse(text, documentOptions: _documentOptions) is JsonObject root
                && Single(root, "dataTypes") is { Value: JsonArray dataTypes } property
                ? new ApplicationMetadataText(file, text, property.Key, dataTypes)
                : null;
        }
        catch (Exception ex)
            when (ex is IOException or UnauthorizedAccessException or DecoderFallbackException or JsonException)
        {
            return null;
        }
    }

    /// <summary>The one data type with id <paramref name="id"/> and its position in <c>dataTypes</c>.</summary>
    public (JsonObject DataType, int Index)? DataType(string id) =>
        _dataTypes
            .Select(static (node, index) => (Node: node as JsonObject, Index: index))
            .Where(item =>
                item.Node is { } dataType
                && Single(dataType, "id") is { Value: JsonValue value }
                && value.TryGetValue(out string? text)
                && text == id
            )
            .ToList()
            is [{ Node: { } only, Index: var position }]
            ? (only, position)
            : null;

    /// <summary>
    /// The byte positions in the file of a property of the data type at <paramref name="index"/>, at
    /// <paramref name="path"/> below it, each name as the file spells it: the start and end of its name, quotes
    /// included, and of its value.
    /// </summary>
    public (int NameStart, int NameEnd, int ValueStart, int ValueEnd) Locate(int index, params string[] path)
    {
        var reader = new Utf8JsonReader(_json, _readerOptions);
        string? rootProperty = null;
        var position = -1;
        var depth = 0;
        while (reader.Read())
        {
            switch (reader.TokenType, reader.CurrentDepth)
            {
                case (JsonTokenType.PropertyName, 1):
                    rootProperty = reader.GetString();
                    break;
                case (_, 2) when rootProperty == _dataTypesName && reader.TokenType != JsonTokenType.EndArray:
                    position++;
                    if (position != index)
                    {
                        reader.Skip();
                    }

                    break;
                case (JsonTokenType.PropertyName, var current)
                    when current == depth + 3
                        && rootProperty == _dataTypesName
                        && position == index
                        && reader.GetString() == path[depth]:
                    var nameStart = (int)reader.TokenStartIndex;
                    var nameEnd = nameStart + reader.ValueSpan.Length + 2;
                    reader.Read();
                    if (++depth < path.Length)
                    {
                        break;
                    }

                    var valueStart = (int)reader.TokenStartIndex;
                    reader.Skip();
                    return (nameStart, nameEnd, valueStart, (int)reader.BytesConsumed);
                case (_, > 2) when rootProperty == _dataTypesName && position == index:
                    reader.Skip();
                    break;
            }
        }

        throw new InvalidOperationException($"{string.Join('.', path)} of data type {index} is not in the file.");
    }

    /// <summary>Writes the file with each span replaced.</summary>
    public void Write(IEnumerable<(int Start, int End, string Replacement)> edits)
    {
        var edited = new List<byte>(_json.Length + 64);
        var copied = 0;
        foreach (var (start, end, replacement) in edits.OrderBy(static edit => edit.Start))
        {
            edited.AddRange(_json.AsSpan(copied, start - copied));
            edited.AddRange(Encoding.UTF8.GetBytes(replacement));
            copied = end;
        }

        edited.AddRange(_json.AsSpan(copied));
        Utf8TextFile.Overwrite(_file, Encoding.UTF8.GetString([.. edited]));
    }

    public static IEnumerable<KeyValuePair<string, JsonNode?>> Named(JsonObject node, string name) =>
        node.Where(property => string.Equals(property.Key, name, StringComparison.OrdinalIgnoreCase));

    public static KeyValuePair<string, JsonNode?>? Single(JsonObject node, string name) =>
        Named(node, name).ToList() is [var only] ? only : null;
}
