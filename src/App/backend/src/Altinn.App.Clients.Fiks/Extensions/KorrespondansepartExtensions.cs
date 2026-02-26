using KS.Fiks.Arkiv.Models.V1.Arkivering.Arkivmelding;

namespace Altinn.App.Clients.Fiks.Extensions;

internal static class KorrespondansepartExtensions
{
    /// <summary>
    /// Adds contact information to a correspondence party. Perform null, empty, and duplication checks.
    /// </summary>
    public static void AddContactInfo(
        this Korrespondansepart correspondenceParty,
        string? phoneNumber,
        string? mobileNumber,
        string? address,
        string? postcode,
        string? city
    )
    {
        var uniquePhoneNumbers = new[] { phoneNumber, mobileNumber }.Where(x => !string.IsNullOrEmpty(x)).ToHashSet();
        foreach (var number in uniquePhoneNumbers)
        {
            correspondenceParty.Telefonnummer.Add(number);
        }

        if (!string.IsNullOrEmpty(address) && !string.IsNullOrEmpty(postcode) && !string.IsNullOrEmpty(city))
        {
            correspondenceParty.Postadresse.Add(address);
            correspondenceParty.Postnummer = postcode;
            correspondenceParty.Poststed = city;
        }
    }
}
