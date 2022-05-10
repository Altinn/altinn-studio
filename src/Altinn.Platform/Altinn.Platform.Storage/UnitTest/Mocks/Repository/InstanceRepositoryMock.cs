using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;

using Microsoft.Extensions.Primitives;

using Newtonsoft.Json;

namespace Altinn.Platform.Storage.UnitTest.Mocks.Repository
{
    public class InstanceRepositoryMock : IInstanceRepository
    {
        public async Task<Instance> Create(Instance item)
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

            return await Task.FromResult(instance);
        }

        public Task<bool> Delete(Instance item)
        {
            throw new NotImplementedException();
        }

        public Task<InstanceQueryResponse> GetInstancesFromQuery(Dictionary<string, StringValues> queryParams, string continuationToken, int size)
        {
            List<string> validQueryParams = new List<string>
            {
                "org",
                "appId",
                "process.currentTask",
                "process.isComplete",
                "process.endEvent",
                "process.ended",
                "instanceOwner.partyId",
                "lastChanged",
                "created",
                "visibleAfter",
                "dueBefore",
                "excludeConfirmedBy",
                "size",
                "language",
                "status.isSoftDeleted",
                "status.isArchived",
                "status.isHardDeleted",
                "status.isArchivedOrSoftDeleted",
                "status.isActiveorSoftDeleted",
                "sortBy",
                "archiveReference"
            };

            InstanceQueryResponse response = new InstanceQueryResponse();

            string invalidKey = queryParams.FirstOrDefault(q => !validQueryParams.Contains(q.Key)).Key;
            if (!string.IsNullOrEmpty(invalidKey))
            {
                response.Exception = $"Unknown query parameter: {invalidKey}";
                return Task.FromResult(response);
            }

            List<Instance> instances = new List<Instance>();

            string instancesPath = GetInstancesPath();

            if (Directory.Exists(instancesPath))
            {
                string[] files = Directory.GetFiles(instancesPath, "*.json", SearchOption.AllDirectories);

                foreach (var file in files)
                {
                    string content = File.ReadAllText(file);
                    Instance instance = (Instance)JsonConvert.DeserializeObject(content, typeof(Instance));
                    PostProcess(instance);
                    instances.Add(instance);
                }
            }

            if (queryParams.ContainsKey("org"))
            {
                string org = queryParams.GetValueOrDefault("org").ToString();
                instances.RemoveAll(i => !i.Org.Equals(org, StringComparison.OrdinalIgnoreCase));
            }

            if (queryParams.ContainsKey("appId"))
            {
                string appId = queryParams.GetValueOrDefault("appId").ToString();
                instances.RemoveAll(i => !i.AppId.Equals(appId, StringComparison.OrdinalIgnoreCase));
            }

            if (queryParams.ContainsKey("instanceOwner.partyId"))
            {
                instances.RemoveAll(i => !queryParams["instanceOwner.partyId"].Contains(i.InstanceOwner.PartyId));
            }

            if (queryParams.ContainsKey("archiveReference"))
            {
                string archiveRef = queryParams.GetValueOrDefault("archiveReference").ToString();
                instances.RemoveAll(i => !i.Id.EndsWith(archiveRef.ToLower()));
            }

            bool match;

            if (queryParams.ContainsKey("status.isArchived") && bool.TryParse(queryParams.GetValueOrDefault("status.isArchived"), out match))
            {
                instances.RemoveAll(i => i.Status.IsArchived != match);
            }

            if (queryParams.ContainsKey("status.isHardDeleted") && bool.TryParse(queryParams.GetValueOrDefault("status.isHardDeleted"), out match))
            {
                instances.RemoveAll(i => i.Status.IsHardDeleted != match);
            }

            if (queryParams.ContainsKey("status.isSoftDeleted") && bool.TryParse(queryParams.GetValueOrDefault("status.isSoftDeleted"), out match))
            {
                instances.RemoveAll(i => i.Status.IsSoftDeleted != match);
            }

            instances.RemoveAll(i => i.Status.IsHardDeleted == true);

            response.Instances = instances;
            response.Count = instances.Count;

            return Task.FromResult(response);
        }

        public Task<Instance> GetOne(int instanceOwnerPartyId, Guid instanceGuid)
        {
            string instancePath = GetInstancePath(instanceOwnerPartyId.ToString(), instanceGuid);
            if (File.Exists(instancePath))
            {
                string content = File.ReadAllText(instancePath);
                Instance instance = (Instance)JsonConvert.DeserializeObject(content, typeof(Instance));
                PostProcess(instance);
                return Task.FromResult(instance);
            }

            return null;
        }

        public Task<Instance> Update(Instance instance)
        {
            if (instance.Id.Equals("1337/d3b326de-2dd8-49a1-834a-b1d23b11e540"))
            {
                return null;
            }

            instance.Data = new List<DataElement>();

            return Task.FromResult(instance);
        }

        private static string GetInstancePath(string instanceOwnerPartyId, Guid instanceGuid)
        {
            return Path.Combine(GetInstancesPath(), instanceOwnerPartyId, instanceGuid.ToString() + ".json");
        }

        private static string GetInstancesPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(InstanceRepositoryMock).Assembly.Location).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\data\cosmoscollections\instances");
        }

        /// <summary>
        /// Converts the instanceId (id) of the instance from {instanceGuid} to {instanceOwnerPartyId}/{instanceGuid} to be used outside cosmos.
        /// </summary>
        /// <param name="instance">the instance to preprocess</param>
        private static void PostProcess(Instance instance)
        {
            instance.Id = $"{instance.InstanceOwner.PartyId}/{instance.Id}";
            if (instance.Data != null && instance.Data.Any())
            {
                SetReadStatus(instance);
            }

            (string lastChangedBy, DateTime? lastChanged) = InstanceHelper.FindLastChanged(instance);
            instance.LastChanged = lastChanged;
            instance.LastChangedBy = lastChangedBy;
        }

        private static void SetReadStatus(Instance instance)
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
