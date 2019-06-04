using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Enums;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// service implementation for instance events for saving to and retrieving from disk
    /// </summary>
    public class InstanceEventStudioSI : IInstanceEvent
    {
        private readonly ServiceRepositorySettings _settings;
        private readonly IHttpContextAccessor _httpContextAccessor;

        /// <summary>
        /// Initializes a new instance of the <see cref="InstanceEventStudioSI"/> class.
        /// </summary>
        /// <param name="repositorySettings">repository settings</param>
        /// <param name="httpContextAccessor">The http context accessor</param>
        public InstanceEventStudioSI(
            IOptions<ServiceRepositorySettings> repositorySettings,
            IHttpContextAccessor httpContextAccessor)
        {
            _settings = repositorySettings.Value;
            _httpContextAccessor = httpContextAccessor;
        }

        /// <inheritdoc/>
        public Task<bool> DeleteAllInstanceEvents(string instanceId, string instanceOwnerId, string org, string appName)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string testDataForParty = _settings.GetTestdataForPartyPath(org, appName, developer);
            string folderForEvents = $"{testDataForParty}{instanceOwnerId}/{instanceId}/events";

            if (Directory.Exists(folderForEvents))
            {
                Directory.Delete(folderForEvents, true);
            }

            return Task.FromResult(true);
        }

        /// <inheritdoc/>
        public Task<List<InstanceEvent>> GetInstanceEvents(string instanceId, string instanceOwnerId, string org, string appName, string[] eventTypes, string from, string to)
        {  
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string testDataForParty = _settings.GetTestdataForPartyPath(org, appName, developer);
            string folderForEvents = $"{testDataForParty}{instanceOwnerId}/{instanceId}/events";
            DateTime? fromDateTime = null, toDateTime = null;
            List<InstanceEvent> events = new List<InstanceEvent>();

            if (!(string.IsNullOrEmpty(from) || string.IsNullOrEmpty(to)))
            {
                try
                {
                    fromDateTime = DateTime.ParseExact(from, "s", CultureInfo.InvariantCulture);
                    toDateTime = DateTime.ParseExact(to, "s", CultureInfo.InvariantCulture);
                }
                catch
                {
                    throw new Exception("Unable to perform query. Invalid format for time span. Use string format of UTC.");
                }
            }

            if (Directory.Exists(folderForEvents))
            {
                foreach (string file in Directory.EnumerateFiles(folderForEvents, "*.json"))
                {
                    string instanceData = File.ReadAllText(file, Encoding.UTF8);
                    InstanceEvent item = JsonConvert.DeserializeObject<InstanceEvent>(instanceData);
                    events.Add(item);
                }
            }

            IQueryable<InstanceEvent> result = events.AsQueryable();

            if (eventTypes != null && eventTypes.Length > 0 && events.Count() > 0)
            {
               result = result.Where(e => eventTypes.Contains(e.EventType));                
            }

            if (fromDateTime.HasValue && toDateTime.HasValue && events.Count() > 0)
            {
              result = result.Where(e => fromDateTime < e.CreatedDateTime && toDateTime > e.CreatedDateTime);
            }

            return Task.FromResult(result.ToList());
        }

        /// <inheritdoc/>
        public Task<string> SaveInstanceEvent(object dataToSerialize, string org, string appName)
        {
            InstanceEvent instanceEvent = (InstanceEvent)dataToSerialize;
            instanceEvent.Id = Guid.NewGuid();
            instanceEvent.CreatedDateTime = DateTime.UtcNow;

            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string testDataForParty = _settings.GetTestdataForPartyPath(org, appName, developer);
            string folderForEvents = $"{testDataForParty}{instanceEvent.InstanceOwnerId}/{instanceEvent.InstanceId}/events";
            Directory.CreateDirectory(folderForEvents);
            string eventFilePath = $"{folderForEvents}/{instanceEvent.Id}.json";

            File.WriteAllText(eventFilePath, instanceEvent.ToString(), Encoding.UTF8);

            return Task.FromResult(instanceEvent.Id.ToString());
        }
    }
}
