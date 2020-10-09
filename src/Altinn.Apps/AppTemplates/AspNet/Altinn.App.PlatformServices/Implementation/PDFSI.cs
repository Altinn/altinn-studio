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
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace Altinn.App.Services.Implementation
{
    public class PDFSI : IPDF
    {
        private readonly ILogger _logger;
        private readonly HttpClient _pdfClient;
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
        /// <param name="platformSettings">The platform settingssettings</param>
        /// <param name="logger">The logger</param>
        /// <param name="httpClient">The http client</param>
        /// <param name="dataService">The data service</param>
        /// <param name="registerService">The register service</param>
        /// <param name="appResourcesService">The app resource service</param>
        /// <param name="textService">The text service</param>
        /// <param name="profileService">the profile service</param>
        /// <param name="settings">the general settings</param>
        /// <param name="httpContextAccessor">the httpContextAccessor</param>
        public PDFSI(IOptions<PlatformSettings> platformSettings,
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
            
            string formLayoutsString = _appResourcesService.GetLayouts();
            TextResource textResource = await _textService.GetText(org, app, userProfile.ProfileSettingPreference.Language);
            if (textResource == null && !userProfile.ProfileSettingPreference.Equals("nb")) {
                // fallback to norwegian if texts does not exist
                textResource = await _textService.GetText(org, app, "nb");
            }

            string textResourcesString = JsonConvert.SerializeObject(textResource);

            PDFContext pdfContext = new PDFContext
            {
                Data = encodedXml,
                FormLayouts = JsonConvert.DeserializeObject<Dictionary<string, object>>(formLayoutsString),
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
                await StorePDF(pdfContent, instance, textResource);
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
            using HttpContent data = new StringContent(JObject.FromObject(pdfContext, _camelCaseSerializer).ToString(), Encoding.UTF8, "application/json");
            HttpResponseMessage response = await _pdfClient.PostAsync("generate", data);
            response.EnsureSuccessStatusCode();
            Stream pdfContent = await response.Content.ReadAsStreamAsync();
            return pdfContent;
        }

        private async Task<DataElement> StorePDF(Stream pdfStream, Instance instance, TextResource textResource)
        {
            string fileName = null;
            string app = instance.AppId.Split("/")[1];

            TextResourceElement titleText = textResource.Resources.Find(textResourceElement => textResourceElement.Id.Equals("ServiceName"));
            
            if (titleText != null && !String.IsNullOrEmpty(titleText.Value))
            {
                fileName = titleText.Value +  ".pdf";
            }
            else {
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
