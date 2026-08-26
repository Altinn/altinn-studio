using Legacy = Altinn.Platform.Register.Models;
using LegacyEnums = Altinn.Platform.Register.Enums;

namespace LocalTest.Services.Register.Implementation;

/// <summary>
/// <see cref="Altinn.Platform.Profile.Models.UserProfile.Party"/> still targets the legacy
/// <see cref="Legacy.Party"/> type from Altinn.Platform.Models, since the Profile domain hasn't migrated to
/// Altinn.Register.Contracts. This maps the new party model down to that legacy shape at that one boundary.
/// </summary>
public static class LegacyPartyMapper
{
    public static Legacy.Party ToLegacyParty(this Altinn.Register.Contracts.V1.Party party) =>
        new()
        {
            PartyId = party.PartyId,
            PartyTypeName = (LegacyEnums.PartyType)(int)party.PartyTypeName,
            OrgNumber = party.OrgNumber,
            SSN = party.SSN,
            UnitType = party.UnitType,
            Name = party.Name,
            IsDeleted = party.IsDeleted,
            OnlyHierarchyElementWithNoAccess = party.OnlyHierarchyElementWithNoAccess,
            Person = party.Person is null ? null : ToLegacyPerson(party.Person),
            Organization = party.Organization is null ? null : ToLegacyOrganization(party.Organization),
            ChildParties = party.ChildParties?.Select(ToLegacyParty).ToList(),
        };

    private static Legacy.Person ToLegacyPerson(Altinn.Register.Contracts.V1.Person person) =>
        new()
        {
            SSN = person.SSN,
            Name = person.Name,
            FirstName = person.FirstName,
            MiddleName = person.MiddleName,
            LastName = person.LastName,
            TelephoneNumber = person.TelephoneNumber,
            MobileNumber = person.MobileNumber,
            MailingAddress = person.MailingAddress,
            MailingPostalCode = person.MailingPostalCode,
            MailingPostalCity = person.MailingPostalCity,
            AddressMunicipalNumber = person.AddressMunicipalNumber,
            AddressMunicipalName = person.AddressMunicipalName,
            AddressStreetName = person.AddressStreetName,
            AddressHouseNumber = person.AddressHouseNumber,
            AddressHouseLetter = person.AddressHouseLetter,
            AddressPostalCode = person.AddressPostalCode,
            AddressCity = person.AddressCity,
            DateOfDeath = person.DateOfDeath,
        };

    private static Legacy.Organization ToLegacyOrganization(Altinn.Register.Contracts.V1.Organization organization) =>
        new()
        {
            OrgNumber = organization.OrgNumber,
            Name = organization.Name,
            UnitType = organization.UnitType,
            TelephoneNumber = organization.TelephoneNumber,
            MobileNumber = organization.MobileNumber,
            FaxNumber = organization.FaxNumber,
            EMailAddress = organization.EMailAddress,
            InternetAddress = organization.InternetAddress,
            MailingAddress = organization.MailingAddress,
            MailingPostalCode = organization.MailingPostalCode,
            MailingPostalCity = organization.MailingPostalCity,
            BusinessAddress = organization.BusinessAddress,
            BusinessPostalCode = organization.BusinessPostalCode,
            BusinessPostalCity = organization.BusinessPostalCity,
            UnitStatus = organization.UnitStatus,
        };
}
