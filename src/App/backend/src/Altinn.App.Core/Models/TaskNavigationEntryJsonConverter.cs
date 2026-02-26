using System.Text.Json;
using System.Text.Json.Serialization;

namespace Altinn.App.Core.Models;

/// <summary>
/// JSON converter for TaskNavigationEntry that determines the concrete type based on the presence of the "type" property.
/// </summary>
public class TaskNavigationEntryJsonConverter : JsonConverter<TaskNavigationEntry>
{
    /// <inheritdoc />
    public override TaskNavigationEntry? Read(
        ref Utf8JsonReader reader,
        Type typeToConvert,
        JsonSerializerOptions options
    )
    {
        if (reader.TokenType == JsonTokenType.Null)
        {
            return null;
        }

        // Parse the JSON into a document to inspect it
        using var document = JsonDocument.ParseValue(ref reader);
        var root = document.RootElement;

        // Determine which type to deserialize based on presence of "type" property
        bool hasType = root.TryGetProperty("type", out var navigationType);

        return hasType && navigationType.GetString() == "receipt"
            ? root.Deserialize<NavigationReceipt>(options)
            : root.Deserialize<NavigationTask>(options);
    }

    /// <inheritdoc />
    public override void Write(Utf8JsonWriter writer, TaskNavigationEntry value, JsonSerializerOptions options)
    {
        // Serialize using the concrete runtime type to avoid infinite recursion
        JsonSerializer.Serialize(writer, value, value.GetType(), options);
    }
}
