using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Client
{
    /// <summary>
    /// Storage client methods.
    /// </summary>
    public class StorageClient
    {
        HttpClient client;

        public StorageClient(HttpClient client)
        {
            this.client = client;
        }

        /// <summary>
        /// Creates data from file.
        /// </summary>
        /// <param name="instanceId">a</param>
        /// <param name="instanceOwnerId">b</param>
        /// <param name="fileName">c</param>
        /// <param name="contentType">d</param>
        public async void CreateDataFromFile(string instanceId, int instanceOwnerId, string fileName, string contentType)
        {
            string urlTemplate = "api/v1/instances/{0}/data?formId=crewlist&instanceOwnerId={1}";
            string requestUri = string.Format(urlTemplate, instanceId, instanceOwnerId);

            using (Stream input = File.OpenRead($"data/{fileName}"))
            {
                HttpContent fileStreamContent = new StreamContent(input);

                using (MultipartFormDataContent formData = new MultipartFormDataContent())
                {
                    formData.Add(fileStreamContent, "crewlist", fileName);

                    HttpResponseMessage response = await client.PostAsync(requestUri, formData);

                    response.EnsureSuccessStatusCode();
                }
            }
        }

        /// <summary>
        /// Creates data.
        /// </summary>
        /// <param name="instanceId">a</param>
        /// <param name="instanceOwnerId">b</param>
        /// <param name="fileName">c</param>
        /// <param name="contentType">d</param>
        /// <param name="content">f</param>
        public async void CreateData(string instanceId, int instanceOwnerId, string fileName, string contentType, Dictionary<string, object> content)
        {
            string urlTemplate = "api/v1/instances/{0}/data?formId=crewlist&instanceOwnerId={1}";
            string requestUri = string.Format(urlTemplate, instanceId, instanceOwnerId);

            HttpResponseMessage response = await client.PostAsync(requestUri, content.AsJson());

            response.EnsureSuccessStatusCode();
        }

        /// <summary>
        /// Creates data.
        /// </summary>
        /// <param name="instanceId">a</param>
        /// <param name="dataId">xx</param>
        /// <param name="instanceOwnerId">b</param>
        /// <param name="fileName">c</param>
        /// <param name="contentType">d</param>
        /// <param name="content">f</param>
        public async void UpdateData(string instanceId, string dataId, int instanceOwnerId, string fileName, string contentType, Dictionary<string, string> content)
        {
            string urlTemplate = "api/v1/instances/{0}/data/{1}?formId=crewlist&instanceOwnerId={2}";
            string requestUri = string.Format(urlTemplate, instanceId, dataId, instanceOwnerId);

            HttpResponseMessage response = await client.PutAsync(requestUri, content.AsJson());

            response.EnsureSuccessStatusCode();
        }

        /// <summary>
        /// Creates data.
        /// </summary>
        /// <param name="instanceId">a</param>
        /// <param name="dataId">aa</param>
        /// <param name="instanceOwnerId">b</param>
        public async Task<Dictionary<string, string>> GetData(string instanceId, string dataId, int instanceOwnerId)
        {
            string urlTemplate = "api/v1/instances/{0}/data/{1}?instanceOwnerId={2}";
            string requestUri = string.Format(urlTemplate, instanceId, dataId, instanceOwnerId);

            HttpResponseMessage response = await client.GetAsync(requestUri);

            response.EnsureSuccessStatusCode();

            Dictionary<string, string> result = await response.Content.ReadAsAsync<Dictionary<string, string>>();

            return result;
        }

        /// <summary>
        /// Get an instance.
        /// </summary>
        /// <param name="instanceId">a</param>
        /// <param name="instanceOwnerId">b</param>
        /// <returns></returns>
        public async Task<Instance> GetInstance(string instanceId, int instanceOwnerId)
        {
            string urlTemplate = "api/v1/instances/{0}/?instanceOwnerId={1}";
            string url = string.Format(urlTemplate, instanceId, instanceOwnerId);

            HttpResponseMessage getInstanceResponse = await client.GetAsync(url);
            Instance instance = await getInstanceResponse.Content.ReadAsAsync<Instance>();

            return instance;
        }

        /// <summary>
        /// Create an instance
        /// </summary>
        /// <param name="applicationId">a</param>
        /// <param name="instanceOwnerId">b</param>
        /// <returns></returns>
        public async Task<string> CreateInstance(string applicationId, int instanceOwnerId)
        {
            string urlTemplate = "api/v1/instances?applicationId={0}&instanceOwnerId={1}";
            string url = string.Format(urlTemplate, applicationId, instanceOwnerId);

            HttpResponseMessage createInstanceResponse = await client.PostAsync(url, string.Empty.AsJson());
            string newId = await createInstanceResponse.Content.ReadAsStringAsync();

            return newId;
        }
    }

    /// <summary>
    /// Class to wrap a json object into a StringContent with correct encoding and content type.
    /// </summary>
    public static class Extensions
    {
        /// <summary>
        ///  Wrapper method.
        /// </summary>
        /// <param name="o">the json object to wrap.</param>
        /// <returns>a StringContent object.</returns>
        public static StringContent AsJson(this object o)
        => new StringContent(JsonConvert.SerializeObject(o), Encoding.UTF8, "application/json");
    }
}
