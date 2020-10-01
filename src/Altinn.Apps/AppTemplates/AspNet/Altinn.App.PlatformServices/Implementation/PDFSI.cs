using Altinn.App.Services.Configuration;
using Altinn.App.Services.Constants;
using Altinn.App.Services.Helpers;
using Altinn.Platform.Profile.Models;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.AspNetCore.Http;
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
        private readonly IText _textService;
        private readonly IProfile _profileService;
        private readonly UserHelper _userHelper;
        private readonly JsonSerializer _camelCaseSerializer;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly string pdfElementType = "ref-data-as-pdf";

        /// <summary>
        /// Creates a new instance of the <see cref="PDFSI"/> class
        /// </summary>
        /// <param name="appSettings">The app settings</param>
        /// <param name="logger">The logger</param>
        /// <param name="httpClient">The http client</param>
        /// <param name="dataService">The data service</param>
        /// <param name="registerService">The register service</param>
        /// <param name="appResourcesService">The app resource service</param>
        /// <param name="textService">The text service</param>
        /// <param name="profileService">the profile service</param>
        public PDFSI(IOptions<PlatformSettings> platformSettings,
            IOptions<AppSettings> appSettings,
            ILogger<PDFSI> logger,
            HttpClient httpClient,
            IData dataService,
            IRegister registerService,
            IAppResources appResourcesService,
            IText textService,
            IProfile profileService,
            IOptions<GeneralSettings> settings,
            IHttpContextAccessor httpContextAccessor
            )
        {
            _logger = logger;
            _dataService = dataService;
            _registerService = registerService;
            _appResourcesService = appResourcesService;
            _textService = textService;
            _appSettings = appSettings.Value;
            _camelCaseSerializer = JsonSerializer.Create(
                new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });

            httpClient.BaseAddress = new Uri(platformSettings.Value.ApiPdfEndpoint);
            httpClient.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, platformSettings.Value.SubscriptionKey);
            _pdfClient = httpClient;
            _profileService = profileService;
            _userHelper = new UserHelper(profileService, registerService, settings);
            _httpContextAccessor = httpContextAccessor;
        }

        /// <inheritdoc/>
        public async Task GenerateAndStoreReceiptPDF(Instance instance, DataElement dataElement)
        {
            string app = instance.AppId.Split("/")[1];
            string org = instance.Org;
            int instanceOwnerId = int.Parse(instance.InstanceOwner.PartyId);
            Application application = _appResourcesService.GetApplication();
            Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);

            Stream dataStream = await _dataService.GetBinaryData(org, app, instanceOwnerId, instanceGuid, new Guid(dataElement.Id));
            byte[] dataAsBytes = new byte[dataStream.Length];
            await dataStream.ReadAsync(dataAsBytes);
            string encodedXml = Convert.ToBase64String(dataAsBytes);

            UserContext userContext = await _userHelper.GetUserContext(_httpContextAccessor.HttpContext);
            UserProfile userProfile = await _profileService.GetUserProfile(userContext.UserId);
            
            byte[] formLayout = _appResourcesService.GetAppResource(org, app, _appSettings.FormLayoutJSONFileName);
            TextResource textResource = await _textService.GetText(org, app, userProfile.ProfileSettingPreference.Language);

            string formLayoutString = GetUTF8String(formLayout);
            string textResourcesString = JsonConvert.SerializeObject(textResource);

            PDFContext pdfContext = new PDFContext
            {
                Data = encodedXml,
                FormLayout = JsonConvert.DeserializeObject(formLayoutString),
                TextResources = JsonConvert.DeserializeObject(textResourcesString),
                Party = await _registerService.GetParty(instanceOwnerId),
                Instance = instance,
                UserProfile = userProfile,
                UserParty = userProfile.Party
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
                await StorePDF(pdfContent, instance, application, userProfile.ProfileSettingPreference.Language);
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

        private async Task<DataElement> StorePDF(Stream pdfStream, Instance instance, Application appMetadata, string language)
        {
            string fileName = null;
            string app = instance.AppId.Split("/")[1];

            if (!string.IsNullOrEmpty(appMetadata.Title?[language]))
            {
                fileName = appMetadata.Title[language] + ".pdf";
            }
            else if (!string.IsNullOrEmpty(appMetadata.Title?["nb"]))
            {
                fileName = appMetadata.Title[language] + ".pdf";
            } else {
                fileName = app + ".pdf";
            }

            fileName = GetValidFileName(fileName);

            return await _dataService.InsertBinaryData(
                instance.Id,
                pdfElementType,
                "application/pdf",
                fileName,
                pdfStream);
        }

        private string GetValidFileName(string fileName)
        {
            foreach (char c in System.IO.Path.GetInvalidFileNameChars())
            {
                fileName = fileName.Replace(c, '_');
            }
            fileName = Uri.EscapeDataString(fileName);
            return fileName;
        }
    }
}
