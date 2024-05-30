using System.Text.Json;
using System.Text.Json.Serialization;

namespace Altinn.App.Core.Models.Validation;

/// <inheritdoc />
public class FrontendSeverityConverter : JsonConverter<ValidationIssueSeverity>
{
    /// <inheritdoc />
    public override ValidationIssueSeverity Read(
        ref Utf8JsonReader reader,
        Type typeToConvert,
        JsonSerializerOptions options
    )
    {
        if (reader.TokenType != JsonTokenType.String)
        {
            throw new JsonException();
        }

        return reader.GetString() switch
        {
            "error" => ValidationIssueSeverity.Error,
            "warning" => ValidationIssueSeverity.Warning,
            "info" => ValidationIssueSeverity.Informational,
            "success" => ValidationIssueSeverity.Success,
            _ => throw new JsonException(),
        };
    }

    /// <inheritdoc />
    public override void Write(Utf8JsonWriter writer, ValidationIssueSeverity value, JsonSerializerOptions options)
    {
        string output = value switch
        {
            ValidationIssueSeverity.Error => "error",
            ValidationIssueSeverity.Warning => "warning",
            ValidationIssueSeverity.Informational => "info",
            ValidationIssueSeverity.Success => "success",
            _ => throw new JsonException(),
        };

        JsonSerializer.Serialize(writer, output, options);
    }
}
