using System.Text.Json.Serialization;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Extensions;

namespace Altinn.App.Core.Models;

/// <summary>
/// Represents either an organization or a person.
/// </summary>
[JsonConverter(typeof(OrganizationOrPersonIdentifierJsonConverter))]
public abstract record OrganizationOrPersonIdentifier
{
    private const string OrgUrnPrefix = $"{AltinnUrns.OrganizationNumber}:";
    private const string PersonUrnPrefix = $"{AltinnUrns.PersonId}:";

    /// <summary>
    /// Returns a string representation of the identifier, prefixed with the appropriate <see cref="AltinnUrns"/> URN value
    /// </summary>
    public abstract string ToUrnFormattedString();

    /// <summary>
    /// Represents an organization.
    /// </summary>
    /// <param name="Value">The <see cref="OrganizationNumber"/></param>
    public sealed record Organization(OrganizationNumber Value) : OrganizationOrPersonIdentifier
    {
        /// <inheritdoc cref="OrganizationNumber.ToString"/>
        public override string ToString() => Value.ToString();

        /// <summary>
        /// Returns a string representation of the <see cref="OrganizationNumber"/>, prefixed with the <see cref="AltinnUrns.OrganizationNumber"/> URN value
        /// </summary>
        public override string ToUrnFormattedString() => Value.ToUrnFormattedString();

        /// <summary>
        /// Returns the underlying <see cref="OrganizationNumber"/> object.
        /// </summary>
        public OrganizationNumber ToOrganizationNumber() => Value;

        /// <summary>
        /// Returns the underlying <see cref="OrganizationNumber"/> object.
        /// </summary>
        public static implicit operator OrganizationNumber(Organization org) => org.ToOrganizationNumber();
    }

    /// <summary>
    /// Represents a person.
    /// </summary>
    /// <param name="Value">The <see cref="NationalIdentityNumber"/></param>
    public sealed record Person(NationalIdentityNumber Value) : OrganizationOrPersonIdentifier
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
    /// Creates a new instance of <see cref="Organization"/>.
    /// </summary>
    /// <param name="value">The organization number</param>
    public static Organization Create(OrganizationNumber value)
    {
        return new Organization(value);
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
    /// Attempts to create a new instance of <see cref="OrganizationOrPersonIdentifier"/> based on a <see cref="Party"/>'s <see cref="Party.OrgNumber"/> or <see cref="Party.SSN"/>.
    /// </summary>
    /// <param name="party">The party to reference</param>
    /// <exception cref="FormatException">The supplied <see cref="Party"/> object does not contain a valid <see cref="Party.OrgNumber"/> nor <see cref="Party.SSN"/></exception>
    public static OrganizationOrPersonIdentifier Parse(Party party)
    {
        string? value = !string.IsNullOrWhiteSpace(party.OrgNumber) ? party.OrgNumber : party.SSN;
        if (value is null)
        {
            throw new FormatException($"Party {party.PartyId} does not contain a valid OrgNumber nor SSN");
        }
        return Parse(value);
    }

    /// <summary>
    /// Attempts to parse a string containing either an <see cref="OrganizationNumber"/> or a <see cref="NationalIdentityNumber"/>.
    /// </summary>
    /// <param name="value">The string to parse</param>
    /// <exception cref="FormatException">The supplied string is not a valid format for either type</exception>
    public static OrganizationOrPersonIdentifier Parse(string value)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(value, nameof(value));

        // Value has come in padded with urn:altinn:organization:identifier-no
        if (value.StartsWith(OrgUrnPrefix, StringComparison.OrdinalIgnoreCase))
        {
            return Create(OrganizationNumber.Parse(value[OrgUrnPrefix.Length..]));
        }

        // Value has come in padded with urn:altinn:person:identifier-no
        if (value.StartsWith(PersonUrnPrefix, StringComparison.OrdinalIgnoreCase))
        {
            return Create(NationalIdentityNumber.Parse(value[PersonUrnPrefix.Length..]));
        }

        // Value could be anything, trying OrganizationNumber
        if (OrganizationNumber.TryParse(value, out var organizationNumber))
        {
            return Create(organizationNumber);
        }

        // Last chance, trying NationalIdentityNumber
        if (NationalIdentityNumber.TryParse(value, out var nationalIdentityNumber))
        {
            return Create(nationalIdentityNumber);
        }

        throw new FormatException(
            $"OrganizationOrPersonIdentifier value `{value}` is not a valid organization number nor a national identity number"
        );
    }

    /// <summary>
    /// Determines if a given <see cref="OrganizationOrPersonIdentifier"/> is equal to an <see cref="OrganizationNumber"/>.
    /// </summary>
    public static bool operator ==(OrganizationNumber left, OrganizationOrPersonIdentifier right) =>
        right is Organization organization && left == organization.Value;

    /// <summary>
    /// Determines if a given <see cref="OrganizationOrPersonIdentifier"/> is not equal to an <see cref="OrganizationNumber"/>.
    /// </summary>
    public static bool operator !=(OrganizationNumber left, OrganizationOrPersonIdentifier right) => !(left == right);

    /// <summary>
    /// Determines if a given <see cref="OrganizationOrPersonIdentifier"/> is equal to an <see cref="OrganizationNumber"/>.
    /// </summary>
    public static bool operator ==(OrganizationOrPersonIdentifier left, OrganizationNumber right) =>
        left is Organization organization && right == organization.Value;

    /// <summary>
    /// Determines if a given <see cref="OrganizationOrPersonIdentifier"/> is not equal to an <see cref="OrganizationNumber"/>.
    /// </summary>
    public static bool operator !=(OrganizationOrPersonIdentifier left, OrganizationNumber right) => !(left == right);

    /// <summary>
    /// Determines if a given <see cref="OrganizationOrPersonIdentifier"/> is equal to an <see cref="NationalIdentityNumber"/>.
    /// </summary>
    public static bool operator ==(NationalIdentityNumber left, OrganizationOrPersonIdentifier right) =>
        right is Person person && left == person.Value;

    /// <summary>
    /// Determines if a given <see cref="OrganizationOrPersonIdentifier"/> is not equal to an <see cref="NationalIdentityNumber"/>.
    /// </summary>
    public static bool operator !=(NationalIdentityNumber left, OrganizationOrPersonIdentifier right) =>
        !(left == right);

    /// <summary>
    /// Determines if a given <see cref="OrganizationOrPersonIdentifier"/> is equal to an <see cref="NationalIdentityNumber"/>.
    /// </summary>
    public static bool operator ==(OrganizationOrPersonIdentifier left, NationalIdentityNumber right) =>
        left is Person person && right == person.Value;

    /// <summary>
    /// Determines if a given <see cref="OrganizationOrPersonIdentifier"/> is not equal to an <see cref="NationalIdentityNumber"/>.
    /// </summary>
    public static bool operator !=(OrganizationOrPersonIdentifier left, NationalIdentityNumber right) =>
        !(left == right);

    /// <summary>
    /// Creates a new instance of <see cref="Organization"/> from the given <see cref="OrganizationNumber"/>.
    /// </summary>
    public static implicit operator OrganizationOrPersonIdentifier(OrganizationNumber org) => Create(org);

    /// <summary>
    /// Creates a new instance of <see cref="Person"/> from the given <see cref="NationalIdentityNumber"/>.
    /// </summary>
    public static implicit operator OrganizationOrPersonIdentifier(NationalIdentityNumber person) => Create(person);
}
