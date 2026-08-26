using Altinn.Register.Contracts.V1;

namespace Altinn.App.Core.Helpers;

/// <summary>
/// Maps the legacy <see cref="Altinn.Platform.Register.Models.Party"/> type — still returned by
/// <see cref="Altinn.Platform.Profile.Models.UserProfile"/> from the Profile package — to the
/// <see cref="Party"/> type from Altinn.Register.Contracts used everywhere else in the App SDK.
/// </summary>
internal static class PartyMappingExtensions
{
    internal static Party? ToRegisterContractsParty(this Altinn.Platform.Register.Models.Party? party)
    {
        if (party is null)
        {
            return null;
        }

        return new Party
        {
            PartyId = party.PartyId,
            PartyUuid = party.PartyUuid,
            PartyTypeName = (PartyType)(int)party.PartyTypeName,
            OrgNumber = party.OrgNumber,
            SSN = party.SSN,
            UnitType = party.UnitType,
            Name = party.Name,
            IsDeleted = party.IsDeleted,
            OnlyHierarchyElementWithNoAccess = party.OnlyHierarchyElementWithNoAccess,
            Person = party.Person?.ToRegisterContractsPerson(),
            Organization = party.Organization?.ToRegisterContractsOrganization(),
            ChildParties = party.ChildParties?.Select(cp => cp.ToRegisterContractsParty()).OfType<Party>().ToList(),
        };
    }

    private static Person ToRegisterContractsPerson(this Altinn.Platform.Register.Models.Person person) =>
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

    private static Organization ToRegisterContractsOrganization(
        this Altinn.Platform.Register.Models.Organization organization
    ) =>
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
