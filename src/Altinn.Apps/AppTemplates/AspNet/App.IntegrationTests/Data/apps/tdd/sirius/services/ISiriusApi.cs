using System.IO;
using System.Threading.Tasks;

#pragma warning disable SA1300 // Element should begin with upper-case letter
namespace App.IntegrationTestsRef.Data.apps.tdd.sirius.services
#pragma warning restore SA1300 // Element should begin with upper-case letter
{
    public interface ISiriusApi
    {
        Task<bool> IsValidNæring(Stream næringsoppgave);

        Task<Stream> GetNæringPDF(Stream næringsoppgave);
    }
}
