using System.Text.Json;
using System.Text.Json.Serialization;

namespace WorkflowEngine.Models.JsonConverters;

internal sealed class WorkflowRefConverter : JsonConverter<WorkflowRef>
{
    public override WorkflowRef Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) =>
        reader.TokenType switch
        {
            JsonTokenType.String => ReadStringAndClassify(ref reader),
            _ => throw new JsonException($"Expected a string (batch ref or UUID database ID), got {reader.TokenType}."),
        };

    public override void Write(Utf8JsonWriter writer, WorkflowRef value, JsonSerializerOptions options)
    {
        if (value.IsRef)
            writer.WriteStringValue(value.Ref);
        else
            writer.WriteStringValue(value.Id.ToString());
    }

    private static WorkflowRef ReadStringAndClassify(ref Utf8JsonReader reader)
    {
        string? value = reader.GetString();
        if (string.IsNullOrWhiteSpace(value))
            throw new JsonException($"Expected non-empty string value, but got `{value}`");

        // If it parses as a GUID, treat it as a database ID; otherwise treat as a batch ref
        if (Guid.TryParse(value, out var guid))
            return WorkflowRef.FromDatabaseId(guid);

        return WorkflowRef.FromRefString(value);
    }
}
