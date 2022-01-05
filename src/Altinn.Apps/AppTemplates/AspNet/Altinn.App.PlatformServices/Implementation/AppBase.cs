using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Xml.Serialization;

using Altinn.App.Common.Enums;
using Altinn.App.Common.Helpers.Extensions;
using Altinn.App.Common.Models;
using Altinn.App.PlatformServices.Extensions;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Constants;
using Altinn.App.Services.Helpers;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models;
using Altinn.App.Services.Models.Validation;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Common.EFormidlingClient;
using Altinn.Common.EFormidlingClient.Models.SBD;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;

using AltinnCore.Authentication.Utils;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

using Newtonsoft.Json;

namespace Altinn.App.Services.Implementation
{
    /// <summary>
    /// Default implementation of the core Altinn App interface.
    /// </summary>
    public abstract class AppBase : IAltinnApp
    {
        private readonly Application _appMetadata;
        private readonly IAppResources _resourceService;
        private readonly IProcess _processService;
        private readonly ILogger<AppBase> _logger;
        private readonly IEFormidlingClient _eFormidlingClient;
        private readonly string pdfElementType = "ref-data-as-pdf";
        private readonly UserHelper _userHelper;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly AppSettings _appSettings;
        private readonly IData _dataClient;
        private readonly IPDF _pdfClient;
        private readonly IPrefill _prefillService;
        private readonly IInstance _instanceClient;
        private readonly IRegister _registerClient;
        private readonly IProfile _profileClient;
        private readonly IText _textClient;
        private readonly IAccessTokenGenerator _tokenGenerator;
        private readonly PlatformSettings _platformSettings;

        /// <summary>
        /// Initialize a new instance of <see cref="AppBase"/> class with the given services.
        /// </summary>
        /// <param name="resourceService">The service giving access to local resources.</param>
        /// <param name="logger">A logging service.</param>
        /// <param name="dataClient">The data client.</param>
        /// <param name="processService">The service giving access the App process.</param>
        /// <param name="pdfClient">The pdf client.</param>
        /// <param name="prefillService">The service giving access to prefill mechanisms.</param>
        /// <param name="instanceClient">The instance client</param>
        /// <param name="registerClient">The register client</param>
        /// <param name="settings">the general settings</param>
        /// <param name="profileClient">the profile client</param>
        /// <param name="textClient">The text client</param>
        /// <param name="httpContextAccessor">the httpContextAccessor</param>
        /// <param name="eFormidlingClient">The eFormidling client</param>
        /// <param name="appSettings">The appsettings</param>
        /// <param name="platformSettings">The platform settings</param>
        /// <param name="tokenGenerator">The access token generator</param>
        protected AppBase(
            IAppResources resourceService,
            ILogger<AppBase> logger,
            IData dataClient,
            IProcess processService,
            IPDF pdfClient,
            IPrefill prefillService,
            IInstance instanceClient,
            IRegister registerClient,
            IOptions<GeneralSettings> settings,
            IProfile profileClient,
            IText textClient,
            IHttpContextAccessor httpContextAccessor,
            IEFormidlingClient eFormidlingClient = null,
            IOptions<AppSettings> appSettings = null,
            IOptions<PlatformSettings> platformSettings = null,
            IAccessTokenGenerator tokenGenerator = null)
        {
            _appMetadata = resourceService.GetApplication();
            _resourceService = resourceService;
            _logger = logger;
            _dataClient = dataClient;
            _processService = processService;
            _pdfClient = pdfClient;
            _prefillService = prefillService;
            _instanceClient = instanceClient;
            _registerClient = registerClient;
            _userHelper = new UserHelper(profileClient, registerClient, settings);
            _profileClient = profileClient;
            _textClient = textClient;
            _httpContextAccessor = httpContextAccessor;
            _appSettings = appSettings?.Value;
            _eFormidlingClient = eFormidlingClient;
            _tokenGenerator = tokenGenerator;
            _platformSettings = platformSettings?.Value;
        }

        /// <inheritdoc />
        public abstract Type GetAppModelType(string dataType);

        /// <inheritdoc />
        public abstract object CreateNewAppModel(string dataType);

        /// <inheritdoc />
        public abstract Task<bool> RunAppEvent(AppEventType appEvent, object model, ModelStateDictionary modelState = null);

        /// <inheritdoc />
        public abstract Task RunDataValidation(object data, ModelStateDictionary validationResults);

        /// <inheritdoc />
        public abstract Task RunTaskValidation(Instance instance, string taskId, ModelStateDictionary validationResults);

        /// <inheritdoc />
        public virtual Task<bool> RunCalculation(object data)
        {
            return Task.FromResult(false);
        }

        /// <inheritdoc />
        public virtual Task<bool> RunProcessDataRead(Instance instance, Guid? dataId, object data)
        {
            throw new NotImplementedException("RunProcessDataRead not implemented in app");
        }

        /// <inheritdoc />
        public virtual Task<bool> RunProcessDataWrite(Instance instance, Guid? dataId, object data)
        {
            throw new NotImplementedException("RunProcessDataWrite not implemented in app");
        }

        /// <inheritdoc />
        public abstract Task<InstantiationValidationResult> RunInstantiationValidation(Instance instance);

        /// <inheritdoc />
        public virtual Task RunDataCreation(Instance instance, object data)
        {
            return Task.CompletedTask;
        }

        /// <inheritdoc />
        public virtual Task RunDataCreation(Instance instance, object data, Dictionary<string, string> prefill)
        {
            throw new NotImplementedException("RunDataCreation with external prefill not implemented in app");
        }

        /// <inheritdoc />
        public abstract Task<AppOptions> GetOptions(string id, AppOptions options);

        /// <inheritdoc />
        public abstract Task RunProcessTaskEnd(string taskId, Instance instance);

        /// <inheritdoc />
        public abstract Task<LayoutSettings> FormatPdf(LayoutSettings layoutSettings, object data);

        /// <inheritdoc />
        public Task<string> OnInstantiateGetStartEvent()
        {
            _logger.LogInformation("OnInstantiate: GetStartEvent");

            // return start event
            return Task.FromResult("StartEvent_1");
        }

        /// <inheritdoc />
        public async Task OnStartProcess(string startEvent, Instance instance)
        {
            await Task.CompletedTask;
            _logger.LogInformation($"OnStartProcess for {instance.Id}");
        }

        /// <inheritdoc />
        public async Task OnEndProcess(string endEvent, Instance instance)
        {
            await Task.CompletedTask;
            _logger.LogInformation($"OnEndProcess for {instance.Id}, endEvent: {endEvent}");
        }

        /// <inheritdoc />
        public async Task OnStartProcessTask(string taskId, Instance instance, Dictionary<string, string> prefill)
        {
            _logger.LogInformation($"OnStartProcessTask for {instance.Id}");

            foreach (DataType dataType in _appMetadata.DataTypes.Where(dt => dt.TaskId == taskId && dt.AppLogic?.AutoCreate == true))
            {
                _logger.LogInformation($"Auto create data element: {dataType.Id}");

                DataElement dataElement = instance.Data.Find(d => d.DataType == dataType.Id);

                if (dataElement == null)
                {
                    dynamic data = CreateNewAppModel(dataType.AppLogic.ClassRef);

                    // runs prefill from repo configuration if config exists
                    await _prefillService.PrefillDataModel(instance.InstanceOwner.PartyId, dataType.Id, data, prefill);
                    try
                    {
                        await RunDataCreation(instance, data, prefill);
                    }
                    catch (NotImplementedException)
                    {
                        // Trigger application business logic the old way. DEPRICATED
                        await RunDataCreation(instance, data);
                    }

                    Type type = GetAppModelType(dataType.AppLogic.ClassRef);

                    DataElement createdDataElement = await _dataClient.InsertFormData(instance, dataType.Id, data, type);
                    instance.Data.Add(createdDataElement);

                    await UpdatePresentationTextsOnInstance(instance, dataType.Id, data);
                    await UpdateDataValuesOnInstance(instance, dataType.Id, data);

                    _logger.LogInformation($"Created data element: {createdDataElement.Id}");
                }
            }
        }

        /// <inheritdoc />
        public async Task<bool> CanEndProcessTask(string taskId, Instance instance, List<ValidationIssue> validationIssues)
        {
            // check if the task is validated
            if (instance.Process?.CurrentTask?.Validated != null)
            {
                ValidationStatus validationStatus = instance.Process.CurrentTask.Validated;

                if (validationStatus.CanCompleteTask)
                {
                    return true;
                }
            }
            else
            {
                if (validationIssues.Count == 0)
                {
                    return true;
                }
            }

            return await Task.FromResult(false);
        }

        /// <inheritdoc />
        public async Task OnEndProcessTask(string taskId, Instance instance)
        {
            await RunProcessTaskEnd(taskId, instance);

            _logger.LogInformation($"OnEndProcessTask for {instance.Id}. Locking data elements connected to {taskId}");

            List<DataType> dataTypesToLock = _appMetadata.DataTypes.FindAll(dt => dt.TaskId == taskId);

            foreach (DataType dataType in dataTypesToLock)
            {
                bool generatePdf = dataType.AppLogic != null;

                foreach (DataElement dataElement in instance.Data.FindAll(de => de.DataType == dataType.Id))
                {
                    dataElement.Locked = true;
                    _logger.LogInformation($"Locking data element {dataElement.Id} of dataType {dataType.Id}.");
                    Task updateData = _dataClient.Update(instance, dataElement);

                    if (generatePdf)
                    {
                        Type dataElementType = GetAppModelType(dataType.AppLogic.ClassRef);
                        Task createPdf = GenerateAndStoreReceiptPDF(instance, taskId, dataElement, dataElementType);
                        await Task.WhenAll(updateData, createPdf);
                    }
                    else
                    {
                        await updateData;
                    }
                }
            }

            if (_appSettings != null && _platformSettings != null && _appSettings.EnableEFormidling && _appMetadata.EFormidling.SendAfterTaskId == taskId)
            {
                if (_eFormidlingClient == null || _tokenGenerator == null)
                {
                    throw new ArgumentNullException("eFormidling support has not been correctly configured in App.cs. " +
                        "Ensure that IEformidlingClient and IAccessTokenGenerator are included in the base constructor.");
                }

                await SendEFormidlingShipment(instance);
            }

            if (_appMetadata.AutoDeleteOnProcessEnd)
            {
                int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);
                Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);

                await _instanceClient.DeleteInstance(instanceOwnerPartyId, instanceGuid, true);
            }

            await Task.CompletedTask;
        }

        /// <inheritdoc />
        public virtual async Task<List<string>> GetPageOrder(string org, string app, int instanceOwnerId, Guid instanceGuid, string layoutSetId, string currentPage, string dataTypeId, object formData)
        {
            LayoutSettings layoutSettings = null;

            if (string.IsNullOrEmpty(layoutSetId))
            {
                layoutSettings = _resourceService.GetLayoutSettings();
            }
            else
            {
                layoutSettings = _resourceService.GetLayoutSettingsForSet(layoutSetId);
            }

            return await Task.FromResult(layoutSettings.Pages.Order);
        }

        /// <inheritdoc />
        public virtual Task<(string, Stream)> GenerateEFormidlingMetadata(Instance instance)
        {
            throw new NotImplementedException("No method available for generating arkivmelding for eFormidling shipment.");
        }

        /// <inheritdoc />
        public virtual async Task<List<Receiver>> GetEFormidlingReceivers(Instance instance)
        {
            await Task.CompletedTask;
            Identifier identifier = new Identifier
            {
                // 0192 prefix for all Norwegian organisations.
                Value = $"0192:{_appMetadata.EFormidling.Receiver.Trim()}",
                Authority = "iso6523-actorid-upis"
            };

            Receiver receiver = new Receiver { Identifier = identifier };

            return new List<Receiver> { receiver };
        }

        private async Task UpdatePresentationTextsOnInstance(Instance instance, string dataType, dynamic data)
        {
            var updatedValues = DataHelper.GetUpdatedDataValues(
                _appMetadata.PresentationFields,
                instance.PresentationTexts,
                dataType,
                data);

            if (updatedValues.Count > 0)
            {
                var updatedInstance = await _instanceClient.UpdatePresentationTexts(
                      int.Parse(instance.Id.Split("/")[0]),
                      Guid.Parse(instance.Id.Split("/")[1]),
                      new PresentationTexts { Texts = updatedValues });

                instance.PresentationTexts = updatedInstance.PresentationTexts;
            }
        }

        private async Task UpdateDataValuesOnInstance(Instance instance, string dataType, object data)
        {
            var updatedValues = DataHelper.GetUpdatedDataValues(
                _appMetadata.DataFields,
                instance.DataValues,
                dataType,
                data);

            if (updatedValues.Count > 0)
            {
                var updatedInstance = await _instanceClient.UpdateDataValues(
                    int.Parse(instance.Id.Split("/")[0]),
                    Guid.Parse(instance.Id.Split("/")[1]),
                    new DataValues { Values = updatedValues });

                instance.DataValues = updatedInstance.DataValues;
            }
        }

        private async Task GenerateAndStoreReceiptPDF(Instance instance, string taskId, DataElement dataElement, Type dataElementModelType)
        {
            string app = instance.AppId.Split("/")[1];
            string org = instance.Org;
            int instanceOwnerId = int.Parse(instance.InstanceOwner.PartyId);
            Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);

            string layoutSetsString = _resourceService.GetLayoutSets();
            LayoutSets layoutSets = null;
            LayoutSet layoutSet = null;
            if (!string.IsNullOrEmpty(layoutSetsString))
            {
                layoutSets = JsonConvert.DeserializeObject<LayoutSets>(layoutSetsString);
                layoutSet = layoutSets.Sets.FirstOrDefault(t => t.DataType.Equals(dataElement.DataType) && t.Tasks.Contains(taskId));
            }

            string layoutSettingsFileContent = layoutSet == null ? _resourceService.GetLayoutSettingsString() : _resourceService.GetLayoutSettingsStringForSet(layoutSet.Id);

            LayoutSettings layoutSettings = null;
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

            layoutSettings = await FormatPdf(layoutSettings, data);
            XmlSerializer serializer = new XmlSerializer(dataElementModelType);
            using MemoryStream stream = new MemoryStream();

            serializer.Serialize(stream, data);
            stream.Position = 0;

            byte[] dataAsBytes = new byte[stream.Length];
            await stream.ReadAsync(dataAsBytes);
            string encodedXml = Convert.ToBase64String(dataAsBytes);

            string language = "nb";
            Party actingParty = null;
            ClaimsPrincipal user = _httpContextAccessor.HttpContext.User;

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
                string orgNumber = user.GetOrgNumber().ToString();
                actingParty = await _registerClient.LookupParty(new PartyLookup { OrgNo = orgNumber });
            }

            // If layoutset exists pick correct layotFiles
            string formLayoutsFileContent = layoutSet == null ? _resourceService.GetLayouts() : _resourceService.GetLayoutsForSet(layoutSet.Id);

            TextResource textResource = await _textClient.GetText(org, app, language);

            if (textResource == null && language != "nb")
            {
                // fallback to norwegian if texts does not exist
                textResource = await _textClient.GetText(org, app, "nb");
            }

            string textResourcesString = JsonConvert.SerializeObject(textResource);
            Dictionary<string, Dictionary<string, string>> optionsDictionary = await GetOptionsDictionary(formLayoutsFileContent);

            PDFContext pdfContext = new PDFContext
            {
                Data = encodedXml,
                FormLayouts = JsonConvert.DeserializeObject<Dictionary<string, object>>(formLayoutsFileContent),
                LayoutSettings = layoutSettings,
                TextResources = JsonConvert.DeserializeObject(textResourcesString),
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
            string fileName = null;
            string app = instance.AppId.Split("/")[1];

            TextResourceElement titleText = textResource.Resources.Find(textResourceElement => textResourceElement.Id.Equals("ServiceName"));

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

        private string GetValidFileName(string fileName)
        {
            fileName = Uri.EscapeDataString(fileName.AsFileName(false));
            return fileName;
        }

        private List<string> GetOptionIdsFromFormLayout(string formLayout)
        {
            List<string> optionsIds = new List<string>();
            string matchString = "\"optionsId\":\"";

            string[] formLayoutSubstrings = formLayout.Replace(" ", string.Empty).Split(new string[] { matchString }, StringSplitOptions.None);

            for (int i = 1; i < formLayoutSubstrings.Length; i++)
            {
                string[] workingSet = formLayoutSubstrings[i].Split('\"');
                string optionsId = workingSet[0];
                optionsIds.Add(optionsId);
            }

            return optionsIds;
        }

        private async Task<Dictionary<string, Dictionary<string, string>>> GetOptionsDictionary(string formLayout)
        {
            Dictionary<string, Dictionary<string, string>> dictionary = new Dictionary<string, Dictionary<string, string>>();
            List<string> optionsIdsList = GetOptionIdsFromFormLayout(formLayout);

            foreach (string optionsId in optionsIdsList)
            {
                AppOptions appOptions = new AppOptions();

                appOptions.Options = _resourceService.GetOptions(optionsId);
                appOptions = await GetOptions(optionsId, appOptions);

                if (appOptions.Options != null && !dictionary.ContainsKey(optionsId))
                {
                    Dictionary<string, string> options = new Dictionary<string, string>();
                    foreach (AppOption item in appOptions.Options)
                    {
                        if (!options.ContainsKey(item.Label))
                        {
                            options.Add(item.Label, item.Value);
                        }
                    }

                    dictionary.Add(optionsId, options);
                }
            }

            return dictionary;
        }

        private async Task SendInstanceData(Instance instance, Dictionary<string, string> requestHeaders)
        {
            Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);
            int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);

            foreach (DataElement dataElement in instance.Data)
            {
                if (!_appMetadata.EFormidling.DataTypes.Contains(dataElement.DataType))
                {
                    continue;
                }

                bool appLogic = _appMetadata.DataTypes.Any(d => d.Id == dataElement.DataType && d.AppLogic != null);

                string fileName = appLogic ? $"{dataElement.DataType}.xml" : dataElement.Filename;

                using Stream stream = await _dataClient.GetBinaryData(instance.Org, instance.AppId, instanceOwnerPartyId, instanceGuid, new Guid(dataElement.Id));

                bool successful = await _eFormidlingClient.UploadAttachment(stream, instanceGuid.ToString(), fileName, requestHeaders);

                if (!successful)
                {
                    _logger.LogError("// AppBase // SendInstanceData // DataElement {DataElementId} was not sent with shipment for instance {InstanceId} failed.", dataElement.Id, instance.Id);
                }
            }
        }

        private async Task<StandardBusinessDocument> ConstructStandardBusinessDocument(string instanceGuid, Instance instance)
        {
            DateTime completedTime = DateTime.Now;

            Sender digdirSender = new Sender
            {
                Identifier = new Identifier
                {
                    // 0192 prefix for all Norwegian organisations.
                    Value = $"0192:{_appSettings.EFormidlingSender}",
                    Authority = "iso6523-actorid-upis"
                }
            };

            List<Receiver> receivers = await GetEFormidlingReceivers(instance);

            Scope scope =
            new Scope
            {
                Identifier = _appMetadata.EFormidling.Process,
                InstanceIdentifier = Guid.NewGuid().ToString(),
                Type = "ConversationId",
                ScopeInformation = new List<ScopeInformation>
                    {
                        new ScopeInformation
                        {
                            ExpectedResponseDateTime = completedTime.AddHours(2)
                        }
                    },
            };

            BusinessScope businessScope = new BusinessScope
            {
                Scope = new List<Scope> { scope }
            };

            DocumentIdentification documentIdentification = new DocumentIdentification
            {
                InstanceIdentifier = instanceGuid,
                Standard = _appMetadata.EFormidling.Standard,
                TypeVersion = _appMetadata.EFormidling.TypeVersion,
                CreationDateAndTime = completedTime,
                Type = _appMetadata.EFormidling.Type
            };

            StandardBusinessDocumentHeader sbdHeader = new StandardBusinessDocumentHeader
            {
                HeaderVersion = "1.0",
                BusinessScope = businessScope,
                DocumentIdentification = documentIdentification,
                Receiver = receivers,
                Sender = new List<Sender> { digdirSender }
            };

            StandardBusinessDocument sbd = new StandardBusinessDocument
            {
                StandardBusinessDocumentHeader = sbdHeader,
                Arkivmelding = new Arkivmelding { Sikkerhetsnivaa = _appMetadata.EFormidling.SecurityLevel },
            };

            return sbd;
        }

        private async Task SendEFormidlingShipment(Instance instance)
        {
            string accessToken = _tokenGenerator.GenerateAccessToken(_appMetadata.Org, _appMetadata.Id.Split("/")[1]);
            string authzToken = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _appSettings.RuntimeCookieName);

            var requestHeaders = new Dictionary<string, string>
            {
                { "Authorization", $"Bearer {authzToken}" },
                { General.EFormidlingAccessTokenHeaderName, accessToken },
                { General.SubscriptionKeyHeaderName, _platformSettings.SubscriptionKey }
            };

            string instanceGuid = instance.Id.Split("/")[1];

            StandardBusinessDocument sbd = await ConstructStandardBusinessDocument(instanceGuid, instance);
            await _eFormidlingClient.CreateMessage(sbd, requestHeaders);

            (string metadataName, Stream stream) = await GenerateEFormidlingMetadata(instance);

            using (stream)
            {
                await _eFormidlingClient.UploadAttachment(stream, instanceGuid, metadataName, requestHeaders);
            }

            await SendInstanceData(instance, requestHeaders);

            bool shipmentResult = await _eFormidlingClient.SendMessage(instanceGuid, requestHeaders);

            if (!shipmentResult)
            {
                _logger.LogError("// AppBase // SendEFormidlingShipment // Shipment of instance {InstanceId} failed.", instance.Id);
            }
        }
    }
}
