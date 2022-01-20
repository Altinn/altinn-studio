using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using LocalTest.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
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

        public Task<InstanceEvent> InsertInstanceEvent(InstanceEvent instanceEvent)
        {
            instanceEvent.Id = Guid.NewGuid();

            string path = GetInstanceEventPath(instanceEvent.InstanceId, instanceEvent.Id.Value);
            Directory.CreateDirectory(GetInstanceEventFolder());
            File.WriteAllText(path, instanceEvent.ToString());

            return Task.FromResult(instanceEvent);
        }

        public Task<List<InstanceEvent>> ListInstanceEvents(string instanceId, string[] eventTypes, DateTime? fromDateTime, DateTime? toDateTime)
        {
            throw new NotImplementedException();
        }


        private string GetInstanceEventPath(string instanceId, Guid instanceEventID)
        {
            return GetInstanceEventFolder() + instanceId.Replace("/", "_") + "_" + instanceEventID.ToString() + ".json";
        }

        private string GetInstanceEventFolder()
        {
            return _localPlatformSettings.LocalTestingStorageBasePath + _localPlatformSettings.DocumentDbFolder + _localPlatformSettings.InstanceEventsCollectionFolder;
        }
    }
}
