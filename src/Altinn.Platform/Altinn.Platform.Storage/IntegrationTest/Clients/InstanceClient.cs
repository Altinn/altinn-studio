using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using Altinn.Platform.Storage.IntegrationTest.Utils;
using Altinn.Platform.Storage.Interface.Models;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Altinn.Platform.Storage.IntegrationTest.Clients
{
    /// <summary>
    /// Storage client methods.
    /// </summary>
    public class InstanceClient
    {
        private readonly HttpClient _client;
        private readonly string _versionPrefix = "storage/api/v1";
        private readonly string _hostName;
        private readonly string _validToken;

        /// <summary>
        /// Create a client.
        /// </summary>
        /// <param name="client">the http client</param>
        /// <param name="hostName">the host name</param>
        public InstanceClient(HttpClient client, string hostName = "")
        {
            _client = client;
            _hostName = hostName;
            _validToken = PrincipalUtil.GetToken(1);
            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);
        }

        /// <summary>
        /// Get an instance.
        /// </summary>
        /// <param name="instanceId">the instance id</param>
        /// <returns>the instance object</returns>
        public async Task<Instance> GetInstances(string instanceId)
        {
            string requestUri = $"{_versionPrefix}/instances/{instanceId}";

            HttpResponseMessage response = await _client.GetAsync(_hostName + requestUri);

            if (response.IsSuccessStatusCode)
            {
                string instanceData = await response.Content.ReadAsStringAsync();
                Instance instance = JsonConvert.DeserializeObject<Instance>(instanceData);
                return instance;
            }

            throw new StorageClientException($"GET error: {response.Content?.ReadAsStringAsync()}");
        }

        /// <summary>
        /// Get all instances for an org.
        /// </summary>
        /// <param name="org">the org id</param>
        /// <param name="size">the size of the collection to return.</param>
        /// <returns>the instance object</returns>
        public async Task<List<Instance>> GetInstancesForOrg(string org, int size = 100)
        {
            string requestUri = $"{_versionPrefix}/instances?org={org}&size={size}";

            HttpResponseMessage response = await _client.GetAsync(_hostName + requestUri);

            if (response.IsSuccessStatusCode)
            {
                string instanceData = await response.Content.ReadAsStringAsync();
                JObject jsonObject = JObject.Parse(instanceData);

                List<Instance> instances = jsonObject["instances"].ToObject<List<Instance>>();
                return instances;
            }

            throw new StorageClientException($"GET error: {response.Content?.ReadAsStringAsync()}");
        }

        /// <summary>
        /// Creates an instance
        /// </summary>
        /// <param name="appId">application id of the instance (must be registered in platform storage)</param>
        /// <param name="instanceOwnerPartyId">the instance owner id</param>
        /// <returns>the instance just created</returns>
        public async Task<Instance> PostInstances(string appId, int instanceOwnerPartyId)
        {
            string requestUri = $"{_versionPrefix}/instances?appId={appId}";

            HttpResponseMessage response = await _client.PostAsync(_hostName + requestUri, new Instance()
            {
                InstanceOwner = new InstanceOwner
                {
                    PartyId = instanceOwnerPartyId.ToString()
                }
            }.AsJson());
            if (response.IsSuccessStatusCode)
            {
                string json = await response.Content.ReadAsStringAsync();

                Instance instance = JsonConvert.DeserializeObject<Instance>(json);
                return instance;
            }

            throw new StorageClientException($"POST error: {response.Content?.ReadAsStringAsync()}");
        }

        /// <summary>
        /// Creates an instance
        /// </summary>
        /// <param name="appId">application id of the instance (must be registered in platform storage)</param>
        /// <param name="instanceTemplate">the instance template to base the instance on</param>
        /// <returns>the instance just created</returns>
        public async Task<Instance> PostInstances(string appId, Instance instanceTemplate)
        {
            string requestUri = $"{_versionPrefix}/instances?appId={appId}";

            HttpResponseMessage response = await _client.PostAsync(_hostName + requestUri, instanceTemplate.AsJson());
            if (response.IsSuccessStatusCode)
            {
                string json = await response.Content.ReadAsStringAsync();

                Instance instance = JsonConvert.DeserializeObject<Instance>(json);
                return instance;
            }

            throw new StorageClientException($"POST error: {response.Content?.ReadAsStringAsync()}");
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
            string requestUri = $"{_versionPrefix}/instances/{instanceId}/events?";
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

            HttpResponseMessage response = await _client.GetAsync(_hostName + requestUri);

            if (response.IsSuccessStatusCode)
            {
                string eventData = await response.Content.ReadAsStringAsync();
                List<InstanceEvent> instanceEvents = JsonConvert.DeserializeObject<List<InstanceEvent>>(eventData);
                return instanceEvents;
            }

            throw new StorageClientException($"GET error:  {response.Content?.ReadAsStringAsync()}");
        }

        /// <summary>
        /// Inserts new instance event into the instanceEvent collection.
        /// </summary>
        /// <param name="instanceEvent">Instance event to be stored. </param>
        /// <returns>The stored instance event.</returns>
        public async Task<string> PostInstanceEvent(InstanceEvent instanceEvent)
        {
            string requestUri = $"{_versionPrefix}/instances/{instanceEvent.InstanceId}/events";
            HttpResponseMessage response = await _client.PostAsync(_hostName + requestUri, new StringContent(instanceEvent.ToString(), Encoding.UTF8, "application/json"));

            if (response.IsSuccessStatusCode)
            {
                string newId = await response.Content.ReadAsStringAsync();
                return newId;
            }

            throw new StorageClientException($"POST error: {response.Content?.ReadAsStringAsync()}");
        }

        /// <summary>
        /// Deletes an instance (for testing purposes)
        /// </summary>
        /// <param name="instanceId">the id of the instance.</param>
        /// <returns>tru if deletion was successfull otherwise throws an exception</returns>
        public async Task<bool> DeleteInstance(string instanceId)
        {
            string requestUri = $"{_versionPrefix}/instances/{instanceId}?hard";

            HttpResponseMessage response = await _client.DeleteAsync(requestUri);

            if (response.IsSuccessStatusCode)
            {
                return true;
            }

            throw new StorageClientException($"DELETE error: {response.Content?.ReadAsStringAsync()}");
        }

        /// <summary>
        /// Deletes all events related to an instance id.
        /// </summary>
        /// <param name="instanceId">Id of instance to retrieve events for. </param>
        /// <returns>True if instance events were successfully deleted.</returns>
        public async Task<bool> DeleteInstanceEvents(string instanceId)
        {
            string requestUri = $"{_versionPrefix}/instances/{instanceId}/events";
            HttpResponseMessage response = await _client.DeleteAsync(requestUri);

            if (response.IsSuccessStatusCode)
            {
                return true;
            }

            throw new StorageClientException($"DELETE error: {response.Content?.ReadAsStringAsync()}");
        }

        /// <summary>
        /// Post a file as an atachment to storage.
        /// </summary>
        /// <returns>The HttpResponseMessage</returns>
        public async Task<HttpResponseMessage> PostFileAsAttachment(Instance instance, string dataType, string fileName, string contentType)
        {
            string requestUri = $"{_versionPrefix}/instances/{instance.Id}/data?dataType={dataType}";

            Stream input = File.OpenRead($"data/{fileName}");

            HttpContent fileStreamContent = new StreamContent(input);
            fileStreamContent.Headers.ContentType = MediaTypeHeaderValue.Parse($"{contentType}");
            fileStreamContent.Headers.Add("Content-Disposition", $"attachment; filename={fileName}");

            await fileStreamContent.LoadIntoBufferAsync();
            HttpResponseMessage response = await _client.PostAsync(requestUri, fileStreamContent);

            return response;
        }

        /// <summary>
        /// Post a data file as a stream content to storage.
        /// </summary>
        /// <returns>http response message</returns>
        public async Task<HttpResponseMessage> PostFileAsStream(Instance instance, string dataType, string fileName, string contentType)
        {
            string requestUri = $"{_versionPrefix}/instances/{instance.Id}/data?dataType={dataType}";

            Stream input = File.OpenRead($"data/{fileName}");

            HttpContent fileStreamContent = new StreamContent(input);
            fileStreamContent.Headers.ContentType = MediaTypeHeaderValue.Parse($"{contentType}");
            fileStreamContent.Headers.Add("Content-Disposition", $"attachment; filename={fileName}");
            HttpResponseMessage response = await _client.PostAsync(requestUri, fileStreamContent);

            return response;
        }

        /// <summary>
        /// Post file as attachment.
        /// </summary>
        /// <returns>the data element</returns>
        public async Task<DataElement> PostFileAsAttachmentAndReturnMetadata(Instance instance, string dataType, string fileName, string contentType)
        {
            HttpResponseMessage response = await PostFileAsAttachment(instance, dataType, fileName, contentType);

            return JsonConvert.DeserializeObject<DataElement>(await response.Content.ReadAsStringAsync());
        }
    }
}
