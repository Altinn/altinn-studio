using System;
using System.IO;
using System.Threading.Tasks;

using Altinn.App.Services.Interface;
using Altinn.App.Services.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace App.IntegrationTestsRef.Mocks.Services
{
    public class PDFMockSI : IPDF
    {
        public Task GenerateAndStoreReceiptPDF(Instance instance, DataElement dataElement, Type dataElementModelType)
        {
            return Task.CompletedTask;
        }

        public Task<Stream> GeneratePDF(PDFContext pdfContext)
        {
            throw new NotImplementedException();
        }
    }
}
