using System;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.Studio.Designer.Exceptions.Options;

namespace Altinn.Studio.Designer.Helpers.JsonConverterHelpers;

public class OptionValueConverter : JsonConverter<object>
{
    public override object Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        return reader.TokenType switch
        {
            JsonTokenType.String => reader.GetString(),
            JsonTokenType.Number when reader.TryGetDouble(out double d) => d,
            JsonTokenType.True => true,
            JsonTokenType.False => false,
            _ => throw new InvalidOptionsFormatException($"Unsupported JSON token for Value field, {typeToConvert}: {reader.TokenType}.")
        };
    }

    public override void Write(Utf8JsonWriter writer, object value, JsonSerializerOptions options)
    {
        switch (value)
        {
            case string s:
                writer.WriteStringValue(s);
                break;
            case double:
            case int:
            case long:
            case decimal:
                writer.WriteNumberValue(Convert.ToDouble(value));
                break;
            case bool b:
                writer.WriteBooleanValue(b);
                break;
            default:
                throw new InvalidOptionsFormatException($"{value} is an unsupported type for Value field. Accepted types are string, numbers and bool.");
        }
    }
}
