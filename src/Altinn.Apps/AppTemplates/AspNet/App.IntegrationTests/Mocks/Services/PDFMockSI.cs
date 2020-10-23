using System.Threading.Tasks;

using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Models;

namespace App.IntegrationTestsRef.Mocks.Services
{
    public class PDFMockSI : IPDF
    {
        public Task GenerateAndStoreReceiptPDF(Instance instance, DataElement dataElement)
        {
            return Task.CompletedTask;
        }
    }
}
