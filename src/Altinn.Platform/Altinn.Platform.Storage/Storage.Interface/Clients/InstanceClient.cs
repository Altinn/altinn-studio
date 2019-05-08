using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using Newtonsoft.Json;
using Storage.Interface.Clients;

namespace Altinn.Platform.Storage.Client
{
    /// <summary>
    /// Storage client methods.
    /// </summary>
    public class InstanceClient
    {
        private HttpClient client;
        private readonly string formId = "default";
        private readonly string versionPrefix = "storage/api/v1";
        private readonly string hostName;

        /// <summary>
        /// Create a client.
        /// </summary>
        /// <param name="client">the http client</param>
        /// <param name="hostName">the host name</param>
        public InstanceClient(HttpClient client, string hostName = "")
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
        /// <param name="content">content as json</param>
        public async void PutData(string instanceId, string dataId, int instanceOwnerId, string fileName, string contentType, Dictionary<string, string> content)
        {
            string requestUri = $"{versionPrefix}/instances/{instanceId}/data/{dataId}?formId={formId}&instanceOwnerId={instanceOwnerId}";

            HttpResponseMessage response = await client.PutAsync(requestUri, content.AsJson());

            response.EnsureSuccessStatusCode();
        }

        /// <summary>
        ///  Gets data
        /// </summary>
        /// <param name="instanceId">a</param>
        /// <param name="dataId">aa</param>
        /// <param name="instanceOwnerId">b</param>
        /// <returns>Content as byte array</returns>
        public async Task<byte[]> GetData(string instanceId, string dataId, int instanceOwnerId)
        {
            string requestUri = $"{versionPrefix}/instances/{instanceId}/data/{dataId}?instanceOwnerId={instanceOwnerId}";

            HttpResponseMessage response = await client.GetAsync(hostName + requestUri);

            response.EnsureSuccessStatusCode();

            return await response.Content.ReadAsByteArrayAsync();            
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

        /// <summary>
        /// Retrieves all instance events related to given instance id, listed event types and given time frame from instanceEvent collection.
        /// </summary>
        /// <param name="instanceId"> Id of instance to retrieve events for. </param>
        /// <param name="eventTypes">List of event types to filter the events by./param>
        /// <param name="from"> Lower bound for DateTime span to filter events by. Utc format and invariantCulture. </param>
        /// <param name="to"> Upper bound for DateTime span to filter events by. Utc format and invariantCulture. </param>
        /// <returns>List of intance events.</returns>
        public async Task<List<InstanceEvent>> GetInstanceEvents(string instanceId, string[] eventTypes, string from, string to)
        {
            string requestUri = $"{versionPrefix}/instances/{instanceId}/events?";
            if (!(eventTypes == null))
            {
                foreach (string type in eventTypes)
                {
                    requestUri += $"&eventTypes={type}";
                }
            }

            if (!(string.IsNullOrEmpty(from) || string.IsNullOrEmpty(to)))
            {
                requestUri += $"&from={from}&to={to}";
            }

            HttpResponseMessage response = await client.GetAsync(hostName + requestUri);
            string eventData = await response.Content.ReadAsStringAsync();
            List<InstanceEvent> instanceEvents = JsonConvert.DeserializeObject<List<InstanceEvent>>(eventData);
            return instanceEvents;
        }

        /// <summary>
        /// Inserts new instance event into the instanceEvent collection.
        /// </summary>
        /// <param name="instanceEvent">Instance event to be stored. </param>
        /// <returns>The stored instance event.</returns>
        public async Task<string> PostInstanceEvent(InstanceEvent instanceEvent)
        {
            string requestUri = $"{versionPrefix}/instances/{instanceEvent.InstanceId}/events";
            HttpResponseMessage response = await client.PostAsync(hostName + requestUri, new StringContent(instanceEvent.ToString(), Encoding.UTF8, "application/json"));
            string newId = await response.Content.ReadAsStringAsync();
            return newId;
        }

        /// <summary>
        /// Deletes all events related to an instance id.
        /// </summary>
        /// <param name="instanceId">Id of instance to retrieve events for. </param>
        /// <returns>True if instance events were successfully deleted.</returns>
        public async Task<bool> DeleteInstanceEvents(string instanceId)
        {
            string requestUri = $"{versionPrefix}/instances/{instanceId}/events";
            HttpResponseMessage response = await client.DeleteAsync(requestUri);
            response.EnsureSuccessStatusCode();
            return true;
        }
    }
}
