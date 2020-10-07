using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Models;
using System.Net.Http;
using System.Threading.Tasks;

namespace App.IntegrationTestsRef.Mocks.Services
{
    public class PDFMockSI : IPDF
    {
        public PDFMockSI()
        {

        }

        public Task GenerateAndStoreReceiptPDF(Instance instance, DataElement dataElement)
        {
            return Task.CompletedTask;
        }
    }
}
