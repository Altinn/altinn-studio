using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using LocalTest.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace LocalTest.Services.Storage.Implementation
{
    public class InstanceEventRepository : IInstanceEventRepository
    {
        private readonly LocalPlatformSettings _localPlatformSettings;

        public InstanceEventRepository(IOptions<LocalPlatformSettings> localPlatformSettings)
        {
            _localPlatformSettings = localPlatformSettings.Value;
        }

        public Task<int> DeleteAllInstanceEvents(string instanceId)
        {
            throw new NotImplementedException();
        }

        public Task<InstanceEvent> GetOneEvent(string instanceId, Guid eventGuid)
        {
            throw new NotImplementedException();
        }

        public Task<InstanceEvent> InsertInstanceEvent(InstanceEvent instanceEvent, Instance instance = null)
        {
            instanceEvent.Id = Guid.NewGuid();

            string path = GetInstanceEventPath(instanceEvent.InstanceId, instanceEvent.Id.Value);
            Directory.CreateDirectory(GetInstanceEventFolder());
            File.WriteAllText(path, instanceEvent.ToString());

            return Task.FromResult(instanceEvent);
        }

        public Task<List<InstanceEvent>> ListInstanceEvents(string instanceId, string[] eventTypes, DateTime? fromDateTime, DateTime? toDateTime)
        {
            List<InstanceEvent> instanceEvents = new List<InstanceEvent>();

            string instanceEventPath = GetInstanceEventFolder();

            if (Directory.Exists(instanceEventPath))
            {
                string[] files = Directory.GetFiles(instanceEventPath, "*.json");

                foreach (var file in files)
                {
                    string content = File.ReadAllText(file);
                    InstanceEvent instanceEvent = (InstanceEvent)JsonConvert.DeserializeObject(content, typeof(InstanceEvent));
                    if (instanceEvent != null && instanceEvent.Id != null && instanceEvent.InstanceId == instanceId)
                    {
                        instanceEvents.Add(instanceEvent);
                    }
                }
            }

            if (fromDateTime != null)
            {
                instanceEvents.RemoveAll(i => i.Created < fromDateTime);
            }

            if (toDateTime != null)
            {
                instanceEvents.RemoveAll(i => i.Created > toDateTime);
            }

            if ((eventTypes?.Length ?? 0) > 0)
            {
                instanceEvents = instanceEvents.Where(i => eventTypes.Contains(i.EventType)).ToList();
            }

            return Task.FromResult(instanceEvents);
        }

        private string GetInstanceEventPath(string instanceId, Guid instanceEventID)
        {
            if (string.IsNullOrEmpty(instanceId))
            {
                throw new ArgumentException("Instance ID cannot be null or empty");
            }
            if (instanceEventID == Guid.Empty)
            {
                throw new ArgumentException("Instance event ID cannot be null or empty");
            }
            return GetInstanceEventFolder() + instanceId.Replace("/", "_") + "_" + instanceEventID.ToString() + ".json";
        }

        private string GetInstanceEventFolder()
        {
            return _localPlatformSettings.LocalTestingStorageBasePath + _localPlatformSettings.DocumentDbFolder + _localPlatformSettings.InstanceEventsCollectionFolder;
        }
    }
}
