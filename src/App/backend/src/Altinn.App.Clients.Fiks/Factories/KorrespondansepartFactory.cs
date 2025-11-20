using Altinn.App.Clients.Fiks.Extensions;
using KS.Fiks.Arkiv.Models.V1.Arkivering.Arkivmelding;
using KS.Fiks.Arkiv.Models.V1.Kodelister;
using KS.Fiks.Arkiv.Models.V1.Metadatakatalog;

namespace Altinn.App.Clients.Fiks.Factories;

internal static class KorrespondansepartFactory
{
    /// <summary>
    /// Creates a Korrespondansepart of type Avsender (Sender).
    /// </summary>
    /// <remarks>
    /// <c>partyName</c> and <c>partyId</c> are nullable only for caller convenience.
    /// Null or empty values for these parameters will result in a FiksArkivException.
    /// </remarks>
    public static Korrespondansepart CreateSender(
        string? partyId,
        string? partyName,
        string? personId = null,
        string? organizationId = null,
        string? reference = null
    )
    {
        var party = new Korrespondansepart()
        {
            Korrespondanseparttype = new Korrespondanseparttype
            {
                KodeProperty = KorrespondanseparttypeKoder.Avsender.Verdi,
                Beskrivelse = KorrespondanseparttypeKoder.Avsender.Beskrivelse,
            },
            KorrespondansepartID = partyId.EnsureNotNullOrEmpty("FiksArkiv->Sender.ID"),
            KorrespondansepartNavn = partyName.EnsureNotNullOrEmpty("FiksArkiv->Sender.Name"),
            DeresReferanse = reference.EnsureNotEmpty("FiksArkiv->Sender.Reference"),
        };

        if (!string.IsNullOrEmpty(personId))
            party.Personid = personId;
        else if (!string.IsNullOrEmpty(organizationId))
            party.Organisasjonid = organizationId;

        return party;
    }

    /// <summary>
    /// Creates a Korrespondansepart of type InternAvsender (Internal Sender).
    /// </summary>
    public static Korrespondansepart CreateInternalSender(string partyId, string partyName) =>
        new()
        {
            Korrespondanseparttype = new Korrespondanseparttype
            {
                KodeProperty = KorrespondanseparttypeKoder.InternAvsender.Verdi,
                Beskrivelse = KorrespondanseparttypeKoder.InternAvsender.Beskrivelse,
            },
            KorrespondansepartNavn = partyName.EnsureNotNullOrEmpty("FiksArkiv->InternalSender.Name"),
            KorrespondansepartID = partyId.EnsureNotNullOrEmpty("FiksArkiv->InternalSender.ID"),
        };

    /// <summary>
    /// Creates a Korrespondansepart of type Mottaker (Recipient).
    /// </summary>
    /// <remarks>
    /// <c>partyName</c> and <c>partyId</c> are nullable only for caller convenience.
    /// Null or empty values for these parameters will result in a FiksArkivException.
    /// </remarks>
    public static Korrespondansepart CreateRecipient(
        string? partyId,
        string? partyName,
        string? organizationId = null,
        string? reference = null
    ) =>
        new()
        {
            Korrespondanseparttype = new Korrespondanseparttype
            {
                KodeProperty = KorrespondanseparttypeKoder.Mottaker.Verdi,
                Beskrivelse = KorrespondanseparttypeKoder.Mottaker.Beskrivelse,
            },
            KorrespondansepartID = partyId.EnsureNotNullOrEmpty("FiksArkiv->Recipient.ID"),
            KorrespondansepartNavn = partyName.EnsureNotNullOrEmpty("FiksArkiv->Recipient.Name"),
            Organisasjonid = organizationId.EnsureNotEmpty("FiksArkiv->Recipient.OrganizationId"),
            DeresReferanse = reference.EnsureNotEmpty("FiksArkiv->Recipient.Reference"),
        };
}
