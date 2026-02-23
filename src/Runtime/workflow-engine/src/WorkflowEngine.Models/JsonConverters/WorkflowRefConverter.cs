using System.Text.Json;
using System.Text.Json.Serialization;

namespace WorkflowEngine.Models.JsonConverters;

internal sealed class WorkflowRefConverter : JsonConverter<WorkflowRef>
{
    public override WorkflowRef Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) =>
        reader.TokenType switch
        {
            JsonTokenType.String => ReadStringAndVerify(ref reader),
            JsonTokenType.Number => ReadLongAndVerify(ref reader),
            _ => throw new JsonException(
                $"Expected a string (batch ref) or integer (database ID), got {reader.TokenType}."
            ),
        };

    public override void Write(Utf8JsonWriter writer, WorkflowRef value, JsonSerializerOptions options)
    {
        if (value.IsRef)
            writer.WriteStringValue(value.Ref);
        else
            writer.WriteNumberValue(value.Id);
    }

    private static string ReadStringAndVerify(ref Utf8JsonReader reader)
    {
        string? value = reader.GetString();
        if (string.IsNullOrWhiteSpace(value))
            throw new JsonException($"Expected non-empty string value, but got `{value}`");

        return value;
    }

    private static long ReadLongAndVerify(ref Utf8JsonReader reader)
    {
        long value = reader.GetInt64();
        if (value <= 0)
            throw new JsonException($"Expected positive long value, but got `{value}`");

        return value;
    }
}
