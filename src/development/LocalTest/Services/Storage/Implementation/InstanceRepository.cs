using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using LocalTest.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace LocalTest.Services.Storage.Implementation
{
    public class InstanceRepository : IInstanceRepository
    {
        private readonly LocalPlatformSettings _localPlatformSettings;
        private readonly IDataRepository _dataRepository;

        public InstanceRepository(IOptions<LocalPlatformSettings> localPlatformSettings, IDataRepository dataRepository)
        {
            _localPlatformSettings = localPlatformSettings.Value;
            _dataRepository = dataRepository;
        }

        public async Task<Instance> Create(Instance instance)
        {
            string partyId = instance.InstanceOwner.PartyId;
            Guid instanceGuid = Guid.NewGuid();
            instance.Id = partyId + "/" + instanceGuid.ToString();
            string path = GetInstancePath(instance.Id);
            Directory.CreateDirectory(GetInstanceFolder());
            PreProcess(instance);
            File.WriteAllText(path, instance.ToString());
            await PostProcess(instance);
            return instance;
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

        public async Task<Instance> GetOne(string instanceId, int instanceOwnerPartyId)
        {
            string path = GetInstancePath(instanceId.Replace("/","_"));
            if (File.Exists(path))
            {
                string content = File.ReadAllText(path);
                Instance instance = (Instance)JsonConvert.DeserializeObject(content, typeof(Instance));
                await PostProcess(instance);
                return instance;
            }
            return null;
        }

        public async Task<InstanceQueryResponse> GetInstancesFromQuery(Dictionary<string, StringValues> queryParams, string continuationToken, int size)
        {
            foreach (string key in queryParams.Keys)
                if (!key.Equals("org", StringComparison.OrdinalIgnoreCase) &&
                    !key.Equals("appId", StringComparison.OrdinalIgnoreCase) &&
                    !key.Equals("instanceOwner.partyId", StringComparison.OrdinalIgnoreCase))
                    throw new NotImplementedException();

            InstanceQueryResponse response = new InstanceQueryResponse() { Instances = new List<Instance>(), Count = 0 };
            foreach (FileInfo instanceFile in new DirectoryInfo(GetInstanceFolder()).GetFiles($"*.json").OrderByDescending(f => f.LastWriteTime))
            {
                if (!queryParams.ContainsKey("instanceOwner.partyId") || instanceFile.Name.StartsWith($"{queryParams["instanceOwner.partyId"]}_"))
                {
                    string content = File.ReadAllText(instanceFile.FullName);
                    Instance instance = (Instance)JsonConvert.DeserializeObject(content, typeof(Instance));
                    await PostProcess(instance);
                    if (!queryParams.ContainsKey("org") || instance.Org.Equals(queryParams["org"]))
                        if (!queryParams.ContainsKey("appId") || instance.Org.Equals(queryParams["appId"]))
                        {
                            response.Instances.Add(instance);
                            response.Count++;
                        }
                }
            }

            return response;
        }

        public async Task<Instance> Update(Instance instance)
        {
            string path = GetInstancePath(instance.Id);
            Directory.CreateDirectory(GetInstanceFolder());
            PreProcess(instance);
            File.WriteAllText(path, instance.ToString());
            await PostProcess(instance);
            return instance;
        }

        private string GetInstancePath(string instanceId)
        {
            return Path.Combine(GetInstanceFolder() + instanceId.Replace("/","_") + ".json");
        }

        private string GetInstanceFolder()
        {
            return this._localPlatformSettings.LocalTestingStorageBasePath + this._localPlatformSettings.DocumentDbFolder + this._localPlatformSettings.InstanceCollectionFolder;
        }

        private void PreProcess(Instance instance)
        {
            instance.Id = InstanceIdToCosmosId(instance.Id);
            instance.Data = new List<DataElement>();
        }

        private async Task PostProcess(Instance instance)
        {
            Guid instanceGuid = Guid.Parse(instance.Id);
            string instanceId = $"{instance.InstanceOwner.PartyId}/{instance.Id}";

            instance.Id = instanceId;
            instance.Data = await _dataRepository.ReadAll(instanceGuid);

            if (instance.Data != null && instance.Data.Any())
            {
                SetReadStatus(instance);
            }

            (string lastChangedBy, DateTime? lastChanged) = InstanceHelper.FindLastChanged(instance);
            instance.LastChanged = lastChanged;
            instance.LastChangedBy = lastChangedBy;
        }

        /// <summary>
        /// An instanceId should follow this format {int}/{guid}.
        /// Cosmos does not allow / in id.
        /// But in some old cases instanceId is just {guid}.
        /// </summary>
        /// <param name="instanceId">the id to convert to cosmos</param>
        /// <returns>the guid of the instance</returns>
        private string InstanceIdToCosmosId(string instanceId)
        {
            string cosmosId = instanceId;

            if (instanceId != null && instanceId.Contains("/"))
            {
                cosmosId = instanceId.Split("/")[1];
            }

            return cosmosId;
        }

        private void SetReadStatus(Instance instance)
        {
            if (instance.Status.ReadStatus == ReadStatus.Read && instance.Data.Any(d => !d.IsRead))
            {
                instance.Status.ReadStatus = ReadStatus.UpdatedSinceLastReview;
            }
            else if (instance.Status.ReadStatus == ReadStatus.Read && !instance.Data.Any(d => d.IsRead))
            {
                instance.Status.ReadStatus = ReadStatus.Unread;
            }
        }
    }
}
