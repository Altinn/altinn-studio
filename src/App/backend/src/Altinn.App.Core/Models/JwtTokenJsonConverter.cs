using System.Text.Json;
using System.Text.Json.Serialization;

namespace Altinn.App.Core.Models;

/// <summary>
/// Json converter to transform between <see cref="string"/> and <see cref="JwtToken"/>.
/// </summary>
internal class JwtTokenJsonConverter : JsonConverter<JwtToken>
{
    /// <inheritdoc/>
    public override JwtToken Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType != JsonTokenType.String)
        {
            throw new JsonException("Expected string token for AccessToken property.");
        }

        var tokenValue = reader.GetString() ?? throw new JsonException("AccessToken string value is null.");
        return JwtToken.Parse(tokenValue);
    }

    /// <inheritdoc/>
    public override void Write(Utf8JsonWriter writer, JwtToken value, JsonSerializerOptions options)
    {
        writer.WriteStringValue(value);
    }
}
