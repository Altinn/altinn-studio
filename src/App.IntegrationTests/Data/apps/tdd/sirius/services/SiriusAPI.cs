using System;
using System.IO;
using System.Threading.Tasks;

using App.IntegrationTests.Mocks.Services;

#pragma warning disable SA1300 // Element should begin with upper-case letter
namespace App.IntegrationTestsRef.Data.apps.tdd.sirius.services
#pragma warning restore SA1300 // Element should begin with upper-case letter
{
    public class SiriusAPI : ISiriusApi
    {
        public Task<Stream> GetNæringPDF(Stream næringsoppgave)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(InstanceMockSI).Assembly.Location).LocalPath);
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
