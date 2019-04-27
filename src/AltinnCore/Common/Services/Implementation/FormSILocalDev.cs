using System;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;
using System.Xml.Serialization;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// Service implementation for form service
    /// </summary>
    public class FormSILocalDev : IForm
    {
        private readonly ServiceRepositorySettings _settings;
        private readonly GeneralSettings _generalSettings;
        private readonly TestdataRepositorySettings _testdataRepositorySettings;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger _logger;
        private const string SaveFormAttachmentApiMethod = "SaveFormAttachment";
        private const string DeleteFormAttachmentApiMethod = "DeleteFormAttachment";
        private const string GetFormAttachmentsApiMethod = "GetFormAttachments";

        /// <summary>
        /// Initializes a new instance of the <see cref="FormSILocalDev"/> class.
        /// </summary>
        /// <param name="repositorySettings">The service repository settings</param>
        /// <param name="httpContextAccessor">The http context accessor</param>
        /// <param name="testdataRepositorySettings">Test data repository settings</param>
        /// <param name="generalSettings">the general settings</param>
        /// <param name="logger">the logger</param>
        public FormSILocalDev(IOptions<ServiceRepositorySettings> repositorySettings, IHttpContextAccessor httpContextAccessor, IOptions<TestdataRepositorySettings> testdataRepositorySettings, IOptions<GeneralSettings> generalSettings, ILogger<FormSILocalDev> logger)
        {
            _settings = repositorySettings.Value;
            _httpContextAccessor = httpContextAccessor;
            _generalSettings = generalSettings.Value;
            _testdataRepositorySettings = testdataRepositorySettings.Value;
            _logger = logger;
        }

        /// <summary>
        /// Method that builds the deserialized object from prefill on disc
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="type">The type</param>
        /// <param name="partyId">The partyId</param>
        /// <param name="prefillkey">The prefill key</param>
        /// <returns>A deserialized prefilled form model</returns>
        public object GetPrefill(string org, string service, Type type, int partyId, string prefillkey)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string prefillFilePath = $"{_settings.GetTestdataForPartyPath(org, service, developer)}{partyId}/prefill/{prefillkey}.xml";
            try
            {
                using (Stream stream = File.Open(prefillFilePath, FileMode.Open, FileAccess.Read))
                {
                    XmlSerializer serializer = new XmlSerializer(type);
                    return serializer.Deserialize(stream);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError("Error occured when trying to fetch prefil: ", ex);
            }

            return null;
        }

        /// <summary>
        /// This method returns url of attachment upload from designer api
        /// </summary>
        /// <param name="org">The organization codefor the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="partyId">The partyId</param>
        /// <param name="formId">The form id</param>
        /// <param name="attachmentType">The attachment type id</param>
        /// <param name="attachmentName">The file name for the attachment</param>
        public string GetAttachmentUploadUrl(string org, string service, int partyId, Guid formId, string attachmentType, string attachmentName)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string baseEndpoint = Environment.GetEnvironmentVariable("GeneralSettings__AltinnStudioEndpoint") ?? _generalSettings.AltinnStudioEndpoint;
            string apiUrl = $"{_settings.GetRuntimeAPIPath(SaveFormAttachmentApiMethod, org, service, developer, partyId, baseEndpoint)}&instanceId={formId}&attachmentType={attachmentType}&attachmentName={attachmentName}";
            return apiUrl;
        }

        /// <summary>
        /// This method returns url of attachment deletion from designer api
        /// </summary>
        /// <param name="org">The organization codefor the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="partyId">The partyId</param>
        /// <param name="formId">The form id</param>
        /// <param name="attachmentType">The attachment type id</param>
        /// <param name="attachmentName">The file name for the attachment</param>
        /// <param name="attachmentId">The id for the attachment</param>
        public string GetAttachmentDeleteUrl(string org, string service, int partyId, Guid formId, string attachmentType, string attachmentName, string attachmentId)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string baseEndpoint = Environment.GetEnvironmentVariable("GeneralSettings__AltinnStudioEndpoint") ?? _generalSettings.AltinnStudioEndpoint;
            string apiUrl = $"{_settings.GetRuntimeAPIPath(DeleteFormAttachmentApiMethod, org, service, developer, partyId, baseEndpoint)}&instanceId={formId}&attachmentType={attachmentType}&attachmentName={attachmentName}&attachmentId={attachmentId}";
            return apiUrl;
        }

        /// <summary>
        /// This method returns url of attachment list from designer api
        /// </summary>
        /// <param name="org">The organization codefor the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="partyId">The partyId</param>
        /// <param name="formId">The form id</param>
        public string GetAttachmentListUrl(string org, string service, int partyId, Guid formId)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string baseEndpoint = Environment.GetEnvironmentVariable("GeneralSettings__AltinnStudioEndpoint") ?? _generalSettings.AltinnStudioEndpoint;
            string apiUrl = $"{_settings.GetRuntimeAPIPath(GetFormAttachmentsApiMethod, org, service, developer, partyId, baseEndpoint)}&instanceId={formId}";
            return apiUrl;
        }
    }
}
