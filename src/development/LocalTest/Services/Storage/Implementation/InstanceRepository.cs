using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using Microsoft.Extensions.Primitives;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace LocalTest.Services.Storage.Implementation
{
    public class InstanceRepository : IInstanceRepository
    {
        public Task<Instance> Create(Instance item)
        {
            throw new NotImplementedException();
        }

        public Task<bool> Delete(Instance item)
        {
            throw new NotImplementedException();
        }

        public Task<List<Instance>> GetInstancesInStateOfInstanceOwner(int instanceOwnerPartyId, string instanceState)
        {
            throw new NotImplementedException();
        }

        public Task<InstanceQueryResponse> GetInstancesOfApplication(Dictionary<string, StringValues> queryParams, string continuationToken, int size)
        {
            throw new NotImplementedException();
        }

        public Task<List<Instance>> GetInstancesOfInstanceOwner(int instanceOwnerPartyId)
        {
            throw new NotImplementedException();
        }

        public Task<Instance> GetOne(string instanceId, int instanceOwnerPartyId)
        {
            throw new NotImplementedException();
        }

        public Task<Instance> Update(Instance item)
        {
            throw new NotImplementedException();
        }
    }
}
