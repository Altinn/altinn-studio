using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using KS.Fiks.Arkiv.Models.V1.Arkivering.Arkivmelding;

namespace Altinn.App.Clients.Fiks.Extensions;

internal static class FiksArkivClassificationExtensions
{
    public static Klassifikasjon ToKlassifikasjon(this FiksArkivClassification classification) =>
        new()
        {
            KlassifikasjonssystemID = classification.SystemId,
            KlasseID = classification.ClassificationId,
            Tittel = classification.Title,
            ErSkjermet = classification.IsRestricted,
        };
}
