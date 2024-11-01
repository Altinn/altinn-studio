using System;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Helpers.JsonConverterHelpers;

public class OptionConverter : JsonConverter<object>
{
    public override object Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        // Handle JSON token type to convert to either string, bool, or double
        return reader.TokenType switch
        {
            JsonTokenType.String => reader.GetString(),
            JsonTokenType.Number when reader.TryGetDouble(out double d) => d,
            JsonTokenType.True => true,
            JsonTokenType.False => false,
            _ => throw new JsonException($"Unsupported JSON token for Option.Value: {reader.TokenType}")
        };
    }

    public override void Write(Utf8JsonWriter writer, object value, JsonSerializerOptions options)
    {
        // Serialize based on the type of the object
        switch (value)
        {
            case string s:
                writer.WriteStringValue(s);
                break;
            case double d:
                writer.WriteNumberValue(d);
                break;
            case bool b:
                writer.WriteBooleanValue(b);
                break;
            default:
                throw new JsonException("Unsupported type for Option.Value.");
        }
    }
}
