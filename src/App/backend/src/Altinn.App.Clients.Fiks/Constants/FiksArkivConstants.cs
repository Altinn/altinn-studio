using KS.Fiks.Arkiv.Models.V1.Meldingstyper;

namespace Altinn.App.Clients.Fiks.Constants;

/// <summary>
/// Constants related to Fiks Arkiv.
/// </summary>
public static class FiksArkivConstants
{
    internal const string AltinnSystemId = "Altinn Studio";
    internal const string AltinnOrgNo = "991825827";

    /// <summary>
    /// Known filenames used in Fiks Arkiv messages.
    /// </summary>
    public static class Filenames
    {
        /// <summary>
        /// The name of the Fiks Arkiv record document
        /// (as per <see href="https://developers.fiks.ks.no/tjenester/fiksprotokoll/protokoll-arkiv/#meldinger">Fiks Protokoll specifications</see>).
        /// </summary>
        public const string ArchiveRecord = "arkivmelding.xml";
    }

    /// <summary>
    /// Known Fiks Arkiv message types.
    /// </summary>
    public static class MessageTypes
    {
        /// <summary>
        /// Indicates a request to create a new archive record.
        /// </summary>
        public const string CreateArchiveRecord = FiksArkivMeldingtype.ArkivmeldingOpprett;

        /// <summary>
        /// Indicates a receipt for the creation of an archive record.
        /// </summary>
        public const string ArchiveRecordCreationReceipt = FiksArkivMeldingtype.ArkivmeldingOpprettKvittering;
    }

    internal static class ClassificationId
    {
        public const string NationalIdentityNumber = "Fødselsnummer";
        public const string OrganizationNumber = "Organisasjonsnummer";
        public const string AltinnUserId = "AltinnBrukerId";
        public const string SystemUserId = "SystembrukerId";
    }
}
