using System.Text.Json;
using System.Text.Json.Serialization;

namespace Altinn.App.Core.Models;

/// <summary>
/// Json converter to transform between <see cref="string"/> and <see cref="NationalIdentityNumber"/>.
/// </summary>
internal class NationalIdentityNumberJsonConverter : JsonConverter<NationalIdentityNumber>
{
    /// <inheritdoc/>
    public override NationalIdentityNumber Read(
        ref Utf8JsonReader reader,
        Type typeToConvert,
        JsonSerializerOptions options
    )
    {
        if (reader.TokenType != JsonTokenType.String)
        {
            throw new JsonException("Expected string token for NationalIdentityNumber property.");
        }

        var tokenValue = reader.GetString() ?? throw new JsonException("NationalIdentityNumber string value is null.");
        return NationalIdentityNumber.Parse(tokenValue);
    }

    /// <inheritdoc/>
    public override void Write(Utf8JsonWriter writer, NationalIdentityNumber value, JsonSerializerOptions options)
    {
        writer.WriteStringValue(value);
    }
}
