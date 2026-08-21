using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Constants;

namespace Altinn.App.Core.Models;

/// <summary>
/// Json converter to transform between <see cref="string"/> and <see cref="OrganizationNumber"/>.
/// </summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Class, AllowMultiple = false)]
internal class OrganizationNumberJsonConverterAttribute : JsonConverterAttribute
{
    private OrganizationNumberFormat _format { get; init; }

    /// <inheritdoc cref="OrganizationNumberJsonConverterAttribute"/>
    /// <param name="format">The desired organization number format to use for <b>serialization</b></param>
    public OrganizationNumberJsonConverterAttribute(OrganizationNumberFormat format)
    {
        _format = format;
    }

    /// <inheritdoc/>
    public override JsonConverter? CreateConverter(Type typeToConvert)
    {
        return new OrganizationNumberJsonConverter(_format);
    }
}

internal class OrganizationNumberJsonConverter : JsonConverter<OrganizationNumber>
{
    private OrganizationNumberFormat _format { get; init; }
    private const string OrgUrnPrefix = $"{AltinnUrns.OrganizationNumber}:";

    public OrganizationNumberJsonConverter(OrganizationNumberFormat format)
    {
        _format = format;
    }

    public override OrganizationNumber Read(
        ref Utf8JsonReader reader,
        Type typeToConvert,
        JsonSerializerOptions options
    )
    {
        if (reader.TokenType != JsonTokenType.String)
        {
            throw new JsonException("Expected string token for OrganizationNumber property.");
        }

        var tokenValue = reader.GetString() ?? throw new JsonException("OrganizationNumber string value is null.");

        // Trim the urn:altinn:organization:identifier-no prefix if present
        if (tokenValue.StartsWith(OrgUrnPrefix, StringComparison.OrdinalIgnoreCase))
        {
            tokenValue = tokenValue[OrgUrnPrefix.Length..];
        }

        return OrganizationNumber.Parse(tokenValue);
    }

    public override void Write(Utf8JsonWriter writer, OrganizationNumber value, JsonSerializerOptions options)
    {
        writer.WriteStringValue(value.Get(_format));
    }
}
