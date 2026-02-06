using System.Text.Json;
using System.Text.Json.Serialization;

namespace WorkflowEngine.Resilience.JsonConverters;

/// <summary>
/// Generic JSON converter for enums that supports both string and numeric values.
/// </summary>
/// <typeparam name="TEnum">The enum type to convert</typeparam>
public class FlexibleEnumConverter<TEnum> : JsonConverter<TEnum>
    where TEnum : struct, Enum
{
    public override TEnum Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        return reader.TokenType switch
        {
            JsonTokenType.String => ParseStringValue(reader.GetString()),
            JsonTokenType.Number => ParseNumericValue(reader.GetInt32()),
            _ => throw new JsonException($"Unable to convert {reader.TokenType} to {typeof(TEnum).Name}"),
        };
    }

    public override void Write(Utf8JsonWriter writer, TEnum value, JsonSerializerOptions options)
    {
        // Write as string by default for better readability
        writer.WriteStringValue(value.ToString());
    }

    private static TEnum ParseStringValue(string? value)
    {
        if (string.IsNullOrEmpty(value))
            throw new JsonException($"{typeof(TEnum).Name} value cannot be null or empty");

        if (Enum.TryParse<TEnum>(value, ignoreCase: true, out var result))
            return result;

        throw new JsonException($"'{value}' is not a valid {typeof(TEnum).Name}");
    }

    private static TEnum ParseNumericValue(int value)
    {
        if (Enum.IsDefined(typeof(TEnum), value))
            return (TEnum)(object)value;

        throw new JsonException($"{value} is not a valid {typeof(TEnum).Name} numeric value");
    }
}
