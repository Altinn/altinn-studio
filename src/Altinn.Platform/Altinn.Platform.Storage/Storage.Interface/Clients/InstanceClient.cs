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
        private readonly HttpClient client;
        private readonly string elementType = "default";
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
        /// <param name="fileName">c</param>
        /// <param name="contentType">d</param>
        public async Task<Instance> PostDataReadFromFile(string instanceId, string fileName, string contentType)
        {
            string requestUri = $"{versionPrefix}/instances/{instanceId}/data?elementType={elementType}";

            using (Stream input = File.OpenRead($"data/{fileName}"))
            {
                HttpContent fileStreamContent = new StreamContent(input);

                using (MultipartFormDataContent formData = new MultipartFormDataContent())
                {
                    formData.Headers.ContentType = MediaTypeHeaderValue.Parse("application/pdf");
                    formData.Add(fileStreamContent, elementType, fileName);

                    HttpResponseMessage response = await client.PostAsync(hostName + requestUri, formData);

                    if (response.IsSuccessStatusCode)
                    {
                        string json = response.Content.ReadAsStringAsync().Result;
                        return JsonConvert.DeserializeObject<Instance>(json);
                    }

                    throw new StorageClientException($"Http error: {response.ReasonPhrase}");                    
                }
            }

        }

        /// <summary>
        /// Creates data.
        /// </summary>
        /// <param name="instanceId">a</param>
        /// <param name="fileName">c</param>
        /// <param name="contentType">d</param>
        /// <param name="content">f</param>
        public async Task<Instance> PostData(string instanceId,string fileName, string contentType, Dictionary<string, object> content)
        {
            string requestUri = $"{versionPrefix}/instances/{instanceId}/data?elementType={elementType}";

            HttpResponseMessage response = await client.PostAsync(hostName + requestUri, content.AsJson());

            if (response.IsSuccessStatusCode)
            {
                string json = response.Content.ReadAsStringAsync().Result;
                return JsonConvert.DeserializeObject<Instance>(json);
            }

            throw new StorageClientException($"POST error: {response.ReasonPhrase}");
        }

        /// <summary>
        /// Updates data.
        /// </summary>
        /// <param name="instanceId">the instance id</param>
        /// <param name="dataId">the data id</param>
        /// <param name="fileName">a file name</param>
        /// <param name="contentType">content type</param>
        /// <param name="content">content as json</param>
        public async Task<Instance> PutData(string instanceId, string dataId,  string fileName, string contentType, Dictionary<string, string> content)
        {
            string requestUri = $"{versionPrefix}/instances/{instanceId}/data/{dataId}?elementType={elementType}";

            HttpResponseMessage response = await client.PutAsync(requestUri, content.AsJson());

            if (response.IsSuccessStatusCode)
            {
                string json = response.Content.ReadAsStringAsync().Result;
                return JsonConvert.DeserializeObject<Instance>(json);            
            }

            throw new StorageClientException($"PUT error: {response.ReasonPhrase}");
        }

        /// <summary>
        ///  Gets a data element.
        /// </summary>
        /// <param name="instanceId">the instance id</param>
        /// <param name="dataId">the data id</param>
        /// <returns>the data content as byte array</returns>
        public async Task<byte[]> GetData(string instanceId, string dataId)
        {
            string requestUri = $"{versionPrefix}/instances/{instanceId}/data/{dataId}";

            HttpResponseMessage response = await client.GetAsync(hostName + requestUri);

            if (response.IsSuccessStatusCode)
            {
                response.EnsureSuccessStatusCode();

                return await response.Content.ReadAsByteArrayAsync();
            }

            throw new StorageClientException($"GET error: {response.ReasonPhrase}");
        }

        /// <summary>
        /// Get an instance.
        /// </summary>
        /// <param name="instanceId">the instance id</param>
        /// <returns>the instance object</returns>
        public async Task<Instance> GetInstances(string instanceId)
        {
            string requestUri = $"{versionPrefix}/instances/{instanceId}";

            HttpResponseMessage response = await client.GetAsync(hostName + requestUri);

            if (response.IsSuccessStatusCode)
            {
                string instanceData = await response.Content.ReadAsStringAsync();
                Instance instance = JsonConvert.DeserializeObject<Instance>(instanceData);
                return instance;
            }

            throw new StorageClientException($"GET error: {response.ReasonPhrase}");
        }

        /// <summary>
        /// Creates an instance
        /// </summary>
        /// <param name="appId">application id of the instance (must be registered in platform storage)</param>
        /// <param name="instanceOwnerId">the instance owner id</param>
        /// <returns>the instance just created</returns>
        public async Task<Instance> PostInstances(string appId, int instanceOwnerId)
        {
            string requestUri = $"{versionPrefix}/instances?appId={appId}&instanceOwnerId={instanceOwnerId}";

            HttpResponseMessage response = await client.PostAsync(hostName + requestUri, new Instance().AsJson());
            if (response.IsSuccessStatusCode)
            {
                string json = await response.Content.ReadAsStringAsync();

                Instance instance = JsonConvert.DeserializeObject<Instance>(json);
                return instance;
            }

            throw new StorageClientException($"POST error: {response.ReasonPhrase}");
        }

        /// <summary>
        /// Retrieves all instance events related to given instance, listed event types and given time frame from instanceEvent collection.
        /// </summary>
        /// <param name="instanceId"> Id of instance to retrieve events for. </param>
        /// <param name="eventTypes">List of event types to filter the events by.</param>
        /// <param name="from"> Lower bound for DateTime span to filter events by. Utc format and invariantCulture. </param>
        /// <param name="to"> Upper bound for DateTime span to filter events by. Utc format and invariantCulture. </param>
        /// <returns>List of intance events.</returns>
        public async Task<List<InstanceEvent>> GetInstanceEvents(string instanceId, string[] eventTypes, string from, string to)
        {
            string requestUri = $"{versionPrefix}/instances/{instanceId}/events?";
            if (eventTypes != null)
            {
                StringBuilder eventTypeList = new StringBuilder();
                foreach (string type in eventTypes)
                {
                    if (eventTypeList.Length >= 1)
                    {
                        eventTypeList.Append(",");
                    }
                    eventTypeList.Append(type);
                }

                requestUri += $"&eventTypes={eventTypeList.ToString()}";
            }

            if (!(string.IsNullOrEmpty(from) || string.IsNullOrEmpty(to)))
            {
                requestUri += $"&from={from}&to={to}";
            }

            HttpResponseMessage response = await client.GetAsync(hostName + requestUri);

            if (response.IsSuccessStatusCode)
            {
                string eventData = await response.Content.ReadAsStringAsync();
                List<InstanceEvent> instanceEvents = JsonConvert.DeserializeObject<List<InstanceEvent>>(eventData);
                return instanceEvents;
            }

            throw new StorageClientException($"GET error:  {response.ReasonPhrase}");
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

            if (response.IsSuccessStatusCode)
            {
                string newId = await response.Content.ReadAsStringAsync();
                return newId;
            }

            throw new StorageClientException($"POST error: {response.ReasonPhrase}");
        
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

            if (response.IsSuccessStatusCode)
            {
                return true;
            }

            throw new StorageClientException($"DELETE error: {response.ReasonPhrase}");
        }
    }
}
