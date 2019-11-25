using System;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using AltinnCore.Common.Clients;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json.Serialization;

namespace AltinnCore.Common.Services.Implementation
{
    /// <inheritdoc/>
    public class PDFSI : IPDF
    {
        private ILogger _logger;
        private HttpClient _pdfClient;
        private HttpClient _storageClient;

        private IData _dataService;
        private IExecution _executionService;
        private IRegister _registerService;
        private JsonSerializer _camelCaseSerializer;
        private string pdfElementType = "ref-data-as-pdf";
        private string defaultFileName = "kvittering.pdf";

        /// <summary>
        /// Creates a new instance of the <see cref="PDFSI"/> class
        /// </summary>
        /// <param name="logger">The logger</param>
        /// <param name="httpClientAccessor">The http client accessor</param>
        /// <param name="dataService">The data service</param>
        /// <param name="executionService">The excution service</param>
        /// <param name="registerService">The register service</param>
        public PDFSI(ILogger<PrefillSI> logger, IHttpClientAccessor httpClientAccessor, IData dataService, IExecution executionService, IRegister registerService)
        {
            _logger = logger;
            _pdfClient = httpClientAccessor.PdfClient;
            _storageClient = httpClientAccessor.StorageClient;
            _dataService = dataService;
            _executionService = executionService;
            _registerService = registerService;
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
            int instanceOwnerId = int.Parse(instance.InstanceOwnerId);
            Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);
            Guid defaultDataElementGuid = Guid.Parse(instance.Data.Find(element => element.ElementType.Equals("default"))?.Id);

            Stream dataStream = await _dataService.GetBinaryData(org, app, instanceOwnerId, instanceGuid, defaultDataElementGuid);
            byte[] dataAsBytes = new byte[dataStream.Length];
            dataStream.Read(dataAsBytes);
            string encodedXml = System.Convert.ToBase64String(dataAsBytes);

            byte[] formLayout = _executionService.GetServiceResource(org, app, "FormLayout.json");
            byte[] textResources = _executionService.GetServiceResource(org, app, "resource.nb-NO.json");

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

        private async Task<Stream> GeneratePDF(PDFContext pdfContext)
        {
            using (HttpContent data = new StringContent(JObject.FromObject(pdfContext, _camelCaseSerializer).ToString(), Encoding.UTF8, "application/json"))
            {
                HttpResponseMessage response = await _pdfClient.PostAsync("generate", data);
                response.EnsureSuccessStatusCode();
                Stream pdfContent = await response.Content.ReadAsStreamAsync();
                return pdfContent;
            }
        }

        private async Task<DataElement> StorePDF(Stream pdfStream, Instance instance)
        {
            string fileName;
            if (instance.PresentationField != null)
            {
                fileName = instance.PresentationField["nb"] + ".pdf";
            }
            else
            {
                fileName = defaultFileName;
            }

            using (StreamContent content = CreateStreamContent(pdfStream, fileName))
            {
                return await _dataService.InsertBinaryData(
                    instance.Org,
                    instance.AppId.Split("/")[1],
                    int.Parse(instance.InstanceOwnerId),
                    Guid.Parse(instance.Id.Split("/")[1]),
                    pdfElementType,
                    fileName,
                    content);
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

        private StreamContent CreateStreamContent(Stream stream, string fileName)
        {
            StreamContent streamContent = new StreamContent(stream);
            streamContent.Headers.ContentType = MediaTypeHeaderValue.Parse("application/pdf");
            streamContent.Headers.ContentDisposition = ContentDispositionHeaderValue.Parse("form-data");
            streamContent.Headers.ContentDisposition.FileName = fileName;
            streamContent.Headers.ContentDisposition.Size = stream.Length;
            return streamContent;
        }
    }
}
