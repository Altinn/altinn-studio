using Altinn.App.Clients.Fiks.FiksIO.Models;
using KS.Fiks.Arkiv.Models.V1.Kodelister;

namespace Altinn.App.Clients.Fiks.FiksArkiv.Models;

internal sealed record MessagePayloadWrapper(FiksIOMessagePayload Payload, Kode FileTypeCode);
