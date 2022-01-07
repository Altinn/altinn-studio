using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;

using LocalTest.Configuration;
using LocalTest.Services.Localtest.Interface;

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

        public InstanceRepository(
            IOptions<LocalPlatformSettings> localPlatformSettings,
            IDataRepository dataRepository)
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
            string path = GetInstancePath(instanceId.Replace("/", "_"));
            if (File.Exists(path))
            {
                string content = File.ReadAllText(path);
                Instance instance = (Instance)JsonConvert.DeserializeObject(content, typeof(Instance));
                await PostProcess(instance);
                return instance;
            }
            return null;
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

            string invalidKey = queryParams.FirstOrDefault(q => !validQueryParams.Contains(q.Key)).Key;

            if (!string.IsNullOrEmpty(invalidKey))
            {
                throw new ArgumentException($"Invalid query parameter {invalidKey}");
            }

            if (!queryParams.ContainsKey("appId"))
            {
                throw new NotImplementedException($"Queries for instances must include applicationId in local test.");
            }

            List<Instance> instances = new List<Instance>();

            string instancesPath = GetInstanceFolder();

            if (Directory.Exists(instancesPath))
            {
                string[] files = Directory.GetFiles(instancesPath, "*.json");

                foreach (var file in files)
                {
                    string content = File.ReadAllText(file);
                    Instance instance = (Instance)JsonConvert.DeserializeObject(content, typeof(Instance));
                    if (instance != null && instance.Id != null)
                    {
                        instances.Add(instance);
                    }
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

            if (queryParams.ContainsKey("created"))
            {
                RemoveForDateTime(instances, nameof(Instance.Created), queryParams.GetValueOrDefault("created"));
            }

            if (queryParams.ContainsKey("lastChanged"))
            {
                RemoveForDateTime(instances, nameof(Instance.LastChanged), queryParams.GetValueOrDefault("lastChanged"));
            }

            if (queryParams.ContainsKey("dueBefore"))
            {
                RemoveForDateTime(instances, nameof(Instance.DueBefore), queryParams.GetValueOrDefault("dueBefore"));
            }

            if (queryParams.ContainsKey("visibleAfter"))
            {
                RemoveForDateTime(instances, nameof(Instance.VisibleAfter), queryParams.GetValueOrDefault("visibleAfter"));
            }

            if (queryParams.ContainsKey("process.ended"))
            {
                RemoveForDateTime(instances, $"{nameof(Instance.Process)}.{nameof(Instance.Process.Ended)}", queryParams.GetValueOrDefault("process.ended"));
            }

            instances.RemoveAll(i => i.Status.IsHardDeleted == true);

            instances.ForEach(async i => await PostProcess(i));

            return Task.FromResult(new InstanceQueryResponse
            {
                Instances = instances,
                Count = instances.Count,
            });
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
            return Path.Combine(GetInstanceFolder() + instanceId.Replace("/", "_") + ".json");
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

        private static void RemoveForDateTime(List<Instance> instances, string property, string queryValue)
        {
            if (queryValue.StartsWith("gt:"))
            {
                var query = ParseDateTimeIntoUtc(queryValue.Substring(3));
                instances.RemoveAll(i => !(getDateTimeValue(i, property) > query));
            }
            else if (queryValue.StartsWith("gte:"))
            {
                var query = ParseDateTimeIntoUtc(queryValue.Substring(4));
                instances.RemoveAll(i => !(getDateTimeValue(i, property) >= query));
            }
            else if (queryValue.StartsWith("lt:"))
            {
                var query = ParseDateTimeIntoUtc(queryValue.Substring(3));
                instances.RemoveAll(i => !(getDateTimeValue(i, property) < query));
            }
            else if (queryValue.StartsWith("lte:"))
            {
                var query = ParseDateTimeIntoUtc(queryValue.Substring(4));
                instances.RemoveAll(i => !(getDateTimeValue(i, property) <= query));
            }
            else if (queryValue.StartsWith("eq:"))
            {
                var query = ParseDateTimeIntoUtc(queryValue.Substring(3));
                instances.RemoveAll(i => getDateTimeValue(i, property) != query);
            }
            else
            {
                var query = ParseDateTimeIntoUtc(queryValue);
                instances.RemoveAll(i => getDateTimeValue(i, property) != query);
            }
        }

        private static DateTime ParseDateTimeIntoUtc(string queryValue)
        {
            return DateTimeHelper.ParseAndConvertToUniversalTime(queryValue);
        }

        public static DateTime? getDateTimeValue(object source, string property)
        {
            string[] props = property.Split('.');

            for (int i = 0; i < props.Length; i++)
            {
                var prop = source.GetType().GetProperty(props[i]);
                source = prop.GetValue(source, null);
            }

            return (DateTime?)source;
        }
    }
}
