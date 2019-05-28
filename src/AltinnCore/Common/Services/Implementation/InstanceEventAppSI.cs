using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Enums;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// service implementation for instance events for saving to and retrieving from Platform Storage
    /// </summary>
    public class InstanceEventAppSI : IInstanceEvent
    {
        private readonly PlatformSettings _platformSettings;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="InstanceEventAppSI"/> class.
        /// </summary>
        /// <param name="platformSettings">the platform settings</param>
        /// <param name="logger">The logger</param>
        public InstanceEventAppSI(IOptions<PlatformSettings> platformSettings, ILogger<InstanceEventAppSI> logger)
        {
            _platformSettings = platformSettings.Value;
            _logger = logger;
        }

        /// <inheritdoc/>
        public async Task<bool> DeleteAllInstanceEvents(string instanceId, string instanceOwnderId, string applicationOwnerId, string applicationId)
        {
            string apiUrl = $"{_platformSettings.GetApiStorageEndpoint}instances/{instanceId}/events";

            using (HttpClient client = new HttpClient())
            {
                client.BaseAddress = new Uri(apiUrl);

                try
                {
                    HttpResponseMessage response = await client.DeleteAsync(apiUrl);
                    response.EnsureSuccessStatusCode();
                    return true;
                }
                catch
                {
                    _logger.LogError($"Unable to delete instance events");
                    return false;
                }
            }
        }

        /// <inheritdoc/>
        public async Task<List<InstanceEvent>> GetInstanceEvents(string instanceId, string instanceOwnderId, string applicationOwnerId, string applicationId, string[] eventTypes, string from, string to)
        {
            string apiUri = $"{_platformSettings.GetApiStorageEndpoint}instances/{instanceId}/events?";

            if (eventTypes != null)
            {
                StringBuilder bld = new StringBuilder();
                foreach (string type in eventTypes)
                {
                    bld.Append($"&eventTypes={type}");
                }

                apiUri += bld.ToString();
            }

            if (!(string.IsNullOrEmpty(from) || string.IsNullOrEmpty(to)))
            {
                apiUri += $"&from={from}&to={to}";
            }

            using (HttpClient client = new HttpClient())
            {
                try
                {
                    HttpResponseMessage response = await client.GetAsync(apiUri);
                    string eventData = await response.Content.ReadAsStringAsync();
                    List<InstanceEvent> instanceEvents = JsonConvert.DeserializeObject<List<InstanceEvent>>(eventData);

                    return instanceEvents;
                }
                catch (Exception)
                {
                    _logger.LogError($"Unable to retrieve instance event");
                    return null;
                }
            }
        }

        /// <inheritdoc/>
        public async Task<string> SaveInstanceEvent(object dataToSerialize, string applicationOwnerId, string applicationId)
        {
            InstanceEvent instanceEvent = (InstanceEvent)dataToSerialize;
            instanceEvent.CreatedDateTime = DateTime.UtcNow;
            string apiUrl = $"{_platformSettings.GetApiStorageEndpoint}instances/{instanceEvent.InstanceId}/events";

            using (HttpClient client = new HttpClient())
            {
                client.BaseAddress = new Uri(apiUrl);
                client.DefaultRequestHeaders.Accept.Clear();
                client.DefaultRequestHeaders.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));

                try
                {
                    HttpResponseMessage response = await client.PostAsync(apiUrl, new StringContent(instanceEvent.ToString(), Encoding.UTF8, "application/json"));
                    string eventData = await response.Content.ReadAsStringAsync();
                    InstanceEvent result = JsonConvert.DeserializeObject<InstanceEvent>(eventData);
                    return result.Id.ToString();
                }
                catch
                {
                    _logger.LogError($"Unable to store instance event");
                    return null;
                }
            }
        }
    }
}
