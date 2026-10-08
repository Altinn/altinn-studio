using System.Buffers;
using System.Text.Json;

namespace Altinn.Studio.AppConfig.Parsers;

internal static class JsonRead
{
    private static readonly JsonDocumentOptions _appFileOptions = new()
    {
        AllowTrailingCommas = true,
        CommentHandling = JsonCommentHandling.Skip,
    };

    private static readonly JsonDocumentOptions _uniqueKeyOptions = _appFileOptions with
    {
        AllowDuplicateProperties = false,
    };

    public static JsonDocument ParseAppFile(byte[] data) => ParseAppFile(data, out _);

    public static JsonDocument ParseAppFile(byte[] data, out bool hasDuplicateKeys)
    {
        try
        {
            hasDuplicateKeys = false;
            return JsonDocument.Parse(data, _uniqueKeyOptions);
        }
        catch (JsonException)
        {
            hasDuplicateKeys = true;
        }

        using var withDuplicateKeys = JsonDocument.Parse(data, _appFileOptions);
        var buffer = new ArrayBufferWriter<byte>(data.Length);
        using (var writer = new Utf8JsonWriter(buffer))
            WriteLastValues(writer, withDuplicateKeys.RootElement);
        return JsonDocument.Parse(buffer.WrittenMemory);
    }

    private static void WriteLastValues(Utf8JsonWriter writer, JsonElement element)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                var properties = element.EnumerateObject().ToList();
                var last = new Dictionary<string, int>(StringComparer.Ordinal);
                for (var i = 0; i < properties.Count; i++)
                    last[properties[i].Name] = i;
                writer.WriteStartObject();
                for (var i = 0; i < properties.Count; i++)
                {
                    if (last[properties[i].Name] != i)
                        continue;
                    writer.WritePropertyName(properties[i].Name);
                    WriteLastValues(writer, properties[i].Value);
                }
                writer.WriteEndObject();
                break;
            case JsonValueKind.Array:
                writer.WriteStartArray();
                foreach (var item in element.EnumerateArray())
                    WriteLastValues(writer, item);
                writer.WriteEndArray();
                break;
            default:
                element.WriteTo(writer);
                break;
        }
    }

    public static string? TryString(JsonElement el, string name) =>
        el.TryGetProperty(name, out var p) && p.ValueKind == JsonValueKind.String ? p.GetString() : null;

    public static bool LooksLikeTextKey(string? v)
    {
        if (string.IsNullOrEmpty(v) || v.Length > 128 || !v.Contains('.', StringComparison.Ordinal))
            return false;
        foreach (var ch in v)
            if (ch is ' ' or '\t' or '\n' or '\r' or '<' or '>' or '@' or ':' or '/' or '+')
                return false;
        return true;
    }
}
