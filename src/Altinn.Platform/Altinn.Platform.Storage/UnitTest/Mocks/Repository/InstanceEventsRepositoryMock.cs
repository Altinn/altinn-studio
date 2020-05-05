using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.Platform.Storage.UnitTest.Mocks.Repository
{
    public class InstanceEventRepositoryMock : IInstanceEventRepository
    {
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

            if(!Directory.Exists(GetInstanceEventsPath(instanceEvent.InstanceId.Split("/")[1], instanceEvent.InstanceOwnerPartyId)))
            {
                Directory.CreateDirectory(GetInstanceEventsPath(instanceEvent.InstanceId.Split("/")[1], instanceEvent.InstanceOwnerPartyId));
            }

            instanceEvent.Id = Guid.NewGuid();


            string instancePath = GetInstanceEventPath(instanceEvent.InstanceId.Split("/")[1] , instanceEvent.InstanceOwnerPartyId,  instanceEvent.Id.Value);
            File.WriteAllText(instancePath, instanceEvent.ToString());

            return Task.FromResult(instanceEvent);
        }

        public Task<List<InstanceEvent>> ListInstanceEvents(string instanceId, string[] eventTypes, DateTime? fromDateTime, DateTime? toDateTime)
        {
            List<InstanceEvent> events = new List<InstanceEvent>();
            string eventsPath = GetInstanceEventsPath(instanceId.Split("/")[1], instanceId.Split("/")[0]);
            if (Directory.Exists(eventsPath))
            {
                string[] instanceEventPath = Directory.GetFiles(eventsPath);
                foreach (string path in instanceEventPath)
                {
                    string content = System.IO.File.ReadAllText(path);
                    InstanceEvent instance = (InstanceEvent)JsonConvert.DeserializeObject(content, typeof(InstanceEvent));
                    events.Add(instance);
                }
            }

            return Task.FromResult(events);
        }

        private string GetInstanceEventPath(string instanceGuid, string instanceOwnerPartyId, Guid id)
        {
            return Path.Combine(GetInstanceEventsPath(instanceGuid, instanceOwnerPartyId), id.ToString() + ".json");
        }

        private string GetInstanceEventsPath(string instanceGuid, string instanceOwnerPartyId)
        {
            string path = Path.Combine(GetInstancesPath(), instanceOwnerPartyId + @"\" + instanceGuid + @"\events\");
            return path;
        }

        private string GetInstancePath(int instanceOwnerId, Guid instanceId)
        {
            return Path.Combine(GetInstancesPath(), instanceOwnerId + @"\" + instanceId.ToString() + ".json");
        }

        private string GetInstancesPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(InstanceRepositoryMock).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\data\instances");
        }

    }
}
