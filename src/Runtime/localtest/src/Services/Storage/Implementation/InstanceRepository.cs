using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;

using LocalTest.Configuration;

using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;

using Newtonsoft.Json;

using System.Globalization;

namespace LocalTest.Services.Storage.Implementation
{
    public class InstanceRepository : IInstanceRepository
    {
        private readonly LocalPlatformSettings _localPlatformSettings;
        private readonly IDataRepository _dataRepository;
        private readonly PartitionedAsyncLock _lock = new ();

        public InstanceRepository(
            IOptions<LocalPlatformSettings> localPlatformSettings,
            IDataRepository dataRepository)
        {
            _localPlatformSettings = localPlatformSettings.Value;
            _dataRepository = dataRepository;
        }

        private string PartitionKey(int instanceOwnerPartyId, Guid instanceGuid) => $"{instanceOwnerPartyId}_{instanceGuid}";
        private string PartitionKey(string filePath) => Path.GetFileNameWithoutExtension(filePath);

        private Task<IDisposable> Lock() => _lock.Lock(Guid.Empty);
        private Task<IDisposable> Lock(int instanceOwnerPartyId, Guid instanceGuid) => _lock.Lock(PartitionKey(instanceOwnerPartyId, instanceGuid));
        private Task<IDisposable> Lock(Instance instance)
        {
            var instanceGuid = instance.Id.Contains("/") 
                ? Guid.Parse(instance.Id.Split("/")[1]) 
                : Guid.Parse(instance.Id);
            return _lock.Lock(PartitionKey(int.Parse(instance.InstanceOwner.PartyId, CultureInfo.InvariantCulture), instanceGuid));
        }
        private Task<IDisposable> Lock(string filePath) => _lock.Lock(PartitionKey(filePath));

        public async Task<Instance> Create(Instance instance, CancellationToken cancellationToken, int altinnMainVersion = 3)
        {
            using var _ = await Lock();
            string partyId = instance.InstanceOwner.PartyId;
            Guid instanceGuid = Guid.NewGuid();
            instance.Id = partyId + "/" + instanceGuid.ToString();
            string path = GetInstancePath(instance.Id);
            Directory.CreateDirectory(GetInstanceFolder());
            PreProcess(instance);
            await File.WriteAllTextAsync(path, instance.ToString(), cancellationToken);
            await PostProcess(instance);
            return instance;
        }

        public Task<bool> Delete(Instance instance, CancellationToken cancellationToken)
        {
            throw new NotImplementedException();
        }

        public Task<List<Instance>> GetHardDeletedInstances(CancellationToken cancellationToken)
        {
            // For local test mock, return empty list
            return Task.FromResult(new List<Instance>());
        }

        public Task<List<DataElement>> GetHardDeletedDataElements(CancellationToken cancellationToken)
        {
            // For local test mock, return empty list
            return Task.FromResult(new List<DataElement>());
        }

        public async Task<(Instance Instance, long InternalId)> GetOne(Guid instanceGuid, bool includeElements, CancellationToken cancellationToken)
        {
            string instancesPath = GetInstanceFolder();

            if (Directory.Exists(instancesPath))
            {
                string[] files = Directory.GetFiles(instancesPath, $"*_{instanceGuid}.json");
                if (files.Length > 0)
                {
                    string path = files[0];
                    using var _ = await Lock(path);
                    string content = await File.ReadAllTextAsync(path, cancellationToken);
                    Instance instance = (Instance)JsonConvert.DeserializeObject(content, typeof(Instance));

                    if (includeElements)
                    {
                        await PostProcess(instance);
                    }
                    else
                    {
                        Guid instanceGuidValue = Guid.Parse(instance.Id);
                        string instanceId = $"{instance.InstanceOwner.PartyId}/{instance.Id}";
                        instance.Id = instanceId;
                    }

                    return (instance, 0);
                }
            }

            return (null, 0);
        }

        public async Task<InstanceQueryResponse> GetInstancesFromQuery(
            InstanceQueryParameters queryParams,
            bool includeDataElements,
            CancellationToken cancellationToken)
        {
            if (string.IsNullOrEmpty(queryParams.AppId))
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
                    using var _ = await Lock(file);
                    string content = await File.ReadAllTextAsync(file, cancellationToken);
                    Instance instance = (Instance)JsonConvert.DeserializeObject(content, typeof(Instance));
                    if (instance != null && instance.Id != null)
                    {
                        instances.Add(instance);
                    }
                }
            }

            if (!string.IsNullOrEmpty(queryParams.Org))
            {
                instances.RemoveAll(i => !i.Org.Equals(queryParams.Org, StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrEmpty(queryParams.AppId))
            {
                instances.RemoveAll(i => !i.AppId.Equals(queryParams.AppId, StringComparison.OrdinalIgnoreCase));
            }

            if (queryParams.InstanceOwnerPartyId.HasValue)
            {
                string partyId = queryParams.InstanceOwnerPartyId.Value.ToString();
                instances.RemoveAll(i => i.InstanceOwner.PartyId != partyId);
            }

            if (queryParams.InstanceOwnerPartyIds != null && queryParams.InstanceOwnerPartyIds.Length > 0)
            {
                var partyIds = queryParams.InstanceOwnerPartyIds.Where(p => p.HasValue).Select(p => p.Value.ToString()).ToList();
                instances.RemoveAll(i => !partyIds.Contains(i.InstanceOwner.PartyId));
            }

            if (queryParams.IsArchived != null)
            {
                instances.RemoveAll(i => i.Status.IsArchived != queryParams.IsArchived);
            }

            if (queryParams.IsHardDeleted != null)
            {
                instances.RemoveAll(i => i.Status.IsHardDeleted != queryParams.IsHardDeleted);
            }

            if (queryParams.IsSoftDeleted != null)
            {
                instances.RemoveAll(i => i.Status.IsSoftDeleted != queryParams.IsSoftDeleted);
            }

            if (queryParams.Created != null && queryParams.Created.Length > 0)
            {
                ApplyDateTimeFilters(instances, nameof(Instance.Created), queryParams.Created);
            }

            if (queryParams.LastChanged != null && queryParams.LastChanged.Length > 0)
            {
                ApplyDateTimeFilters(instances, nameof(Instance.LastChanged), queryParams.LastChanged);
            }

            if (queryParams.DueBefore != null && queryParams.DueBefore.Length > 0)
            {
                ApplyDateTimeFilters(instances, nameof(Instance.DueBefore), queryParams.DueBefore);
            }

            if (queryParams.VisibleAfter != null && queryParams.VisibleAfter.Length > 0)
            {
                ApplyDateTimeFilters(instances, nameof(Instance.VisibleAfter), queryParams.VisibleAfter);
            }

            if (queryParams.ProcessEnded != null && queryParams.ProcessEnded.Length > 0)
            {
                ApplyDateTimeFilters(instances, $"{nameof(Instance.Process)}.{nameof(Instance.Process.Ended)}", queryParams.ProcessEnded);
            }

            if (!string.IsNullOrEmpty(queryParams.ProcessCurrentTask))
            {
                instances.RemoveAll(i => i.Process?.CurrentTask == null || i.Process.CurrentTask.ElementId != queryParams.ProcessCurrentTask);
            }

            if (!string.IsNullOrEmpty(queryParams.ExcludeConfirmedBy))
            {
                string stakeholderId = queryParams.ExcludeConfirmedBy;
                instances.RemoveAll(i =>
                    i.CompleteConfirmations != null &&
                    i.CompleteConfirmations.Any(cc => cc.StakeholderId.Equals(stakeholderId, StringComparison.Ordinal))
                );
            }

            instances.RemoveAll(i => i.Status.IsHardDeleted == true);

            if (includeDataElements)
            {
                await Task.WhenAll(instances.Select(async i =>
                {
                    using var _ = await Lock(i);
                    await PostProcess(i);
                }));
            }
            else
            {
                // Set instance IDs without loading data elements
                foreach (var instance in instances)
                {
                    Guid instanceGuid = Guid.Parse(instance.Id);
                    instance.Id = $"{instance.InstanceOwner.PartyId}/{instance.Id}";
                }
            }

            return new InstanceQueryResponse
            {
                Instances = instances,
                Count = instances.Count,
            };
        }

        private static void ApplyDateTimeFilters(List<Instance> instances, string property, string[] filters)
        {
            foreach (var filterValue in filters)
            {
                if (filterValue.StartsWith("gt:"))
                {
                    var dateValue = DateTimeHelper.ParseAndConvertToUniversalTime(filterValue.Substring(3));
                    instances.RemoveAll(i => !(GetDateTimeValue(i, property) > dateValue));
                }
                else if (filterValue.StartsWith("gte:"))
                {
                    var dateValue = DateTimeHelper.ParseAndConvertToUniversalTime(filterValue.Substring(4));
                    instances.RemoveAll(i => !(GetDateTimeValue(i, property) >= dateValue));
                }
                else if (filterValue.StartsWith("lt:"))
                {
                    var dateValue = DateTimeHelper.ParseAndConvertToUniversalTime(filterValue.Substring(3));
                    instances.RemoveAll(i => !(GetDateTimeValue(i, property) < dateValue));
                }
                else if (filterValue.StartsWith("lte:"))
                {
                    var dateValue = DateTimeHelper.ParseAndConvertToUniversalTime(filterValue.Substring(4));
                    instances.RemoveAll(i => !(GetDateTimeValue(i, property) <= dateValue));
                }
                else if (filterValue.StartsWith("eq:"))
                {
                    var dateValue = DateTimeHelper.ParseAndConvertToUniversalTime(filterValue.Substring(3));
                    instances.RemoveAll(i => GetDateTimeValue(i, property) != dateValue);
                }
                else
                {
                    var dateValue = DateTimeHelper.ParseAndConvertToUniversalTime(filterValue);
                    instances.RemoveAll(i => GetDateTimeValue(i, property) != dateValue);
                }
            }
        }

        public async Task<Instance> Update(Instance instance, List<string> updateProperties, CancellationToken cancellationToken)
        {
            using var _ = await Lock(instance);
            string path = GetInstancePath(instance.Id);
            Directory.CreateDirectory(GetInstanceFolder());
            PreProcess(instance);
            await File.WriteAllTextAsync(path, instance.ToString(), cancellationToken);
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

        private static void PreProcess(Instance instance)
        {
            instance.Id = InstanceIdToCosmosId(instance.Id);
            instance.Data = new List<DataElement>();
        }

        private async Task PostProcess(Instance instance)
        {
            Guid instanceGuid = Guid.Parse(instance.Id);
            string instanceId = $"{instance.InstanceOwner.PartyId}/{instance.Id}";

            instance.Id = instanceId;
            instance.Data = await ((DataRepository)_dataRepository).ReadAll(instanceGuid);

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
        private static string InstanceIdToCosmosId(string instanceId)
        {
            string cosmosId = instanceId;

            if (instanceId != null && instanceId.Contains("/"))
            {
                cosmosId = instanceId.Split("/")[1];
            }

            return cosmosId;
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

        private static void RemoveForDateTime(List<Instance> instances, string property, string queryValue)
        {
            if (queryValue.StartsWith("gt:"))
            {
                var query = ParseDateTimeIntoUtc(queryValue.Substring(3));
                instances.RemoveAll(i => !(GetDateTimeValue(i, property) > query));
            }
            else if (queryValue.StartsWith("gte:"))
            {
                var query = ParseDateTimeIntoUtc(queryValue.Substring(4));
                instances.RemoveAll(i => !(GetDateTimeValue(i, property) >= query));
            }
            else if (queryValue.StartsWith("lt:"))
            {
                var query = ParseDateTimeIntoUtc(queryValue.Substring(3));
                instances.RemoveAll(i => !(GetDateTimeValue(i, property) < query));
            }
            else if (queryValue.StartsWith("lte:"))
            {
                var query = ParseDateTimeIntoUtc(queryValue.Substring(4));
                instances.RemoveAll(i => !(GetDateTimeValue(i, property) <= query));
            }
            else if (queryValue.StartsWith("eq:"))
            {
                var query = ParseDateTimeIntoUtc(queryValue.Substring(3));
                instances.RemoveAll(i => GetDateTimeValue(i, property) != query);
            }
            else
            {
                var query = ParseDateTimeIntoUtc(queryValue);
                instances.RemoveAll(i => GetDateTimeValue(i, property) != query);
            }
        }

        private static DateTime ParseDateTimeIntoUtc(string queryValue)
        {
            return DateTimeHelper.ParseAndConvertToUniversalTime(queryValue);
        }

        public static DateTime? GetDateTimeValue(object source, string property)
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
