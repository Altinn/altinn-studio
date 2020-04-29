using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
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

            if(!Directory.Exists(GetInstanceEventsPath(instanceEvent.InstanceId)))
            {
                Directory.CreateDirectory(GetInstanceEventsPath(instanceEvent.InstanceId));
            }

            instanceEvent.Id = Guid.NewGuid();

            string instancePath = GetInstanceEventPath(instanceEvent.InstanceId , instanceEvent.Id.Value);
            File.WriteAllText(instancePath, instanceEvent.ToString());

            return Task.FromResult(instanceEvent);
        }

        public Task<List<InstanceEvent>> ListInstanceEvents(string instanceId, string[] eventTypes, DateTime? fromDateTime, DateTime? toDateTime)
        {
            throw new NotImplementedException();
        }

        private string GetInstanceEventPath(string instanceId, Guid id)
        {
            return Path.Combine(GetInstanceEventsPath(instanceId), id.ToString() + ".json");
        }

        private string GetInstanceEventsPath(string instanceId)
        {
            return Path.Combine(GetInstancesPath(), instanceId.Split("/")[0] + @"\" + instanceId.Split("/")[1] + @"\events\");
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
