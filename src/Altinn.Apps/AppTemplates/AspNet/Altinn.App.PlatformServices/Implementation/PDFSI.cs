using Altinn.App.Services.Clients;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json.Serialization;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

namespace Altinn.App.Services.Implementation
{
    class PDFSI : IPDF
    {
        private ILogger _logger;
        private HttpClient _pdfClient;
        private HttpClient _storageClient;

        private IData _dataService;
        private IRegister _registerService;
        private readonly IAppResources _appResourcesService;
        private JsonSerializer _camelCaseSerializer;
        private string pdfElementType = "ref-data-as-pdf";
        private string pdfFileName = "receipt.pdf";

        /// <summary>
        /// Creates a new instance of the <see cref="PDFSI"/> class
        /// </summary>
        /// <param name="logger">The logger</param>
        /// <param name="httpClientAccessor">The http client accessor</param>
        /// <param name="dataService">The data service</param>
        /// <param name="repositoryService">The repository service</param>
        /// <param name="registerService">The register service</param>
        public PDFSI(ILogger<PrefillSI> logger,
            IHttpClientAccessor httpClientAccessor,
            IData dataService,
            IRegister registerService,
            IAppResources appResourcesService)
        {
            _logger = logger;
            _pdfClient = httpClientAccessor.PdfClient;
            _storageClient = httpClientAccessor.StorageClient;
            _dataService = dataService;
            _registerService = registerService;
            _appResourcesService = appResourcesService;
            _camelCaseSerializer = JsonSerializer.Create(
                new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
        }

        /// <inheritdoc/>
        public async Task GenerateAndStoreReceiptPDF(Instance instance, UserContext userContext)
        {
            string app = instance.AppId.Split("/")[1];
            string org = instance.Org;
            int instanceOwnerId = int.Parse(instance.InstanceOwner.PartyId);
            Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);
            Guid defaultDataElementGuid = Guid.Parse(instance.Data.Find(element => element.DataType.Equals("default"))?.Id);
            Stream dataStream = await _dataService.GetBinaryData(org, app, instanceOwnerId, instanceGuid, defaultDataElementGuid);
            byte[] dataAsBytes = new byte[dataStream.Length];
            await dataStream.ReadAsync(dataAsBytes);
            string encodedXml = System.Convert.ToBase64String(dataAsBytes);

            byte[] formLayout = _appResourcesService.GetAppResource(org, app, "FormLayout.json");            
            byte[] textResources = _appResourcesService.GetText(org, app, "resource.nb.json");
            
            string formLayoutString = GetUTF8String(formLayout);
            string textResourcesString = GetUTF8String(textResources);

            PDFContext pdfContext = new PDFContext
            {
                Data = encodedXml,
                FormLayout = JsonConvert.DeserializeObject(formLayoutString),
                TextResources = JsonConvert.DeserializeObject(textResourcesString),
                Party = await _registerService.GetParty(instanceOwnerId),
                UserParty = userContext.Party,
                Instance = instance
            };

            Stream pdfContent;
            try
            {
                pdfContent = await GeneratePDF(pdfContext);
            }
            catch (Exception exception)
            {
                _logger.LogError($"Could not generate pdf for {instance.Id}, failed with message {exception.Message}");
                return;
            }

            try
            {
                await StorePDF(pdfContent, instance);
            }
            catch (Exception exception)
            {
                _logger.LogError($"Could not store pdf for {instance.Id}, failed with message {exception.Message}");
                return;
            }
            finally
            {
                pdfContent.Dispose();
            }
        }

        private static string GetUTF8String(byte[] data)
        {
            if (data == null || !data.Any())
            {
                return null;
            }

            byte[] utf8Preamble = Encoding.UTF8.GetPreamble();
            bool hasPreamble = utf8Preamble[0] == data[0];
            if (hasPreamble)
            {
                return Encoding.UTF8.GetString(data, utf8Preamble.Length, data.Length - utf8Preamble.Length);
            }
            else
            {
                return Encoding.UTF8.GetString(data);
            }
        }

        private async Task<Stream> GeneratePDF(PDFContext pdfContext)
        {
            using HttpContent data = new StringContent(JObject.FromObject(pdfContext, _camelCaseSerializer).ToString(), Encoding.UTF8, "application/json");
            HttpResponseMessage response = await _pdfClient.PostAsync("generate", data);
            response.EnsureSuccessStatusCode();
            Stream pdfContent = await response.Content.ReadAsStreamAsync();
            return pdfContent;
        }

        private async Task<DataElement> StorePDF(Stream pdfStream, Instance instance)
        {                  
            return await _dataService.InsertBinaryData(
                instance.Id,
                pdfElementType,
                "application/pdf",
                pdfFileName,
                pdfStream);            
        }
    }
}
