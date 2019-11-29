using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using LocalTest.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

namespace LocalTest.Services.Storage.Implementation
{
    public class InstanceRepository : IInstanceRepository
    {
        private readonly LocalPlatformSettings _localPlatformSettings;

        public InstanceRepository(IOptions<LocalPlatformSettings> localPlatformSettings)
        {
            _localPlatformSettings = localPlatformSettings.Value;
        }

        public Task<Instance> Create(Instance instance)
        {
            string partyId = instance.InstanceOwner.PartyId;
            Guid instanceGuid = Guid.NewGuid();
            instance.Id = partyId + "/" + instanceGuid.ToString();
            string path = GetInstancePath(instance.Id);
            Directory.CreateDirectory(GetInstanceFolder());
            File.WriteAllText(path, instance.ToString());

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
            string path = GetInstancePath(instanceId.Replace("/","_"));
            if (File.Exists(path))
            {
                string content = System.IO.File.ReadAllText(path);
                Instance instance = (Instance)JsonConvert.DeserializeObject(content, typeof(Instance));
                return Task.FromResult(instance);
            }
            return null;
        }

        public Task<Instance> Update(Instance instance)
        {
            string path = GetInstancePath(instance.Id);
            Directory.CreateDirectory(GetInstanceFolder());
            File.WriteAllText(path, instance.ToString());
            return Task.FromResult(instance);
        }

        private string GetInstancePath(string instanceId)
        {
            return Path.Combine(GetInstanceFolder() + instanceId.Replace("/","_") + ".json");
        }

        private string GetInstanceFolder()
        {
            return this._localPlatformSettings.LocalTestingStorageBasePath + this._localPlatformSettings.DocumentDbFolder + this._localPlatformSettings.InstanceCollectionFolder;
        }
    }
}
