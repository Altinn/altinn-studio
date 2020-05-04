using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Threading.Tasks;

namespace App.IntegrationTestsRef.Data.apps.tdd.sirius.services
{
    public interface ISiriusApi
    {
        Task<bool> IsValidNæring(Stream næringsoppgave);

        Task<Stream> GetNæringPDF(Stream næringsoppgave);

    }
}
