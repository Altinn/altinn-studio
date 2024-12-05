using System.Text.Json;
using System.Text.Json.Serialization;

namespace Altinn.App.Core.Models;

/// <summary>
/// Json converter to transform between <see cref="string"/> and <see cref="LanguageCode{TLangCodeStandard}"/>.
/// </summary>
internal class LanguageCodeJsonConverter<T> : JsonConverter<LanguageCode<T>>
    where T : struct, ILanguageCodeStandard
{
    /// <inheritdoc/>
    public override LanguageCode<T> Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType != JsonTokenType.String)
        {
            throw new JsonException("Expected string token for LanguageCode property.");
        }

        var tokenValue = reader.GetString() ?? throw new JsonException("LanguageCode string value is null.");
        return LanguageCode<T>.Parse(tokenValue);
    }

    /// <inheritdoc/>
    public override void Write(Utf8JsonWriter writer, LanguageCode<T> value, JsonSerializerOptions options)
    {
        writer.WriteStringValue(value);
    }
}
