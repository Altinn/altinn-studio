using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Models;
using System.Net.Http;
using System.Threading.Tasks;

namespace App.IntegrationTestsRef.Mocks.Services
{
    public class PDFMockSI : IPDF
    {
        public PDFMockSI(HttpClient httpClient)
        {

        }

        public Task GenerateAndStoreReceiptPDF(Instance instance)
        {
            return Task.CompletedTask;
        }
    }
}
