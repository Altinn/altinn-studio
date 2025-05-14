using System.Text.Json;
using System.Text.Json.Serialization;

namespace Altinn.App.Core.Models;

internal class OrganisationOrPersonIdentifierJsonConverter : JsonConverter<OrganisationOrPersonIdentifier>
{
    /// <inheritdoc/>
    public override OrganisationOrPersonIdentifier Read(
        ref Utf8JsonReader reader,
        Type typeToConvert,
        JsonSerializerOptions options
    )
    {
        if (reader.TokenType != JsonTokenType.String)
        {
            throw new JsonException("Expected string token for OrganisationOrPersonIdentifier property.");
        }

        var tokenValue =
            reader.GetString() ?? throw new JsonException("OrganisationOrPersonIdentifier string value is null.");

        return OrganisationOrPersonIdentifier.Parse(tokenValue);
    }

    /// <inheritdoc/>
    public override void Write(
        Utf8JsonWriter writer,
        OrganisationOrPersonIdentifier value,
        JsonSerializerOptions options
    )
    {
        writer.WriteStringValue(value.ToUrnFormattedString());
    }
}
