using System.Text.Json.Serialization;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Extensions;
using Altinn.Platform.Register.Models;

namespace Altinn.App.Core.Models;

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
    /// <param name="Value">The <see cref="OrganisationNumber"/></param>
    public sealed record Organisation(OrganisationNumber Value) : OrganisationOrPersonIdentifier
    {
        /// <inheritdoc cref="OrganisationNumber.ToString"/>
        public override string ToString() => Value.ToString();

        /// <summary>
        /// Returns a string representation of the <see cref="OrganisationNumber"/>, prefixed with the <see cref="AltinnUrns.OrganisationNumber"/> URN value
        /// </summary>
        public override string ToUrnFormattedString() => Value.ToUrnFormattedString();

        /// <summary>
        /// Returns the underlying <see cref="OrganisationNumber"/> object.
        /// </summary>
        public OrganisationNumber ToOrganisationNumber() => Value;

        /// <summary>
        /// Returns the underlying <see cref="OrganisationNumber"/> object.
        /// </summary>
        public static implicit operator OrganisationNumber(Organisation org) => org.ToOrganisationNumber();
    }

    /// <summary>
    /// Represents a person.
    /// </summary>
    /// <param name="Value">The <see cref="NationalIdentityNumber"/></param>
    public sealed record Person(NationalIdentityNumber Value) : OrganisationOrPersonIdentifier
    {
        /// <inheritdoc cref="NationalIdentityNumber.ToString"/>
        public override string ToString() => Value.ToString();

        /// <summary>
        /// Returns a string representation of the <see cref="NationalIdentityNumber"/>, prefixed with the <see cref="AltinnUrns.PersonId"/> URN value
        /// </summary>
        public override string ToUrnFormattedString() => Value.ToUrnFormattedString();

        /// <summary>
        /// Returns the underlying <see cref="NationalIdentityNumber"/> object.
        /// </summary>
        public NationalIdentityNumber ToNationalIdentityNumber() => Value;

        /// <summary>
        /// Returns the underlying <see cref="NationalIdentityNumber"/> object.
        /// </summary>
        public static implicit operator NationalIdentityNumber(Person person) => person.ToNationalIdentityNumber();
    }

    /// <summary>
    /// Creates a new instance of <see cref="Organisation"/>.
    /// </summary>
    /// <param name="value">The organisation number</param>
    public static Organisation Create(OrganisationNumber value)
    {
        return new Organisation(value);
    }

    /// <summary>
    /// Creates a new instance of <see cref="Person"/>.
    /// </summary>
    /// <param name="value">The national identity number</param>
    public static Person Create(NationalIdentityNumber value)
    {
        return new Person(value);
    }

    /// <summary>
    /// Attempts to create a new instance of <see cref="OrganisationOrPersonIdentifier"/> based on a <see cref="Party"/>'s <see cref="Party.OrgNumber"/> or <see cref="Party.SSN"/>.
    /// </summary>
    /// <param name="party">The party to reference</param>
    /// <exception cref="FormatException">The supplied <see cref="Party"/> object does not contain a valid <see cref="Party.OrgNumber"/> nor <see cref="Party.SSN"/></exception>
    public static OrganisationOrPersonIdentifier Parse(Party party)
    {
        string value = !string.IsNullOrWhiteSpace(party.OrgNumber) ? party.OrgNumber : party.SSN;
        return Parse(value);
    }

    /// <summary>
    /// Attempts to parse a string containing either an <see cref="OrganisationNumber"/> or a <see cref="NationalIdentityNumber"/>.
    /// </summary>
    /// <param name="value">The string to parse</param>
    /// <exception cref="FormatException">The supplied string is not a valid format for either type</exception>
    public static OrganisationOrPersonIdentifier Parse(string value)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(value, nameof(value));

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

    /// <summary>
    /// Determines if a given <see cref="OrganisationOrPersonIdentifier"/> is equal to an <see cref="OrganisationNumber"/>.
    /// </summary>
    public static bool operator ==(OrganisationNumber left, OrganisationOrPersonIdentifier right) =>
        right is Organisation organisation && left == organisation.Value;

    /// <summary>
    /// Determines if a given <see cref="OrganisationOrPersonIdentifier"/> is not equal to an <see cref="OrganisationNumber"/>.
    /// </summary>
    public static bool operator !=(OrganisationNumber left, OrganisationOrPersonIdentifier right) => !(left == right);

    /// <summary>
    /// Determines if a given <see cref="OrganisationOrPersonIdentifier"/> is equal to an <see cref="OrganisationNumber"/>.
    /// </summary>
    public static bool operator ==(OrganisationOrPersonIdentifier left, OrganisationNumber right) =>
        left is Organisation organisation && right == organisation.Value;

    /// <summary>
    /// Determines if a given <see cref="OrganisationOrPersonIdentifier"/> is not equal to an <see cref="OrganisationNumber"/>.
    /// </summary>
    public static bool operator !=(OrganisationOrPersonIdentifier left, OrganisationNumber right) => !(left == right);

    /// <summary>
    /// Determines if a given <see cref="OrganisationOrPersonIdentifier"/> is equal to an <see cref="NationalIdentityNumber"/>.
    /// </summary>
    public static bool operator ==(NationalIdentityNumber left, OrganisationOrPersonIdentifier right) =>
        right is Person person && left == person.Value;

    /// <summary>
    /// Determines if a given <see cref="OrganisationOrPersonIdentifier"/> is not equal to an <see cref="NationalIdentityNumber"/>.
    /// </summary>
    public static bool operator !=(NationalIdentityNumber left, OrganisationOrPersonIdentifier right) =>
        !(left == right);

    /// <summary>
    /// Determines if a given <see cref="OrganisationOrPersonIdentifier"/> is equal to an <see cref="NationalIdentityNumber"/>.
    /// </summary>
    public static bool operator ==(OrganisationOrPersonIdentifier left, NationalIdentityNumber right) =>
        left is Person person && right == person.Value;

    /// <summary>
    /// Determines if a given <see cref="OrganisationOrPersonIdentifier"/> is not equal to an <see cref="NationalIdentityNumber"/>.
    /// </summary>
    public static bool operator !=(OrganisationOrPersonIdentifier left, NationalIdentityNumber right) =>
        !(left == right);

    /// <summary>
    /// Creates a new instance of <see cref="Organisation"/> from the given <see cref="OrganisationNumber"/>.
    /// </summary>
    public static implicit operator OrganisationOrPersonIdentifier(OrganisationNumber org) => Create(org);

    /// <summary>
    /// Creates a new instance of <see cref="Person"/> from the given <see cref="NationalIdentityNumber"/>.
    /// </summary>
    public static implicit operator OrganisationOrPersonIdentifier(NationalIdentityNumber person) => Create(person);
}
