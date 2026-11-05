using System.Diagnostics.CodeAnalysis;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;

namespace Altinn.App.Api.Models;

/// <summary>
/// The kind of change a <see cref="JsonPatchOperation"/> makes.
/// </summary>
public enum JsonPatchOperationType
{
    /// <summary>Adds a value, inserts into an array, or replaces an existing member.</summary>
    Add,

    /// <summary>Removes the value at the path.</summary>
    Remove,

    /// <summary>Replaces the value at the path. The path must exist.</summary>
    Replace,

    /// <summary>Checks that the value at the path equals the given value. A failed test fails the whole patch.</summary>
    Test,
}

/// <summary>
/// One operation of a JSON Patch document as defined in
/// <a href="https://datatracker.ietf.org/doc/html/rfc6902">RFC 6902</a>.
/// A patch is an ordered list of operations, serialized as a JSON array.
/// </summary>
/// <remarks>
/// <para>
/// Instances are created by deserializing JSON, directly or through <see cref="ParseList"/>, which validates
/// that the operation has the members RFC 6902 requires and that pointers follow RFC 6901. Paths are JSON
/// Pointers, such as <c>/skjema/navn</c> or <c>/liste/0</c>, with <c>~1</c> for <c>/</c> and <c>~0</c> for
/// <c>~</c> in member names.
/// </para>
/// <para>
/// The <c>move</c> and <c>copy</c> operations of RFC 6902 are rejected. A <c>copy</c> can duplicate a subtree on
/// every operation, so a small patch can grow a document without bound, and <c>move</c> is <c>remove</c> followed
/// by <c>add</c>. Callers express both with <c>add</c> and <c>remove</c>.
/// </para>
/// </remarks>
[JsonConverter(typeof(JsonPatchOperationConverter))]
public sealed class JsonPatchOperation
{
    private JsonPatchOperation(JsonPatchOperationType op, string path, JsonNode? value)
    {
        Op = op;
        Path = path;
        Value = value;
    }

    /// <summary>
    /// The kind of operation.
    /// </summary>
    public JsonPatchOperationType Op { get; }

    /// <summary>
    /// JSON Pointer to the location the operation applies to.
    /// </summary>
    public string Path { get; }

    /// <summary>
    /// The value for <see cref="JsonPatchOperationType.Add"/>, <see cref="JsonPatchOperationType.Replace"/> and
    /// <see cref="JsonPatchOperationType.Test"/>, where <see langword="null"/> is the JSON value <c>null</c>.
    /// Always <see langword="null"/> for <see cref="JsonPatchOperationType.Remove"/>.
    /// </summary>
    public JsonNode? Value { get; }

    /// <summary>
    /// Parses a JSON Patch document, a JSON array of operations.
    /// </summary>
    /// <exception cref="JsonException">The text is not a JSON array of valid operations.</exception>
    public static List<JsonPatchOperation> ParseList([StringSyntax(StringSyntaxAttribute.Json)] string patch) =>
        JsonSerializer.Deserialize<List<JsonPatchOperation>>(patch)
        ?? throw new JsonException("A JSON Patch document must be an array of operations, not null");

    /// <summary>
    /// Checks that <paramref name="pointer"/> is a JSON Pointer as defined in RFC 6901: empty for the whole
    /// document, or a sequence of <c>/</c>-prefixed tokens where <c>~</c> is only used as <c>~0</c> or <c>~1</c>.
    /// </summary>
    internal static bool IsValidPointer(string pointer)
    {
        if (pointer.Length == 0)
        {
            return true;
        }

        if (pointer[0] != '/')
        {
            return false;
        }

        for (int i = 0; i < pointer.Length; i++)
        {
            if (pointer[i] == '~' && (i + 1 >= pointer.Length || (pointer[i + 1] != '0' && pointer[i + 1] != '1')))
            {
                return false;
            }
        }

        return true;
    }

    internal static JsonPatchOperation FromJson(string op, string? path, JsonNode? value, bool hasValue)
    {
        var type = op switch
        {
            "add" => JsonPatchOperationType.Add,
            "remove" => JsonPatchOperationType.Remove,
            "replace" => JsonPatchOperationType.Replace,
            "test" => JsonPatchOperationType.Test,
            "move" or "copy" => throw new JsonException(
                $"`{op}` operations are not supported; use `add` and `remove` instead"
            ),
            _ => throw new JsonException($"`{op}` is not a JSON Patch operation"),
        };

        if (path is null)
        {
            throw new JsonException($"`{op}` operation requires `path`");
        }

        if (!IsValidPointer(path))
        {
            throw new JsonException($"`path` of `{op}` operation is not a valid JSON Pointer: `{path}`");
        }

        if (type is JsonPatchOperationType.Remove)
        {
            return new JsonPatchOperation(type, path, null);
        }

        if (!hasValue)
        {
            throw new JsonException($"`{op}` operation requires `value`");
        }

        return new JsonPatchOperation(type, path, value);
    }

    internal string OpName =>
        Op switch
        {
            JsonPatchOperationType.Add => "add",
            JsonPatchOperationType.Remove => "remove",
            JsonPatchOperationType.Replace => "replace",
            JsonPatchOperationType.Test => "test",
            _ => throw new InvalidOperationException($"Unknown operation type {Op}"),
        };
}

/// <summary>
/// Reads and writes a <see cref="JsonPatchOperation"/> in the RFC 6902 object form, with the members <c>op</c>,
/// <c>path</c> and <c>value</c>. Members that do not belong to the operation are ignored when reading and left
/// out when writing.
/// </summary>
internal sealed class JsonPatchOperationConverter : JsonConverter<JsonPatchOperation>
{
    public override JsonPatchOperation Read(
        ref Utf8JsonReader reader,
        Type typeToConvert,
        JsonSerializerOptions options
    )
    {
        if (reader.TokenType != JsonTokenType.StartObject)
        {
            throw new JsonException("A JSON Patch operation must be an object");
        }

        string? op = null;
        string? path = null;
        JsonNode? value = null;
        bool hasValue = false;

        while (reader.Read() && reader.TokenType != JsonTokenType.EndObject)
        {
            if (reader.TokenType != JsonTokenType.PropertyName)
            {
                throw new JsonException();
            }

            string member = reader.GetString() ?? throw new JsonException();
            reader.Read();
            switch (member)
            {
                case "op":
                    op = ReadString(ref reader, member);
                    break;
                case "path":
                    path = ReadString(ref reader, member);
                    break;
                case "value":
                    value = JsonNode.Parse(ref reader);
                    hasValue = true;
                    break;
                default:
                    reader.Skip();
                    break;
            }
        }

        if (op is null)
        {
            throw new JsonException("A JSON Patch operation requires `op`");
        }

        return JsonPatchOperation.FromJson(op, path, value, hasValue);
    }

    private static string ReadString(ref Utf8JsonReader reader, string member)
    {
        if (reader.TokenType != JsonTokenType.String)
        {
            throw new JsonException($"`{member}` of a JSON Patch operation must be a string");
        }

        return reader.GetString() ?? throw new JsonException();
    }

    public override void Write(Utf8JsonWriter writer, JsonPatchOperation value, JsonSerializerOptions options)
    {
        writer.WriteStartObject();
        writer.WriteString("op", value.OpName);
        writer.WriteString("path", value.Path);
        if (value.Op is not JsonPatchOperationType.Remove)
        {
            writer.WritePropertyName("value");
            if (value.Value is null)
            {
                writer.WriteNullValue();
            }
            else
            {
                value.Value.WriteTo(writer, options);
            }
        }

        writer.WriteEndObject();
    }
}
