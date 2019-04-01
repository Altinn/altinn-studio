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
using Microsoft.Extensions.Options;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// Service implementation for form service
    /// </summary>
    public class FormSILocalDev : IForm
    {
        private readonly ServiceRepositorySettings _settings;
        private readonly TestdataRepositorySettings _testdataRepositorySettings;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private const string GetFormModelApiMethod = "GetFormModel";
        private const string SaveFormModelApiMethod = "SaveFormModel";
        private const string GetPrefillApiMethod = "GetPrefill";
        private const string SaveFormAttachmentApiMethod = "SaveFormAttachment";
        private const string DeleteFormAttachmentApiMethod = "DeleteFormAttachment";
        private const string GetFormAttachmentsApiMethod = "GetFormAttachments";

        /// <summary>
        /// Initializes a new instance of the <see cref="FormSILocalDev"/> class.
        /// </summary>
        /// <param name="repositorySettings">The service repository settings</param>
        /// <param name="httpContextAccessor">The http context accessor</param>
        /// <param name="testdataRepositorySettings">Test data repository settings</param>
        public FormSILocalDev(IOptions<ServiceRepositorySettings> repositorySettings, IHttpContextAccessor httpContextAccessor, IOptions<TestdataRepositorySettings> testdataRepositorySettings)
        {
            _settings = repositorySettings.Value;
            _httpContextAccessor = httpContextAccessor;
            this._testdataRepositorySettings = testdataRepositorySettings.Value;
        }

        /// <summary>
        /// Method that creates the form model object based on serialized data on disk.
        /// </summary>
        /// <param name="instanceId">The instance id</param>
        /// <param name="type">The type that form data will be serialized to</param>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="partyId">The partyId used to find the party on disc</param>
        /// <param name="developer">The name of the developer if any</param>
        /// <returns>The deserialized form model</returns>
        public object GetFormModel(Guid instanceId, Type type, string org, string service, int partyId, string developer = null)
        {
            string apiUrl = $"{_settings.GetRuntimeAPIPath(GetFormModelApiMethod, org, service, developer, partyId)}&instanceId={instanceId}";
            using (HttpClient client = AuthenticationHelper.GetDesignerHttpClient(_httpContextAccessor.HttpContext, _testdataRepositorySettings.GetDesignerHost()))
            {
                client.BaseAddress = new Uri(apiUrl);
                Task<HttpResponseMessage> response = client.GetAsync(apiUrl);
                if (response.Result.IsSuccessStatusCode)
                {
                    XmlSerializer serializer = new XmlSerializer(type);
                    try
                    {
                        using (Stream stream = response.Result.Content.ReadAsStreamAsync().Result)
                        {
                            return serializer.Deserialize(stream);
                        }
                    }
                    catch
                    {
                        return Activator.CreateInstance(type);
                    }
                }
                else
                {
                    return Activator.CreateInstance(type);
                }
            }
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
            string apiUrl = $"{_settings.GetRuntimeAPIPath(GetPrefillApiMethod, org, service, developer, partyId)}&prefillkey={prefillkey}";
            using (HttpClient client = AuthenticationHelper.GetDesignerHttpClient(_httpContextAccessor.HttpContext, _testdataRepositorySettings.GetDesignerHost()))
            {
                client.BaseAddress = new Uri(apiUrl);
                Task<HttpResponseMessage> response = client.GetAsync(apiUrl);
                if (response.Result.IsSuccessStatusCode)
                {
                    XmlSerializer serializer = new XmlSerializer(type);
                    try
                    {
                        using (Stream stream = response.Result.Content.ReadAsStreamAsync().Result)
                        {
                            return serializer.Deserialize(stream);
                        }
                    }
                    catch
                    {
                        return null;
                    }
                }
                else
                {
                    return null;
                }
            }
        }

        /// <summary>
        /// This method serialized the form model and store it in test data folder based on serviceId and partyId
        /// </summary>
        /// <typeparam name="T">The input type</typeparam>
        /// <param name="dataToSerialize">The data to serialize</param>
        /// <param name="instanceId">The formId</param>
        /// <param name="type">The type</param>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="partyId">The partyId</param>
        public async Task<Guid> SaveFormModel<T>(T dataToSerialize, Guid instanceId, Type type, string org, string service, int partyId, Guid dataId)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string apiUrl = $"{_settings.GetRuntimeAPIPath(SaveFormModelApiMethod, org, service, developer, partyId)}&instanceId={instanceId}";
            if (dataId != Guid.Empty)
            {
                apiUrl = $"{apiUrl}&dataId={dataId}";
            }

            using (HttpClient client = AuthenticationHelper.GetDesignerHttpClient(_httpContextAccessor.HttpContext, _testdataRepositorySettings.GetDesignerHost()))
            {
                client.BaseAddress = new Uri(apiUrl);
                XmlSerializer serializer = new XmlSerializer(type);
                using (MemoryStream stream = new MemoryStream())
                {
                    serializer.Serialize(stream, dataToSerialize);
                    stream.Position = 0;
                    Task<HttpResponseMessage> response = client.PostAsync(apiUrl, new StreamContent(stream));
                    if (!response.Result.IsSuccessStatusCode)
                    {
                        throw new Exception("Unable to save form model");
                    }

                    return Guid.Parse(await response.Result.Content.ReadAsAsync<string>());
                }
            }
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
            string apiUrl = $"{_settings.GetRuntimeAPIPath(SaveFormAttachmentApiMethod, org, service, developer, partyId)}&instanceId={formId}&attachmentType={attachmentType}&attachmentName={attachmentName}";
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
            string apiUrl = $"{_settings.GetRuntimeAPIPath(DeleteFormAttachmentApiMethod, org, service, developer, partyId)}&instanceId={formId}&attachmentType={attachmentType}&attachmentName={attachmentName}&attachmentId={attachmentId}";
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
            string apiUrl = $"{_settings.GetRuntimeAPIPath(GetFormAttachmentsApiMethod, org, service, developer, partyId)}&instanceId={formId}";
            return apiUrl;
        }
    }
}
