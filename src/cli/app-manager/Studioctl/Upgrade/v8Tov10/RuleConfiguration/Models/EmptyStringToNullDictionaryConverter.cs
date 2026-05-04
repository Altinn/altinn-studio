using System.Text.Json;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration.Models;

/// <summary>
/// Custom JSON converter that treats empty strings as null for Dictionary properties
/// </summary>
public class EmptyStringToNullDictionaryConverter : JsonConverter<Dictionary<string, string>?>
{
    public override Dictionary<string, string>? Read(
        ref Utf8JsonReader reader,
        Type typeToConvert,
        JsonSerializerOptions options
    )
    {
        if (reader.TokenType == JsonTokenType.Null)
        {
            return null;
        }

        if (reader.TokenType == JsonTokenType.String)
        {
            var stringValue = reader.GetString();
            // Treat empty string as null/empty dictionary
            return string.IsNullOrEmpty(stringValue)
                ? new Dictionary<string, string>()
                : throw new JsonException($"Cannot convert string value '{stringValue}' to Dictionary<string, string>");
        }

        return reader.TokenType == JsonTokenType.StartObject
            ? JsonSerializer.Deserialize<Dictionary<string, string>>(ref reader, options)
            : throw new JsonException($"Unexpected token type: {reader.TokenType}");
    }

    public override void Write(Utf8JsonWriter writer, Dictionary<string, string>? value, JsonSerializerOptions options)
    {
        if (value == null)
        {
            writer.WriteNullValue();
        }
        else
        {
            JsonSerializer.Serialize(writer, value, options);
        }
    }
}
