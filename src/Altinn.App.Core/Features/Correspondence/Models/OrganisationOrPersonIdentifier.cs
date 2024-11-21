using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// Represents either an organisation or a person
/// </summary>
[OrganisationOrPersonIdentifierJsonConverter(OrganisationNumberFormat.International)]
public abstract record OrganisationOrPersonIdentifier
{
    /// <summary>
    /// Represents an organisation
    /// </summary>
    /// <param name="Value">The organisation number</param>
    public sealed record Organisation(OrganisationNumber Value) : OrganisationOrPersonIdentifier
    {
        /// <inheritdoc cref="OrganisationNumber.ToString"/>
        public override string ToString()
        {
            return Value.ToString();
        }
    }

    /// <summary>
    /// Represents a person
    /// </summary>
    /// <param name="Value">The national identity number</param>
    public sealed record Person(NationalIdentityNumber Value) : OrganisationOrPersonIdentifier
    {
        /// <inheritdoc cref="NationalIdentityNumber.ToString"/>
        public override string ToString()
        {
            return Value.ToString();
        }
    }

    /// <summary>
    /// Creates a new instance of <see cref="OrganisationOrPersonIdentifier.Organisation"/>
    /// </summary>
    /// <param name="value">The organisation number</param>
    public static Organisation Create(OrganisationNumber value)
    {
        return new Organisation(value);
    }

    /// <summary>
    /// Creates a new instance of <see cref="OrganisationOrPersonIdentifier.Person"/>
    /// </summary>
    /// <param name="value">The national identity number</param>
    public static Person Create(NationalIdentityNumber value)
    {
        return new Person(value);
    }

    /// <summary>
    /// Attempts to parse a string containing either an <see cref="OrganisationNumber"/> or a <see cref="NationalIdentityNumber"/>
    /// </summary>
    /// <param name="value">The string to parse</param>
    /// <exception cref="FormatException">The supplied string is not a valid format for either type</exception>
    public static OrganisationOrPersonIdentifier Parse(string value)
    {
        if (OrganisationNumber.TryParse(value, out var organisationNumber))
        {
            return Create(organisationNumber);
        }

        if (NationalIdentityNumber.TryParse(value, out var nationalIdentityNumber))
        {
            return Create(nationalIdentityNumber);
        }

        throw new FormatException(
            $"OrganisationOrPersonIdentifier value `{value}` is not a valid organisation number nor a national identity number"
        );
    }
}

/// <summary>
/// Json converter to transform between <see cref="string"/> and <see cref="OrganisationOrPersonIdentifier"/>
/// </summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Class, AllowMultiple = false)]
internal class OrganisationOrPersonIdentifierJsonConverterAttribute : JsonConverterAttribute
{
    private OrganisationNumberFormat _format { get; }

    /// <inheritdoc cref="OrganisationOrPersonIdentifierJsonConverterAttribute"/>
    /// <param name="format">The desired organisation number format to use for <b>serialization</b></param>
    public OrganisationOrPersonIdentifierJsonConverterAttribute(OrganisationNumberFormat format)
    {
        _format = format;
    }

    /// <inheritdoc/>
    public override JsonConverter? CreateConverter(Type typeToConvert)
    {
        return new OrganisationOrPersonJsonIdentifierConverter(_format);
    }
}

internal class OrganisationOrPersonJsonIdentifierConverter : JsonConverter<OrganisationOrPersonIdentifier>
{
    private OrganisationNumberFormat _format { get; init; }

    public OrganisationOrPersonJsonIdentifierConverter(OrganisationNumberFormat format)
    {
        _format = format;
    }

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
        string stringValue = value switch
        {
            OrganisationOrPersonIdentifier.Organisation org => org.Value.Get(_format),
            OrganisationOrPersonIdentifier.Person person => person.Value,
            _ => throw new JsonException($"Unknown type `{value.GetType()}` ({nameof(value)})"),
        };

        writer.WriteStringValue(stringValue);
    }
}
