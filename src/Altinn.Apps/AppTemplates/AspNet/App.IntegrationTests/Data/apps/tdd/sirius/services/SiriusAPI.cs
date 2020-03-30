using App.IntegrationTests.Mocks.Services;
using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Threading.Tasks;

namespace App.IntegrationTestsRef.Data.apps.tdd.sirius.services
{
    public class SiriusAPImock : ISiriusApi
    {
        public Task<Stream> GetNæringPDF(Stream næringsoppgave)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(InstanceMockSI).Assembly.CodeBase).LocalPath);
            string pdfPath = Path.Combine(unitTestFolder, @"..\..\..\Data\Files\cat.pdf");

            Stream fs = File.OpenRead(pdfPath);
            return Task.FromResult(fs);
        }

        public Task<bool> IsValidNæring(Stream næringsoppgave)
        {
            return Task.FromResult(true);
        }
    }
}
