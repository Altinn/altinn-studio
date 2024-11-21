using System.Text.Json;
using System.Text.Json.Serialization;

namespace Altinn.App.Core.Models;

/// <summary>
/// Json converter to transform between <see cref="string"/> and <see cref="OrganisationNumber"/>
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

        var numberValue = reader.GetString() ?? throw new JsonException("OrganisationNumber string value is null.");
        return OrganisationNumber.Parse(numberValue);
    }

    public override void Write(Utf8JsonWriter writer, OrganisationNumber value, JsonSerializerOptions options)
    {
        writer.WriteStringValue(value.Get(_format));
    }
}
