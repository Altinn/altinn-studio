using System.Text.Json;
using System.Text.Json.Serialization;

namespace Altinn.App.Core.Models;

internal class OrganizationOrPersonIdentifierJsonConverter : JsonConverter<OrganizationOrPersonIdentifier>
{
    /// <inheritdoc/>
    public override OrganizationOrPersonIdentifier Read(
        ref Utf8JsonReader reader,
        Type typeToConvert,
        JsonSerializerOptions options
    )
    {
        if (reader.TokenType != JsonTokenType.String)
        {
            throw new JsonException("Expected string token for OrganizationOrPersonIdentifier property.");
        }

        var tokenValue =
            reader.GetString() ?? throw new JsonException("OrganizationOrPersonIdentifier string value is null.");

        return OrganizationOrPersonIdentifier.Parse(tokenValue);
    }

    /// <inheritdoc/>
    public override void Write(
        Utf8JsonWriter writer,
        OrganizationOrPersonIdentifier value,
        JsonSerializerOptions options
    )
    {
        writer.WriteStringValue(value.ToUrnFormattedString());
    }
}
