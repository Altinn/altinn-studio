using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Constants;

namespace Altinn.App.Core.Models;

/// <summary>
/// Json converter to transform between <see cref="string"/> and <see cref="OrganisationNumber"/>.
/// </summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Class, AllowMultiple = false)]
internal class OrganisationNumberJsonConverterAttribute : JsonConverterAttribute
{
    private OrganisationNumberFormat _format { get; init; }

    /// <inheritdoc cref="OrganisationNumberJsonConverterAttribute"/>
    /// <param name="format">The desired organisation number format to use for <b>serialization</b></param>
    public OrganisationNumberJsonConverterAttribute(OrganisationNumberFormat format)
    {
        _format = format;
    }

    /// <inheritdoc/>
    public override JsonConverter? CreateConverter(Type typeToConvert)
    {
        return new OrganisationNumberJsonConverter(_format);
    }
}

internal class OrganisationNumberJsonConverter : JsonConverter<OrganisationNumber>
{
    private OrganisationNumberFormat _format { get; init; }
    private const string OrgUrnPrefix = $"{AltinnUrns.OrganisationNumber}:";

    public OrganisationNumberJsonConverter(OrganisationNumberFormat format)
    {
        _format = format;
    }

    public override OrganisationNumber Read(
        ref Utf8JsonReader reader,
        Type typeToConvert,
        JsonSerializerOptions options
    )
    {
        if (reader.TokenType != JsonTokenType.String)
        {
            throw new JsonException("Expected string token for OrganisationNumber property.");
        }

        var tokenValue = reader.GetString() ?? throw new JsonException("OrganisationNumber string value is null.");

        // Trim the urn:altinn:organization:identifier-no prefix if present
        if (tokenValue.StartsWith(OrgUrnPrefix, StringComparison.OrdinalIgnoreCase))
        {
            tokenValue = tokenValue[OrgUrnPrefix.Length..];
        }

        return OrganisationNumber.Parse(tokenValue);
    }

    public override void Write(Utf8JsonWriter writer, OrganisationNumber value, JsonSerializerOptions options)
    {
        writer.WriteStringValue(value.Get(_format));
    }
}
