using System.Text.Json;
using System.Text.Json.Serialization;

namespace Altinn.App.Ai.Enrichment.Tools;

/// <summary>
/// OpenAI-compatible tool definition. Serialized into the chat-completions
/// request's <c>tools</c> array.
/// </summary>
public sealed record ToolDefinition
{
    public string Type { get; init; } = "function";
    public required ToolFunctionDefinition Function { get; init; }
}

public sealed record ToolFunctionDefinition
{
    public required string Name { get; init; }
    public required string Description { get; init; }

    /// <summary>JSON-schema describing the tool's parameters object.</summary>
    [JsonConverter(typeof(JsonElementConverter))]
    public required JsonElement Parameters { get; init; }
}

/// <summary>
/// Round-trips a JsonElement through System.Text.Json. Built-in serialization
/// already handles JsonElement, but providing a converter ensures the schema
/// is emitted verbatim regardless of the outer JsonSerializerOptions
/// (e.g. snake_case naming) applied to surrounding records.
/// </summary>
internal sealed class JsonElementConverter : JsonConverter<JsonElement>
{
    public override JsonElement Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        => JsonElement.ParseValue(ref reader);

    public override void Write(Utf8JsonWriter writer, JsonElement value, JsonSerializerOptions options)
        => value.WriteTo(writer);
}
