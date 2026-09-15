using Altinn.App.Clients.Fiks.Extensions;
using Altinn.App.Clients.Fiks.FiksIO.Models;
using KS.Fiks.Arkiv.Models.V1.Metadatakatalog;
using Kode = KS.Fiks.Arkiv.Models.V1.Kodelister.Kode;

namespace Altinn.App.Clients.Fiks.FiksArkiv.Models;

internal sealed record MessagePayloadWrapper(
    FiksIOMessagePayload Payload,
    Kode FileTypeCode,
    FiksArkivCode? FileFormat,
    FiksArkivCode? FileVariant
)
{
    public Format GetFileFormat() =>
        FileFormat?.ToExternal<Format>() ?? new Format { KodeProperty = Payload.GetDotlessFileExtension() };

    public Variantformat? GetFileVariant() => FileVariant?.ToExternal<Variantformat>();
}
