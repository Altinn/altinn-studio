using System.Globalization;
using Altinn.App.Clients.Fiks.Constants;
using Altinn.App.Clients.Fiks.Extensions;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Models;
using Altinn.Platform.Profile.Models;
using KS.Fiks.Arkiv.Models.V1.Arkivering.Arkivmelding;

namespace Altinn.App.Clients.Fiks.Factories;

internal static class KlassifikasjonFactory
{
    /// <summary>
    /// Creates a classification for an end user.
    /// </summary>
    public static async Task<Klassifikasjon> CreateUser(Authenticated.User user)
    {
        UserProfile userProfile = await user.LookupProfile();

        return !string.IsNullOrWhiteSpace(userProfile.Party.SSN)
            ? new Klassifikasjon
            {
                KlassifikasjonssystemID = FiksArkivConstants.ClassificationId.NationalIdentityNumber,
                KlasseID = userProfile
                    .Party.SSN.ToString(CultureInfo.InvariantCulture)
                    .EnsureNotNullOrEmpty("Classification.Id"),
                Tittel = userProfile.Party.Name.EnsureNotEmpty("Classification.Title"),
            }
            : new Klassifikasjon
            {
                KlassifikasjonssystemID = FiksArkivConstants.ClassificationId.AltinnUserId,
                KlasseID = user.UserId.ToString(CultureInfo.InvariantCulture).EnsureNotNullOrEmpty("Classification.Id"),
                Tittel = user.Username.EnsureNotEmpty("Classification.Title"),
            };
    }

    /// <summary>
    /// Creates a classification for a system user.
    /// </summary>
    public static Klassifikasjon CreateSystemUser(Authenticated.SystemUser systemUser) =>
        new()
        {
            KlassifikasjonssystemID = FiksArkivConstants.ClassificationId.SystemUserId,
            KlasseID = systemUser.SystemUserId[0].ToString().EnsureNotNullOrEmpty("Classification.Id"),
            Tittel = systemUser
                .SystemUserOrgNr.Get(OrganisationNumberFormat.Local)
                .EnsureNotEmpty("Classification.Title"),
        };

    /// <summary>
    /// Creates a classification for a service owner.
    /// </summary>
    public static Klassifikasjon CreateServiceOwner(Authenticated.ServiceOwner serviceOwner) =>
        new()
        {
            KlassifikasjonssystemID = FiksArkivConstants.ClassificationId.OrganizationNumber,
            KlasseID = serviceOwner.OrgNo.EnsureNotNullOrEmpty("Classification.Id"),
            Tittel = serviceOwner.Name.EnsureNotEmpty("Classification.Title"),
        };

    /// <summary>
    /// Creates a classification for an organization.
    /// </summary>
    public static Klassifikasjon CreateOrganization(Authenticated.Org org) =>
        new()
        {
            KlassifikasjonssystemID = FiksArkivConstants.ClassificationId.OrganizationNumber,
            KlasseID = org.OrgNo.EnsureNotNullOrEmpty("Classification.Id"),
        };
}
