using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Enums;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// service implementation for instance events for saving to and retrieving from Platform Storage
    /// </summary>
    public class InstanceEventAppSI : IInstanceEvent
    {
        private readonly PlatformStorageSettings _platformStorageSettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="InstanceEventAppSI"/> class.
        /// </summary>
        /// <param name="platformStorageSettings">the platform storage settings</param>
        public InstanceEventAppSI(IOptions<PlatformStorageSettings> platformStorageSettings)
        {
            _platformStorageSettings = platformStorageSettings.Value;
        }

        /// <inheritdoc/>
        public async Task<bool> DeleteAllInstanceEvents(string instanceId, string instanceOwnderId, string applicationOwnerId, string applicationId)
        {
            using (HttpClient client = new HttpClient())
            {
                string apiUrl = $"{_platformStorageSettings.ApiUrl}/instances/{instanceId}/events";
                client.BaseAddress = new Uri(apiUrl);              

                try
                {                 
                    HttpResponseMessage response = await client.DeleteAsync(apiUrl);
                    response.EnsureSuccessStatusCode();
                    return true;
                }
                catch
                {
                    throw new Exception("Unable to delete instance events");
                }
            }
        }

        /// <inheritdoc/>
        public Task<List<InstanceEvent>> GetInstanceEvents(string instanceId, string instanceOwnderId, string applicationOwnerId, string applicationId, string[] eventTypes, string from, string to)
        {
            throw new NotImplementedException();
        }

        /// <inheritdoc/>
        public async Task<string> SaveInstanceEvent(object dataToSerialize, string applicationOwnerId, string applicationId)
        {
            InstanceEvent instanceEvent = (InstanceEvent)dataToSerialize;
            instanceEvent.CreatedDateTime = DateTime.UtcNow;

            using (HttpClient client = new HttpClient())
            {
                string apiUrl = $"{_platformStorageSettings.ApiUrl}/instances/{instanceEvent.InstanceId}/events";
                client.BaseAddress = new Uri(apiUrl);
                client.DefaultRequestHeaders.Accept.Clear();
                client.DefaultRequestHeaders.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));

                try
                {
                    HttpResponseMessage response = await client.PostAsync(apiUrl, new StringContent(instanceEvent.ToString(), Encoding.UTF8));
                    string eventData = await response.Content.ReadAsStringAsync();
                    InstanceEvent result = JsonConvert.DeserializeObject<InstanceEvent>(eventData);
                    return result.Id.ToString();
                }
                catch
                {
                    throw new Exception("Unable to store instance event");
                }
            }
        }
    }
}
