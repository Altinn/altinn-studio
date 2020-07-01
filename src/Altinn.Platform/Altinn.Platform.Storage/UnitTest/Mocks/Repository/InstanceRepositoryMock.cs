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

            string instancePath = GetInstancePath(instance.InstanceOwner.PartyId, instanceGuid);
            File.WriteAllText(instancePath, instance.ToString());

            return Task.FromResult(instance);
        }

        public Task<bool> Delete(Instance item)
        {
            throw new NotImplementedException();
        }

        public Task<List<Instance>> GetInstancesInStateOfInstanceOwner(int instanceOwnerPartyId, string instanceState)
        {

            List<Instance> instances = new List<Instance>();

            string instancesForPartyPath = $"{GetInstancesPath()}\\{instanceOwnerPartyId}";

            if (Directory.Exists(instancesForPartyPath))
            {
                string[] instancesFiles = Directory.GetFiles(instancesForPartyPath);
                foreach (string instancePath in instancesFiles)
                {
                    if (!instancePath.Contains("pretest"))
                    {
                        Instance instance = null;
                        lock (TestDataUtil.dataLock)
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
            }

            return Task.FromResult(Filter(instanceState, instances));
        }


        private List<Instance> Filter(string instanceState, List<Instance> unfilteredInstances)
        {
            IEnumerable<Instance> filter;
            if (instanceState.Equals("active"))
            {
                filter = unfilteredInstances
                        .Where(i => (!i.VisibleAfter.HasValue || i.VisibleAfter <= DateTime.UtcNow))
                        .Where(i => !i.Status.SoftDeleted.HasValue)
                        .Where(i => !i.Status.HardDeleted.HasValue)
                        .Where(i => !i.Status.Archived.HasValue);
            }
            else if (instanceState.Equals("deleted"))
            {
                filter = unfilteredInstances
                        .Where(i => i.Status.SoftDeleted.HasValue)
                        .Where(i => !i.Status.HardDeleted.HasValue);
            }
            else if (instanceState.Equals("archived"))
            {
                filter =
                       unfilteredInstances
                       .Where(i => i.Status.Archived.HasValue)
                       .Where(i => !i.Status.SoftDeleted.HasValue)
                       .Where(i => !i.Status.HardDeleted.HasValue);
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
                        if (!file.Contains("pretest"))
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
            }
            else if (queryParams.ContainsKey("instanceOwner.PartyId"))
            {
                instancesPath += $"\\{queryParams.GetValueOrDefault("instanceOwner.PartyId")}";
                string[] files = Directory.GetFiles(instancesPath, "*.json", SearchOption.AllDirectories);
                foreach (var file in files)
                {
                    if (!file.Contains("pretest"))
                    {
                        string content = File.ReadAllText(file);
                        Instance instance = (Instance)JsonConvert.DeserializeObject(content, typeof(Instance));
                        PostProcess(instance);
                        instances.Add(instance);
                    }
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
                        if (!file.Contains("pretest"))
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
            }

            response.Instances = instances;
            response.Count = instances.Count();
            response.TotalHits = instances.Count();
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

            throw (CreateDocumentClientExceptionForTesting("Not Found", HttpStatusCode.NotFound));
        }

        public Task<Instance> Update(Instance instance)
        {
            PreProcess(instance);
            if (instance.Id.Equals("d3b326de-2dd8-49a1-834a-b1d23b11e540"))
            {
                throw (CreateDocumentClientExceptionForTesting("Not Found", HttpStatusCode.NotFound));
            }

            Guid instanceGuid = Guid.Parse(instance.Id);
            string instancePath = GetInstancePath(instance.InstanceOwner.PartyId, instanceGuid);

            if (File.Exists(instancePath))
            {
                File.WriteAllText(instancePath, JsonConvert.SerializeObject(instance));
                PostProcess(instance);
                return Task.FromResult(instance);
            }

            return null;
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
            Guid instanceGuid = Guid.Parse(instance.Id);
            string instanceId = $"{instance.InstanceOwner.PartyId}/{instance.Id}";

            instance.Id = instanceId;
            // Should instanceData be included here as well?

            (string lastChangedBy, DateTime? lastChanged) = InstanceHelper.FindLastChanged(instance);
            instance.LastChanged = lastChanged;
            instance.LastChangedBy = lastChangedBy;
        }

        /// <summary>
        /// Post-processes a list of instances.
        /// </summary>
        /// <param name="instances">the list of instances</param>
        private void PostProcess(List<Instance> instances)
        {
            foreach (Instance item in instances)
            {
                PostProcess(item);
            }
        }

        /// <summary>
        /// Converts the instanceId (id) of the instance from {instanceOwnerPartyId}/{instanceGuid} to {instanceGuid} to use as id in cosmos.
        /// </summary>
        /// <param name="instance">the instance to preprocess</param>
        private void PreProcess(Instance instance)
        {
            instance.Id = InstanceIdToCosmosId(instance.Id);
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
    }
}
