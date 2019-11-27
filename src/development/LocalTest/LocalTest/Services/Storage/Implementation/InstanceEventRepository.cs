using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace LocalTest.Services.Storage.Implementation
{
    public class InstanceEventRepository : IInstanceEventRepository
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
            throw new NotImplementedException();
        }

        public Task<List<InstanceEvent>> ListInstanceEvents(string instanceId, string[] eventTypes, DateTime? fromDateTime, DateTime? toDateTime)
        {
            throw new NotImplementedException();
        }
    }
}
