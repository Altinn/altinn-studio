using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using Altinn.Platform.Storage.IntegrationTest.Utils;
using Altinn.Platform.Storage.Interface.Models;
using Newtonsoft.Json;

namespace Altinn.Platform.Storage.IntegrationTest.Clients
{
    /// <summary>
    /// Client for managing application metadata.
    /// </summary>
    public class ApplicationClient
    {
        private readonly HttpClient _client;
        private readonly string _endpointUri;
        private readonly string _resourcePrefix = "storage/api/v1/applications";
        private readonly string _validToken;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="client">the http client to use</param>
        /// <param name="enpointUrl">the url of the endpoint</param>
        public ApplicationClient(HttpClient client, string enpointUrl = "")
        {
            _client = client;
            _endpointUri = enpointUrl;
            _validToken = PrincipalUtil.GetOrgToken("testOrg");
            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);
        }

        /// <summary>
        /// Creates and stores an application with an appId and a title.
        /// </summary>
        /// <param name="appId">the application id, e.g. test/app42</param>
        /// <param name="title">the title of the application</param>
        /// <returns></returns>
        public Application CreateApplication(string appId, LanguageString title)
        {
            Application application = new Application
            {
                Id = appId,
                Title = title,
                DataTypes = new List<DataType>()
            };

            DataType defaultElementType = new DataType
            {
                Id = "default",
                AllowedContentTypes = new List<string>() { "application/xml" }
            };

            application.DataTypes.Add(defaultElementType);

            return CreateApplication(application);                     
        }

        /// <summary>
        /// Stores application from an application instance.
        /// </summary>
        /// <param name="application">the application to store</param>
        /// <returns></returns>
        public Application CreateApplication(Application application)
        {
            string url = $"{_endpointUri}/{_resourcePrefix}?appId={application.Id}";
      
            HttpResponseMessage response = _client.PostAsync(url, content: application.AsJson()).Result;

            if (!response.IsSuccessStatusCode)
            {
                throw new StorageClientException($"POST failed: {response.StatusCode} - {response.Content?.ReadAsStringAsync()}");
            }
            
            string json = response.Content.ReadAsStringAsync().Result;
            Application result = JsonConvert.DeserializeObject<Application>(json);

            return result;
        }

        /// <summary>
        /// Updates and application
        /// </summary>
        /// <param name="application">the application that should be updated</param>
        /// <returns>the updated application</returns>
        public Application UpdateApplication(Application application)
        {
            string applicationId = application.Id;

            string url = $"{_endpointUri}/{_resourcePrefix}/{applicationId}";

            HttpResponseMessage response = _client.PutAsync(url, application.AsJson()).Result;

            if (!response.IsSuccessStatusCode)
            {
                throw new StorageClientException($"PUT failed: {response.StatusCode} - {response.Content?.ReadAsStringAsync()}");
            }
            
            string json = response.Content.ReadAsStringAsync().Result;        
            Application result = JsonConvert.DeserializeObject<Application>(json);

            return result;
        }

        /// <summary>
        /// Fetches the application with a given id.
        /// </summary>
        /// <param name="appId">the application id</param>
        /// <returns>the application object</returns>
        public Application GetApplication(string appId) 
        {
            string url = $"{_endpointUri}/{_resourcePrefix}/{appId}";

            HttpResponseMessage response = _client.GetAsync(url).Result;

            if (!response.IsSuccessStatusCode)
            {
                throw new StorageClientException($"GET failed: {response.StatusCode} - {response.Content?.ReadAsStringAsync()}");
            }

            string json = response.Content.ReadAsStringAsync().Result;
            Application result = JsonConvert.DeserializeObject<Application>(json);

            return result;
        }

        /// <summary>
        /// Deletes an application in storage.
        /// </summary>
        /// <param name="appId">the application ied</param>
        /// <returns>the application object that was deleted</returns>
        public Application DeleteApplication(string appId)
        {
            string url = $"{_endpointUri}/{_resourcePrefix}/{appId}?hard=true";

            HttpResponseMessage response = _client.DeleteAsync(url).Result;

            if (!response.IsSuccessStatusCode)
            {
                throw new StorageClientException($"DELETE failed: {response.StatusCode} - {response.Content?.ReadAsStringAsync()}");
            }
            
            string json = response.Content.ReadAsStringAsync().Result;
            Application result = JsonConvert.DeserializeObject<Application>(json);

            return result;
        }
    }
}
