using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using KS.Fiks.Arkiv.Models.V1.Metadatakatalog;

namespace Altinn.App.Clients.Fiks.Extensions;

internal static class FiksArkivCodeExtensions
{
    public static T? ToExternal<T>(this FiksArkivCode? code)
        where T : Kode, new()
    {
        if (code is null)
            return null;

        return new T
        {
            KodeProperty = code.Code,
            Beskrivelse = !string.IsNullOrWhiteSpace(code.Description) ? code.Description : null,
        };
    }
}
