using Altinn.App.Clients.Fiks.Constants;
using Altinn.App.Clients.Fiks.Extensions;
using KS.Fiks.Arkiv.Models.V1.Arkivering.Arkivmelding;

namespace Altinn.App.Clients.Fiks.Factories;

/// <summary>
/// Builds the case file classifications the library resolves itself. Both describe the instance owner as
/// recorded on the instance; the title is the party's registered name when the register knows it.
/// </summary>
internal static class KlassifikasjonFactory
{
    public static Klassifikasjon CreatePerson(string nationalIdentityNumber, string? name) =>
        new()
        {
            KlassifikasjonssystemID = FiksArkivConstants.ClassificationId.NationalIdentityNumber,
            KlasseID = nationalIdentityNumber.EnsureNotNullOrEmpty("Classification.Id"),
            Tittel = name.EnsureNotEmpty("Classification.Title"),
        };

    public static Klassifikasjon CreateOrganization(string organizationNumber, string? name) =>
        new()
        {
            KlassifikasjonssystemID = FiksArkivConstants.ClassificationId.OrganizationNumber,
            KlasseID = organizationNumber.EnsureNotNullOrEmpty("Classification.Id"),
            Tittel = name.EnsureNotEmpty("Classification.Title"),
        };
}
