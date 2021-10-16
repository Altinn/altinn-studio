using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using Altinn.Platform.Storage.UnitTest.Utils;

using Newtonsoft.Json;

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
            return Task.FromResult(instanceEvent);
        }

        public async Task<List<InstanceEvent>> ListInstanceEvents(string instanceId, string[] eventTypes, DateTime? fromDateTime, DateTime? toDateTime)
        {
            List<InstanceEvent> events = new List<InstanceEvent>();

            lock (TestDataUtil.DataLock)
            {
                string eventsPath = GetInstanceEventsPath(instanceId.Split("/")[1], instanceId.Split("/")[0]);
                if (Directory.Exists(eventsPath))
                {
                    string[] instanceEventPath = Directory.GetFiles(eventsPath);
                    foreach (string path in instanceEventPath)
                    {
                        string content = File.ReadAllText(path);
                        InstanceEvent instance = (InstanceEvent)JsonConvert.DeserializeObject(content, typeof(InstanceEvent));
                        events.Add(instance);
                    }
                }
            }

            return await Task.FromResult(events);
        }

        private static string GetInstanceEventsPath(string _, string instanceOwnerPartyId)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(InstanceRepositoryMock).Assembly.Location).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\data\cosmoscollections\instanceEvents\");
        }
    }
}
