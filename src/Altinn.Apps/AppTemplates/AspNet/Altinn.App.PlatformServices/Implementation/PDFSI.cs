using Altinn.App.Services.Clients;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json.Serialization;
using System;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

namespace Altinn.App.Services.Implementation
{
    public class PDFSI : IPDF
    {
        private readonly ILogger _logger;
        private readonly HttpClient _pdfClient;
        private readonly AppSettings _appSettings;
        private readonly IData _dataService;
        private readonly IRegister _registerService;
        private readonly IAppResources _appResourcesService;
        private readonly JsonSerializer _camelCaseSerializer;
        private readonly string pdfElementType = "ref-data-as-pdf";
        private readonly string defaultFileName = "kvittering.pdf";

        /// <summary>
        /// Creates a new instance of the <see cref="PDFSI"/> class
        /// </summary>
        /// <param name="appSettings">The app settings</param>
        /// <param name="logger">The logger</param>
        /// <param name="httpClientAccessor">The http client accessor</param>
        /// <param name="dataService">The data service</param>
        /// <param name="repositoryService">The repository service</param>
        /// <param name="registerService">The register service</param>
        public PDFSI(IOptions<AppSettings> appSettings,
            ILogger<PDFSI> logger,
            IHttpClientAccessor httpClientAccessor,
            IData dataService,
            IRegister registerService,
            IAppResources appResourcesService)
        {
            _logger = logger;
            _pdfClient = httpClientAccessor.PdfClient;
            _dataService = dataService;
            _registerService = registerService;
            _appResourcesService = appResourcesService;
            _appSettings = appSettings.Value;
            _camelCaseSerializer = JsonSerializer.Create(
                new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
        }

        /// <inheritdoc/>
        public async Task GenerateAndStoreReceiptPDF(Instance instance)
        {
            string app = instance.AppId.Split("/")[1];
            string org = instance.Org;
            int instanceOwnerId = int.Parse(instance.InstanceOwner.PartyId);
            Application application = _appResourcesService.GetApplication();
            Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);

            DataType dataModelDataElement = application.DataTypes.Find(element => element.AppLogic != null);
            Guid dataModelDataElementGuid = Guid.Parse(instance.Data.Find(element => element.DataType.Equals(dataModelDataElement.Id))?.Id);

            Stream dataStream = await _dataService.GetBinaryData(org, app, instanceOwnerId, instanceGuid, dataModelDataElementGuid);
            byte[] dataAsBytes = new byte[dataStream.Length];
            await dataStream.ReadAsync(dataAsBytes);
            string encodedXml = System.Convert.ToBase64String(dataAsBytes);

            byte[] formLayout = _appResourcesService.GetAppResource(org, app, _appSettings.FormLayoutJSONFileName);
            byte[] textResources = _appResourcesService.GetText(org, app, "resource.nb.json");

            string formLayoutString = GetUTF8String(formLayout);
            string textResourcesString = GetUTF8String(textResources);

            PDFContext pdfContext = new PDFContext
            {
                Data = encodedXml,
                FormLayout = JsonConvert.DeserializeObject(formLayoutString),
                TextResources = JsonConvert.DeserializeObject(textResourcesString),
                Party = await _registerService.GetParty(instanceOwnerId),
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
            string fileName = null;

            if (instance.Title?["nb"] != null && instance.Title?["nb"] != String.Empty)
            {
                fileName = instance.Title["nb"] + ".pdf";
                fileName = GetValidFileName(fileName);
            }

            return await _dataService.InsertBinaryData(
                instance.Id,
                pdfElementType,
                "application/pdf",
                fileName ?? defaultFileName,
                pdfStream);
        }

        private string GetValidFileName(string fileName)
        {
            foreach (char c in System.IO.Path.GetInvalidFileNameChars())
            {
                fileName = fileName.Replace(c, '_');
            }
            fileName = fileName.Replace(' ', '_');
            return fileName;
        }
    }
}
