using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Reflection;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using Altinn.Platform.Storage.UnitTest.Utils;

using Microsoft.Azure.Documents;
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

        public async Task<List<Instance>> GetInstancesInStateOfInstanceOwner(int instanceOwnerPartyId, string instanceState)
        {
            List<Instance> instances = new List<Instance>();

            string instancesForPartyPath = $"{GetInstancesPath()}\\{instanceOwnerPartyId}";

            if (Directory.Exists(instancesForPartyPath))
            {
                string[] instancesFiles = Directory.GetFiles(instancesForPartyPath);
                foreach (string instancePath in instancesFiles)
                {
                    Instance instance = null;
                    lock (TestDataUtil.DataLock)
                    {
                        string content = File.ReadAllText(instancePath);
                        instance = (Instance)JsonConvert.DeserializeObject(content, typeof(Instance));
                    }

                    PostProcess(instance);

                    if (instance.InstanceOwner.PartyId == instanceOwnerPartyId.ToString())
                    {
                        instances.Add(instance);
                    }
                }
            }

            return await Task.FromResult(Filter(instanceState, instances));
        }

        private List<Instance> Filter(string instanceState, List<Instance> unfilteredInstances)
        {
            IEnumerable<Instance> filter;
            if (instanceState.Equals("active"))
            {
                filter = unfilteredInstances
                        .Where(i => (!i.VisibleAfter.HasValue || i.VisibleAfter <= DateTime.UtcNow))
                        .Where(i => !i.Status.IsSoftDeleted)
                        .Where(i => !i.Status.IsHardDeleted)
                        .Where(i => !i.Status.IsArchived);
            }
            else if (instanceState.Equals("deleted"))
            {
                filter = unfilteredInstances
                        .Where(i => i.Status.IsSoftDeleted)
                        .Where(i => !i.Status.IsHardDeleted);
            }
            else if (instanceState.Equals("archived"))
            {
                filter =
                       unfilteredInstances
                       .Where(i => i.Status.IsArchived)
                       .Where(i => !i.Status.IsSoftDeleted)
                       .Where(i => !i.Status.IsHardDeleted)
                       .OrderByDescending(i => i.Status.Archived);
            }
            else
            {
                // empty list
                return unfilteredInstances;
            }

            return filter.ToList();
        }

        public Task<InstanceQueryResponse> GetInstancesFromQuery(Dictionary<string, StringValues> queryParams, string continuationToken, int size)
        {
            InstanceQueryResponse response = new InstanceQueryResponse();
            List<Instance> instances = new List<Instance>();

            string instancesPath = GetInstancesPath();

            if (queryParams.ContainsKey("appId"))
            {
                string appId = queryParams.GetValueOrDefault("appId").ToString();

                if (Directory.Exists(instancesPath))
                {
                    string[] files = Directory.GetFiles(instancesPath, "*.json", SearchOption.AllDirectories);

                    foreach (var file in files)
                    {
                        string content = File.ReadAllText(file);
                        Instance instance = (Instance)JsonConvert.DeserializeObject(content, typeof(Instance));
                        if (instance.AppId.Equals(appId, StringComparison.InvariantCultureIgnoreCase))
                        {
                            PostProcess(instance);
                            instances.Add(instance);
                        }
                    }
                }
            }
            else if (queryParams.ContainsKey("instanceOwner.PartyId"))
            {
                instancesPath += $"\\{queryParams.GetValueOrDefault("instanceOwner.PartyId")}";
                string[] files = Directory.GetFiles(instancesPath, "*.json", SearchOption.AllDirectories);
                foreach (var file in files)
                {
                    string content = File.ReadAllText(file);
                    Instance instance = (Instance)JsonConvert.DeserializeObject(content, typeof(Instance));
                    PostProcess(instance);
                    instances.Add(instance);
                }
            }
            else if (queryParams.ContainsKey("org"))
            {
                string org = queryParams.GetValueOrDefault("org").ToString();

                if (Directory.Exists(instancesPath))
                {
                    string[] files = Directory.GetFiles(instancesPath, "*.json", SearchOption.AllDirectories);

                    foreach (var file in files)
                    {
                        string content = File.ReadAllText(file);
                        Instance instance = (Instance)JsonConvert.DeserializeObject(content, typeof(Instance));
                        if (instance.Org.Equals(org, StringComparison.InvariantCultureIgnoreCase))
                        {
                            PostProcess(instance);
                            instances.Add(instance);
                        }
                    }
                }
            }

            response.Instances = instances;
            response.Count = instances.Count;
            response.TotalHits = instances.Count;

            return Task.FromResult(response);
        }

        public Task<Instance> GetOne(string instanceId, int instanceOwnerPartyId)
        {
            string instancePath = GetInstancePath(instanceOwnerPartyId.ToString(), new Guid(instanceId.Split("/")[1]));
            if (File.Exists(instancePath))
            {
                string content = File.ReadAllText(instancePath);
                Instance instance = (Instance)JsonConvert.DeserializeObject(content, typeof(Instance));
                PostProcess(instance);
                return Task.FromResult(instance);
            }

            throw CreateDocumentClientExceptionForTesting("Not Found", HttpStatusCode.NotFound);
        }

        public Task<Instance> Update(Instance instance)
        {
            if (instance.Id.Equals("1337/d3b326de-2dd8-49a1-834a-b1d23b11e540"))
            {
                throw CreateDocumentClientExceptionForTesting("Not Found", HttpStatusCode.NotFound);
            }

            return Task.FromResult(instance);
        }

        private string GetInstancePath(string instanceOwnerPartyId, Guid instanceGuid)
        {
            return Path.Combine(GetInstancesPath(), instanceOwnerPartyId, instanceGuid.ToString() + ".json");
        }

        private string GetInstancesPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(InstanceRepositoryMock).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\data\cosmoscollections\instances");
        }

        private static DocumentClientException CreateDocumentClientExceptionForTesting(string message, HttpStatusCode httpStatusCode)
        {
            Type type = typeof(DocumentClientException);

            string fullName = type.FullName ?? "wtf?";

            object documentClientExceptionInstance = type.Assembly.CreateInstance(
                fullName,
                false,
                BindingFlags.Instance | BindingFlags.NonPublic,
                null,
                new object[] { message, null, null, httpStatusCode, null },
                null,
                null);

            return (DocumentClientException)documentClientExceptionInstance;
        }

        /// <summary>
        /// Converts the instanceId (id) of the instance from {instanceGuid} to {instanceOwnerPartyId}/{instanceGuid} to be used outside cosmos.
        /// </summary>
        /// <param name="instance">the instance to preprocess</param>
        private void PostProcess(Instance instance)
        {
            string instanceId = $"{instance.InstanceOwner.PartyId}/{instance.Id}";

            instance.Id = instanceId;

            (string lastChangedBy, DateTime? lastChanged) = InstanceHelper.FindLastChanged(instance);

            instance.LastChanged = lastChanged;
            instance.LastChangedBy = lastChangedBy;
        }
    }
}
