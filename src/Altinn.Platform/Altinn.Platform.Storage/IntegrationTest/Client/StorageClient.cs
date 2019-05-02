using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
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
        private readonly string formId = "default";
        private readonly string versionPrefix = "api/storage/v1";
        private string hostName;

        /// <summary>
        /// Create a client.
        /// </summary>
        /// <param name="client">the http client</param>
        /// <param name="hostName">the host name</param>
        public StorageClient(HttpClient client, string hostName = "")
        {
            this.client = client;
            this.hostName = hostName;
        }

        /// <summary>
        /// Creates data from file.
        /// </summary>
        /// <param name="instanceId">a</param>
        /// <param name="instanceOwnerId">b</param>
        /// <param name="fileName">c</param>
        /// <param name="contentType">d</param>
        public async Task<bool> PostDataReadFromFile(string instanceId, int instanceOwnerId, string fileName, string contentType)
        {
            string requestUri = $"{versionPrefix}/instances/{instanceId}/data?formId={formId}&instanceOwnerId={instanceOwnerId}";
            
            using (Stream input = File.OpenRead($"data/{fileName}"))
            {
                HttpContent fileStreamContent = new StreamContent(input);

                using (MultipartFormDataContent formData = new MultipartFormDataContent())
                {
                    formData.Headers.ContentType = MediaTypeHeaderValue.Parse("application/pdf");
                    formData.Add(fileStreamContent, formId, fileName);

                    HttpResponseMessage response = await client.PostAsync(hostName + requestUri, formData);

                    response.EnsureSuccessStatusCode();

                    return true;
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
        public async void PostData(string instanceId, int instanceOwnerId, string fileName, string contentType, Dictionary<string, object> content)
        {
            string requestUri = $"{versionPrefix}/instances/{instanceId}/data?formId={formId}&instanceOwnerId={instanceOwnerId}";
            
            HttpResponseMessage response = await client.PostAsync(hostName + requestUri, content.AsJson());

            response.EnsureSuccessStatusCode();
        }

        /// <summary>
        /// Updates data.
        /// </summary>
        /// <param name="instanceId">a</param>
        /// <param name="dataId">xx</param>
        /// <param name="instanceOwnerId">b</param>
        /// <param name="fileName">c</param>
        /// <param name="contentType">d</param>
        /// <param name="content">f</param>
        public async void PutData(string instanceId, string dataId, int instanceOwnerId, string fileName, string contentType, Dictionary<string, string> content)
        {
            string requestUri = $"{versionPrefix}/instances/{instanceId}/data/{dataId}?formId={formId}&instanceOwnerId={instanceOwnerId}";

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
            string requestUri = $"{versionPrefix}/instances/{instanceId}/data/{dataId}?instanceOwnerId={instanceOwnerId}";
            
            HttpResponseMessage response = await client.GetAsync(hostName + requestUri);

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
        public async Task<Instance> GetInstances(string instanceId, int instanceOwnerId)
        {
            string requestUri = $"{versionPrefix}/instances/{instanceId}/?instanceOwnerId={instanceOwnerId}";
            
            HttpResponseMessage getInstanceResponse = await client.GetAsync(hostName + requestUri);
            string instanceData = await getInstanceResponse.Content.ReadAsStringAsync();
            Instance instance = JsonConvert.DeserializeObject<Instance>(instanceData);
            return instance;
        }

        /// <summary>
        /// Create an instance
        /// </summary>
        /// <param name="applicationId">a</param>
        /// <param name="instanceOwnerId">b</param>
        /// <returns></returns>
        public async Task<string> PostInstances(string applicationId, int instanceOwnerId)
        {
            string requestUri = $"{versionPrefix}/instances?applicationId={applicationId}&instanceOwnerId={instanceOwnerId}";
            
            HttpResponseMessage createInstanceResponse = await client.PostAsync(hostName + requestUri, string.Empty.AsJson());
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
