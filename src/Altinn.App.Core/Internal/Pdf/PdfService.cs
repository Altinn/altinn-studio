using System.Security.Claims;
using System.Xml.Serialization;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers.Extensions;
using Altinn.App.Core.Interface;
using Altinn.App.Core.Models;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Newtonsoft.Json;

namespace Altinn.App.Core.Internal.Pdf
{
    /// <summary>
    /// Class for generating and storing PDF
    /// </summary>
    public class PdfService : IPdfService
    {
        private readonly IPDF _pdfClient;
        private readonly IAppResources _resourceService;
        private readonly IPdfOptionsMapping _pdfOptionsMapping;
        private readonly IData _dataClient;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IProfile _profileClient;
        private readonly IRegister _registerClient;
        private readonly IPdfFormatter _pdfFormatter;
        private readonly string pdfElementType = "ref-data-as-pdf";

        /// <summary>
        /// Initializes a new instance of the <see cref="PdfService"/> class.
        /// </summary>
        /// <param name="pdfClient">Client for communicating with the Platform PDF service.</param>
        /// <param name="appResources">The service giving access to local resources.</param>
        /// <param name="pdfOptionsMapping">The service responsible for mapping options.</param>
        /// <param name="dataClient">The data client.</param>
        /// <param name="httpContextAccessor">The httpContextAccessor</param>
        /// <param name="profileClient">The profile client</param>
        /// <param name="registerClient">The register client</param>
        /// <param name="pdfFormatter">Class for customizing pdf formatting and layout.</param>
        public PdfService(IPDF pdfClient, IAppResources appResources, IPdfOptionsMapping pdfOptionsMapping, IData dataClient, IHttpContextAccessor httpContextAccessor, IProfile profileClient, IRegister registerClient, IPdfFormatter pdfFormatter)
        {
            _pdfClient = pdfClient;
            _resourceService = appResources;
            _pdfOptionsMapping = pdfOptionsMapping;
            _dataClient = dataClient;
            _httpContextAccessor = httpContextAccessor;
            _profileClient = profileClient;
            _registerClient = registerClient;
            _pdfFormatter = pdfFormatter;
        }

        /// <inheritdoc/>
        public async Task GenerateAndStoreReceiptPDF(Instance instance, string taskId, DataElement dataElement, Type dataElementModelType)
        {
            string app = instance.AppId.Split("/")[1];
            string org = instance.Org;
            int instanceOwnerId = int.Parse(instance.InstanceOwner.PartyId);
            Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);

            string layoutSetsString = _resourceService.GetLayoutSets();
            LayoutSets? layoutSets = null;
            LayoutSet? layoutSet = null;
            if (!string.IsNullOrEmpty(layoutSetsString))
            {
                layoutSets = JsonConvert.DeserializeObject<LayoutSets>(layoutSetsString)!;
                layoutSet = layoutSets.Sets.FirstOrDefault(t => t.DataType.Equals(dataElement.DataType) && t.Tasks.Contains(taskId));
            }

            string? layoutSettingsFileContent = layoutSet == null ? _resourceService.GetLayoutSettingsString() : _resourceService.GetLayoutSettingsStringForSet(layoutSet.Id);

            LayoutSettings? layoutSettings = null;
            if (!string.IsNullOrEmpty(layoutSettingsFileContent))
            {
                layoutSettings = JsonConvert.DeserializeObject<LayoutSettings>(layoutSettingsFileContent);
            }

            // Ensure layoutsettings are initialized in FormatPdf
            layoutSettings ??= new();
            layoutSettings.Pages ??= new();
            layoutSettings.Pages.Order ??= new();
            layoutSettings.Pages.ExcludeFromPdf ??= new();
            layoutSettings.Components ??= new();
            layoutSettings.Components.ExcludeFromPdf ??= new();

            object data = await _dataClient.GetFormData(instanceGuid, dataElementModelType, org, app, instanceOwnerId, new Guid(dataElement.Id));

            layoutSettings = await _pdfFormatter.FormatPdf(layoutSettings, data);
            XmlSerializer serializer = new XmlSerializer(dataElementModelType);
            using MemoryStream stream = new MemoryStream();

            serializer.Serialize(stream, data);
            stream.Position = 0;

            byte[] dataAsBytes = new byte[stream.Length];
            await stream.ReadAsync(dataAsBytes);
            string encodedXml = Convert.ToBase64String(dataAsBytes);

            string language = "nb";
            Party? actingParty = null;
            ClaimsPrincipal? user = _httpContextAccessor.HttpContext?.User;

            int? userId = user.GetUserIdAsInt();

            if (userId != null)
            {
                UserProfile userProfile = await _profileClient.GetUserProfile((int)userId);
                actingParty = userProfile.Party;

                if (!string.IsNullOrEmpty(userProfile.ProfileSettingPreference?.Language))
                {
                    language = userProfile.ProfileSettingPreference.Language;
                }
            }
            else
            {
                string? orgNumber = user.GetOrgNumber().ToString();
                actingParty = await _registerClient.LookupParty(new PartyLookup { OrgNo = orgNumber });
            }

            // If layoutset exists pick correct layotFiles
            string formLayoutsFileContent = layoutSet == null ? _resourceService.GetLayouts() : _resourceService.GetLayoutsForSet(layoutSet.Id);

            TextResource? textResource = await _resourceService.GetTexts(org, app, language);

            if (textResource == null && language != "nb")
            {
                // fallback to norwegian if texts does not exist
                textResource = await _resourceService.GetTexts(org, app, "nb");
            }

            string textResourcesString = JsonConvert.SerializeObject(textResource);
            Dictionary<string, Dictionary<string, string>> optionsDictionary =
                await _pdfOptionsMapping.GetOptionsDictionary(formLayoutsFileContent, language, data, instance.Id);

            var pdfContext = new PDFContext
            {
                Data = encodedXml,
                FormLayouts = JsonConvert.DeserializeObject<Dictionary<string, object>>(formLayoutsFileContent)!,
                LayoutSettings = layoutSettings,
                TextResources = JsonConvert.DeserializeObject(textResourcesString)!,
                OptionsDictionary = optionsDictionary,
                Party = await _registerClient.GetParty(instanceOwnerId),
                Instance = instance,
                UserParty = actingParty,
                Language = language
            };

            Stream pdfContent = await _pdfClient.GeneratePDF(pdfContext);
            await StorePDF(pdfContent, instance, textResource);
            pdfContent.Dispose();
        }

        private async Task<DataElement> StorePDF(Stream pdfStream, Instance instance, TextResource textResource)
        {
            string? fileName = null;
            string app = instance.AppId.Split("/")[1];

            TextResourceElement? titleText =
                textResource.Resources.Find(textResourceElement => textResourceElement.Id.Equals("appName")) ??
                textResource.Resources.Find(textResourceElement => textResourceElement.Id.Equals("ServiceName"));

            if (titleText != null && !string.IsNullOrEmpty(titleText.Value))
            {
                fileName = titleText.Value + ".pdf";
            }
            else
            {
                fileName = app + ".pdf";
            }

            fileName = GetValidFileName(fileName);

            return await _dataClient.InsertBinaryData(
                instance.Id,
                pdfElementType,
                "application/pdf",
                fileName,
                pdfStream);
        }

        private static string GetValidFileName(string fileName)
        {
            fileName = Uri.EscapeDataString(fileName.AsFileName(false));
            return fileName;
        }
    }
}
