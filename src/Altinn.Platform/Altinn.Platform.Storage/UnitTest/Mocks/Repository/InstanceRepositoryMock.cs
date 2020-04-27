using Altinn.Platform.Storage.Configuration;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.Platform.Storage.UnitTest.Mocks.Repository
{
    public class InstanceRepositoryMock : IInstanceRepository
    {
        public InstanceRepositoryMock()
        {

        }


        public Task<Instance> Create(Instance item)
        {
            string partyId = item.InstanceOwner.PartyId;
            Guid instanceGuid = Guid.NewGuid();

            Instance instance = new Instance
            {
                Id = $"{partyId}/{instanceGuid}",
                AppId = item.AppId,
                Org = item.Org,
                InstanceOwner = item.InstanceOwner,
                Process = item.Process,
                Data = new List<DataElement>(),
            };

            string instancePath = GetInstancePath(int.Parse(partyId), instanceGuid);
            File.WriteAllText(instancePath, instance.ToString());

            return Task.FromResult(instance);
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
            string instancePath = GetInstancePath(instanceOwnerPartyId, new Guid(instanceId.Split("/")[1]));
            if (File.Exists(instancePath))
            {
                string content = System.IO.File.ReadAllText(instancePath);
                Instance instance = (Instance)JsonConvert.DeserializeObject(content, typeof(Instance));
                return Task.FromResult(instance);
            }
            return null;
        }

        public Task<Instance> Update(Instance item)
        {
            throw new NotImplementedException();
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
