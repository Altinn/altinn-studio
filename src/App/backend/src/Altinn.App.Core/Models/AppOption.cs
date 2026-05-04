using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Altinn.App.Core.Models;

/// <summary>
/// Represents a key value pair to be used as options in dropdown selectors.
/// </summary>
[JsonConverter(typeof(AppOptionConverter))]
public class AppOption
{
    /// <summary>
    /// The value of a given option
    /// </summary>
    [JsonPropertyName("value")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public required string? Value { get; set; }

    /// <summary>
    /// The type of the value for Json serialization
    /// </summary>
    [JsonIgnore]
    public AppOptionValueType ValueType { get; set; }

    /// <summary>
    /// The label of a given option
    /// </summary>
    [JsonPropertyName("label")]
    public required string Label { get; set; }

    /// <summary>
    /// The description of a given option
    /// </summary>
    [JsonPropertyName("description")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Description { get; set; }

    /// <summary>
    /// The help text of a given option
    /// </summary>
    [JsonPropertyName("helpText")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? HelpText { get; set; }

    /// <summary>
    /// Tags used for grouping. Derived from combining tagNames and tags arrays found in published library code lists.
    /// For example, tagNames ["region"] paired with tags ["europe"] produces: <c>"tags": {"region": "europe"}</c>
    /// </summary>
    [JsonPropertyName("tags")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public Dictionary<string, string>? Tags { get; set; }
}

/// <summary>
/// The type of the value for Json serialization
/// Application developers must set this, if they want options that isn't strings.
/// </summary>
public enum AppOptionValueType
{
    /// <summary>
    /// Default value, will be serialized as a string if not specified
    /// </summary>
    String,

    /// <summary>
    /// The app option value is a number and can be bound to a numeric field
    /// </summary>
    Number,

    /// <summary>
    /// The app option value is a boolean and can be bound to a boolean field
    /// </summary>
    Boolean,

    /// <summary>
    /// The app option value is null and can be used to signal that the option is not set
    /// </summary>
    Null,
}

/// <summary>
/// A converter for AppOption that can handle the different value types
/// This will override [JsonPropertyName] annotatinos, but I keep them for documentation purposes
/// </summary>
internal class AppOptionConverter : JsonConverter<AppOption>
{
    public override AppOption Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        string? value = null;
        string? label = null;
        string? description = null;
        string? helpText = null;
        Dictionary<string, string>? tags = null;
        AppOptionValueType valueType = AppOptionValueType.Null;

        while (reader.Read() && reader.TokenType != JsonTokenType.EndObject)
        {
            if (reader.TokenType == JsonTokenType.PropertyName)
            {
                var propertyName = reader.GetString();
                reader.Read();
                switch (propertyName?.ToLowerInvariant())
                {
                    case "value":
                        ReadValue(ref reader, out value, out valueType);
                        break;
                    case "label":
                        label = reader.GetString();
                        break;
                    case "description":
                        description = reader.GetString();
                        break;
                    case "helptext":
                        helpText = reader.GetString();
                        break;
                    case "tags":
                        tags = JsonSerializer.Deserialize<Dictionary<string, string>>(ref reader, options);
                        break;
                    default:
                        throw new JsonException($"Unknown property {propertyName ?? "'NULL'"} on AppOption");
                }
            }
        }

        return new AppOption
        {
            Value = value,
            ValueType = valueType,
            Label = label ?? throw new JsonException("Missing required property 'label' on AppOption"),
            Description = description,
            HelpText = helpText,
            Tags = tags,
        };
    }

    private static void ReadValue(ref Utf8JsonReader reader, out string? value, out AppOptionValueType valueType)
    {
        switch (reader.TokenType)
        {
            case JsonTokenType.String:
                value = reader.GetString();
                valueType = AppOptionValueType.String;
                break;
            case JsonTokenType.Number:
                value = reader.GetDouble().ToString(CultureInfo.InvariantCulture);
                valueType = AppOptionValueType.Number;
                break;
            case JsonTokenType.True:
            case JsonTokenType.False:
                value = reader.GetBoolean() ? "true" : "false";
                valueType = AppOptionValueType.Boolean;
                break;
            case JsonTokenType.Null:
                value = null;
                valueType = AppOptionValueType.Null;
                break;
            default:
                throw new JsonException($"Unexpected token type {reader.TokenType} for property 'value' on AppOption");
        }
    }

    public override void Write(Utf8JsonWriter writer, AppOption value, JsonSerializerOptions options)
    {
        writer.WriteStartObject();
        switch (value.ValueType)
        {
            case AppOptionValueType.String:
                writer.WriteString("value", value.Value);
                break;
            case AppOptionValueType.Boolean:
                writer.WriteBoolean(
                    "value",
                    value.Value switch
                    {
                        "true" => true,
                        "false" => false,
                        _ => throw new JsonException($"Unable to parse value {value.Value} as a boolean on AppOption"),
                    }
                );
                break;
            case AppOptionValueType.Number:
                if (double.TryParse(value.Value, out double doubleValue))
                {
                    writer.WriteNumber("value", doubleValue);
                }
                else
                {
                    throw new JsonException($"Unable to parse value {value.Value} as a number on AppOption");
                }

                break;
            case AppOptionValueType.Null:
                writer.WriteNull("value");
                break;
            default:
                throw new JsonException($"Unknown value type {value.ValueType} on AppOption");
        }

        writer.WriteString("label", value.Label);

        if (!string.IsNullOrEmpty(value.Description))
        {
            writer.WriteString("description", value.Description);
        }
        if (!string.IsNullOrEmpty(value.HelpText))
        {
            writer.WriteString("helpText", value.HelpText);
        }

        if (value.Tags != null)
        {
            writer.WritePropertyName("tags");
            JsonSerializer.Serialize(writer, value.Tags, options);
        }
        writer.WriteEndObject();
    }
}
