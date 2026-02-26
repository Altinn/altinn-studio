using Altinn.App.Clients.Fiks.Constants;
using Altinn.App.Clients.Fiks.FiksIO.Models;
using KS.Fiks.Arkiv.Models.V1.Arkivering.Arkivmelding;

namespace Altinn.App.Clients.Fiks.Extensions;

internal static class ArkivmeldingExtensions
{
    /// <summary>
    /// Converts an archive record to a Fiks IO message payload.
    /// </summary>
    public static FiksIOMessagePayload ToPayload(this Arkivmelding archiveRecord, bool indentedXml = false) =>
        new(FiksArkivConstants.Filenames.ArchiveRecord, archiveRecord.SerializeXml(indent: indentedXml));
}
