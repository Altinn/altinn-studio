using System.Linq;
using Altinn.Register.Contracts.V1;
using OldEnums = Altinn.Platform.Register.Enums;
using OldModels = Altinn.Platform.Register.Models;

namespace Altinn.App.Tests.Common.Auth;

/// <summary>
/// Test-only helper for building the legacy <see cref="OldModels.Party"/> that
/// <see cref="Altinn.Platform.Profile.Models.UserProfile.Party"/> still requires, from a
/// <see cref="Party"/> test fixture. Production code should never need this — see
/// <c>Altinn.App.Core.Helpers.PartyMappingExtensions</c> for the real (old → new) direction.
/// </summary>
public static class PartyTestMappingExtensions
{
    public static OldModels.Party ToLegacyParty(this Party party) =>
        new()
        {
            PartyId = party.PartyId,
            PartyUuid = party.PartyUuid,
            PartyTypeName = (OldEnums.PartyType)(int)party.PartyTypeName,
            OrgNumber = party.OrgNumber,
            SSN = party.SSN,
            UnitType = party.UnitType,
            Name = party.Name,
            IsDeleted = party.IsDeleted,
            OnlyHierarchyElementWithNoAccess = party.OnlyHierarchyElementWithNoAccess,
            Person = party.Person?.ToLegacyPerson(),
            Organization = party.Organization?.ToLegacyOrganization(),
            ChildParties = party.ChildParties?.Select(ToLegacyParty).ToList(),
        };

    private static OldModels.Person ToLegacyPerson(this Person person) =>
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

    private static OldModels.Organization ToLegacyOrganization(this Organization organization) =>
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
