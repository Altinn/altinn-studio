using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features.Correspondence.Extensions;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// Represents either an organisation or a person.
/// </summary>
[JsonConverter(typeof(OrganisationOrPersonIdentifierJsonConverter))]
public abstract record OrganisationOrPersonIdentifier
{
    private const string OrgUrnPrefix = $"{AltinnUrns.OrganisationNumber}:";
    private const string PersonUrnPrefix = $"{AltinnUrns.PersonId}:";

    /// <summary>
    /// Returns a string representation of the identifier, prefixed with the appropriate <see cref="AltinnUrns"/> URN value
    /// </summary>
    public abstract string ToUrnFormattedString();

    /// <summary>
    /// Represents an organisation.
    /// </summary>
    /// <param name="Value">The organisation number</param>
    public sealed record Organisation(OrganisationNumber Value) : OrganisationOrPersonIdentifier
    {
        /// <inheritdoc cref="OrganisationNumber.ToString"/>
        public override string ToString()
        {
            return Value.ToString();
        }

        /// <summary>
        /// Returns a string representation of the <see cref="OrganisationNumber"/>, prefixed with the <see cref="AltinnUrns.OrganisationNumber"/> URN value
        /// </summary>
        public override string ToUrnFormattedString()
        {
            return Value.ToUrnFormattedString();
        }
    }

    /// <summary>
    /// Represents a person.
    /// </summary>
    /// <param name="Value">The national identity number</param>
    public sealed record Person(NationalIdentityNumber Value) : OrganisationOrPersonIdentifier
    {
        /// <inheritdoc cref="NationalIdentityNumber.ToString"/>
        public override string ToString()
        {
            return Value.ToString();
        }

        /// <summary>
        /// Returns a string representation of the <see cref="NationalIdentityNumber"/>, prefixed with the <see cref="AltinnUrns.PersonId"/> URN value
        /// </summary>
        public override string ToUrnFormattedString()
        {
            return Value.ToUrnFormattedString();
        }
    }

    /// <summary>
    /// Creates a new instance of <see cref="OrganisationOrPersonIdentifier.Organisation"/>.
    /// </summary>
    /// <param name="value">The organisation number</param>
    public static Organisation Create(OrganisationNumber value)
    {
        return new Organisation(value);
    }

    /// <summary>
    /// Creates a new instance of <see cref="OrganisationOrPersonIdentifier.Person"/>.
    /// </summary>
    /// <param name="value">The national identity number</param>
    public static Person Create(NationalIdentityNumber value)
    {
        return new Person(value);
    }

    /// <summary>
    /// Attempts to parse a string containing either an <see cref="OrganisationNumber"/> or a <see cref="NationalIdentityNumber"/>.
    /// </summary>
    /// <param name="value">The string to parse</param>
    /// <exception cref="FormatException">The supplied string is not a valid format for either type</exception>
    public static OrganisationOrPersonIdentifier Parse(string value)
    {
        // Value has come in padded with urn:altinn:organization:identifier-no
        if (value.StartsWith(OrgUrnPrefix, StringComparison.OrdinalIgnoreCase))
        {
            return Create(OrganisationNumber.Parse(value[OrgUrnPrefix.Length..]));
        }

        // Value has come in padded with urn:altinn:person:identifier-no
        if (value.StartsWith(PersonUrnPrefix, StringComparison.OrdinalIgnoreCase))
        {
            return Create(NationalIdentityNumber.Parse(value[PersonUrnPrefix.Length..]));
        }

        // Value could be anything, trying OrganisationNumber
        if (OrganisationNumber.TryParse(value, out var organisationNumber))
        {
            return Create(organisationNumber);
        }

        // Last chance, trying NationalIdentityNumber
        if (NationalIdentityNumber.TryParse(value, out var nationalIdentityNumber))
        {
            return Create(nationalIdentityNumber);
        }

        throw new FormatException(
            $"OrganisationOrPersonIdentifier value `{value}` is not a valid organisation number nor a national identity number"
        );
    }
}

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
