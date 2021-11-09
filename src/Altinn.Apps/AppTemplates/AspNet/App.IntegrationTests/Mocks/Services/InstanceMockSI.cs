using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;

using Altinn.App.PlatformServices.Helpers;
using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Models;

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Primitives;

using Newtonsoft.Json;

namespace App.IntegrationTests.Mocks.Services
{
    public class InstanceMockSI : IInstance
    {
        private readonly ILogger _logger;

        public InstanceMockSI(ILogger<IInstance> logger)
        {
            _logger = logger;
        }

        public Task<Instance> CreateInstance(string org, string app, Instance instanceTemplate)
        {
            string partyId = instanceTemplate.InstanceOwner.PartyId;
            Guid instanceGuid = Guid.NewGuid();

            Instance instance = new Instance
            {
                Id = $"{partyId}/{instanceGuid}",
                AppId = $"{org}/{app}",
                Org = org,
                InstanceOwner = instanceTemplate.InstanceOwner,
                Process = instanceTemplate.Process,
                Data = new List<DataElement>(),
            };

            if (instanceTemplate.DataValues != null)
            {
                instance.DataValues = instanceTemplate.DataValues;
            }

            string instancePath = GetInstancePath(app, org, int.Parse(partyId), instanceGuid);
            _logger.LogInformation($"//// Created instance for app {org}/{app}. writing to path: {instancePath}");
            Directory.CreateDirectory(Path.GetDirectoryName(instancePath));
            File.WriteAllText(instancePath, instance.ToString());

            return Task.FromResult(instance);
        }

        /// <inheritdoc />
        public async Task<Instance> GetInstance(Instance instance)
        {
            string app = instance.AppId.Split("/")[1];
            string org = instance.Org;
            int instanceOwnerId = int.Parse(instance.InstanceOwner.PartyId);
            Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);

            return await GetInstance(app, org, instanceOwnerId, instanceGuid);
        }

        public Task<Instance> GetInstance(string app, string org, int instanceOwnerPartyId, Guid instanceId)
        {
            Instance instance = GetTestInstance(app, org, instanceOwnerPartyId, instanceId);

            if (instance != null)
            {
                instance.Data = GetDataElements(org, app, instanceOwnerPartyId, instanceId);
                (instance.LastChangedBy, instance.LastChanged) = FindLastChanged(instance);
            }

            return Task.FromResult(instance);
        }

        public Task<Instance> UpdateProcess(Instance instance)
        {
            ProcessState process = instance.Process;

            string app = instance.AppId.Split("/")[1];
            Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);

            string instancePath = GetInstancePath(app, instance.Org, int.Parse(instance.InstanceOwner.PartyId), instanceGuid);

            if (File.Exists(instancePath))
            {
                string content = File.ReadAllText(instancePath);
                Instance storedInstance = (Instance)JsonConvert.DeserializeObject(content, typeof(Instance));

                // Archiving instance if process was ended
                if (storedInstance?.Process?.Ended == null && process.Ended != null)
                {
                    storedInstance.Status ??= new InstanceStatus();
                    storedInstance.Status.Archived = process.Ended;
                }

                storedInstance.Process = process;
                storedInstance.LastChanged = DateTime.UtcNow;

                File.WriteAllText(instancePath, JsonConvert.SerializeObject(storedInstance));
                return Task.FromResult(storedInstance);
            }

            return Task.FromResult<Instance>(null);
        }

        private static Instance GetTestInstance(string app, string org, int instanceOwnerId, Guid instanceId)
        {
            string instancePath = GetInstancePath(app, org, instanceOwnerId, instanceId);
            if (File.Exists(instancePath))
            {
                string content = System.IO.File.ReadAllText(instancePath);
                Instance instance = (Instance)JsonConvert.DeserializeObject(content, typeof(Instance));
                return instance;
            }

            return null;
        }

        // Finds the path for the instance based on instanceId. Only works if guid is unique.
        private static string GetInstancePath(int instanceOwnerPartyId, Guid instanceGuid)
        {
            string[] paths = Directory.GetFiles(GetInstancesPath(), instanceGuid + ".json", SearchOption.AllDirectories);
            paths = paths.Where(p => p.Contains($"{instanceOwnerPartyId}")).ToArray();
            if (paths.Length == 1)
            {
                return paths.First();
            }

            return string.Empty;
        }

        private static string GetInstancePath(string app, string org, int instanceOwnerId, Guid instanceId)
        {
            return Path.Combine(GetInstancesPath(), org + @"\" + app + @"\" + instanceOwnerId + @"\" + instanceId.ToString() + ".json");
        }

        private static string GetInstancesPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(InstanceMockSI).Assembly.Location).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Instances");
        }

        private static List<DataElement> GetDataElements(string org, string app, int instanceOwnerId, Guid instanceId)
        {
            string path = GetDataPath(org, app, instanceOwnerId, instanceId);
            List<DataElement> dataElements = new List<DataElement>();

            if (Directory.Exists(path))
            {
                string[] files = Directory.GetFiles(path);

                foreach (string file in files)
                {
                    if (!file.Contains(".pretest"))
                    {
                        string content = File.ReadAllText(Path.Combine(path, file));
                        DataElement dataElement = (DataElement)JsonConvert.DeserializeObject(content, typeof(DataElement));
                        dataElements.Add(dataElement);
                    }
                }
            }

            return dataElements;
        }

        private static string GetDataPath(string org, string app, int instanceOwnerId, Guid instanceGuid)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(InstanceMockSI).Assembly.Location).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Instances\", org + @"\", app + @"\", instanceOwnerId + @"\", instanceGuid.ToString() + @"\");
        }

        public Task<List<Instance>> GetActiveInstances(int instanceOwnerPartyId)
        {
            throw new NotImplementedException();
        }

        public async Task<Instance> AddCompleteConfirmation(int instanceOwnerPartyId, Guid instanceGuid)
        {
            string org;
            string app;
            Instance instance;

            switch ($"{instanceOwnerPartyId}/{instanceGuid}")
            {
                case "1337/66233fb5-a9f2-45d4-90b1-f6d93ad40713":
                    org = "tdd";
                    app = "endring-av-navn";
                    instance = GetTestInstance(app, org, instanceOwnerPartyId, instanceGuid);
                    break;
                default:
                    org = string.Empty;
                    instance = new Instance();
                    break;
            }

            instance.CompleteConfirmations = new List<CompleteConfirmation> { new CompleteConfirmation { StakeholderId = org } };

            return await Task.FromResult(instance);
        }

        public async Task<Instance> UpdateReadStatus(int instanceOwnerPartyId, Guid instanceGuid, string readStatus)
        {
            if (!Enum.TryParse(readStatus, true, out ReadStatus newStatus))
            {
                return null;
            }

            string instancePath = GetInstancePath(instanceOwnerPartyId, instanceGuid);

            if (File.Exists(instancePath))
            {
                string content = File.ReadAllText(instancePath);
                Instance storedInstance = (Instance)JsonConvert.DeserializeObject(content, typeof(Instance));

                storedInstance.Status ??= new InstanceStatus();

                storedInstance.Status.ReadStatus = newStatus;

                File.WriteAllText(instancePath, JsonConvert.SerializeObject(storedInstance));
                return await Task.FromResult(storedInstance);
            }

            return null;
        }

        public async Task<Instance> UpdateSubstatus(int instanceOwnerPartyId, Guid instanceGuid, Substatus substatus)
        {
            DateTime creationTime = DateTime.UtcNow;

            if (substatus == null || string.IsNullOrEmpty(substatus.Label))
            {
                throw await PlatformHttpException.CreateAsync(
                    new System.Net.Http.HttpResponseMessage { StatusCode = System.Net.HttpStatusCode.BadRequest });
            }

            string instancePath = GetInstancePath(instanceOwnerPartyId, instanceGuid);

            if (File.Exists(instancePath))
            {
                string content = File.ReadAllText(instancePath);
                Instance storedInstance = (Instance)JsonConvert.DeserializeObject(content, typeof(Instance));

                storedInstance.Status ??= new InstanceStatus();

                storedInstance.Status.Substatus = substatus;
                storedInstance.LastChanged = creationTime;

                // mock does not set last changed by, but this is set by the platform.
                storedInstance.LastChangedBy = string.Empty;

                File.WriteAllText(instancePath, JsonConvert.SerializeObject(storedInstance));
                return await GetInstance(storedInstance);
            }

            return null;
        }

        public async Task<Instance> UpdatePresentationTexts(int instanceOwnerPartyId, Guid instanceGuid, PresentationTexts presentationTexts)
        {
            string instancePath = GetInstancePath(instanceOwnerPartyId, instanceGuid);
            if (File.Exists(instancePath))
            {
                string content = File.ReadAllText(instancePath);
                Instance storedInstance = (Instance)JsonConvert.DeserializeObject(content, typeof(Instance));

                storedInstance.PresentationTexts ??= new Dictionary<string, string>();

                foreach (KeyValuePair<string, string> entry in presentationTexts.Texts)
                {
                    if (string.IsNullOrEmpty(entry.Value))
                    {
                        storedInstance.PresentationTexts.Remove(entry.Key);
                    }
                    else
                    {
                        storedInstance.PresentationTexts[entry.Key] = entry.Value;
                    }
                }

                // mock does not set last changed by, but this is set by the platform.
                storedInstance.LastChangedBy = string.Empty;

                File.WriteAllText(instancePath, JsonConvert.SerializeObject(storedInstance));

                return await GetInstance(storedInstance);
            }

            return null;
        }

        public async Task<Instance> UpdateDataValues(int instanceOwnerPartyId, Guid instanceGuid, DataValues dataValues)
        {
            string instancePath = GetInstancePath(instanceOwnerPartyId, instanceGuid);
            if (File.Exists(instancePath))
            {
                string content = File.ReadAllText(instancePath);
                Instance storedInstance = (Instance)JsonConvert.DeserializeObject(content, typeof(Instance));

                storedInstance.DataValues ??= new Dictionary<string, string>();

                foreach (KeyValuePair<string, string> entry in dataValues.Values)
                {
                    if (string.IsNullOrEmpty(entry.Value))
                    {
                        storedInstance.DataValues.Remove(entry.Key);
                    }
                    else
                    {
                        storedInstance.DataValues[entry.Key] = entry.Value;
                    }
                }

                // mock does not set last changed by, but this is set by the platform.
                storedInstance.LastChangedBy = string.Empty;

                File.WriteAllText(instancePath, JsonConvert.SerializeObject(storedInstance));

                return await GetInstance(storedInstance);
            }

            return null;
        }

        public Task<Instance> DeleteInstance(int instanceOwnerPartyId, Guid instanceGuid, bool hard)
        {
            string instancePath = GetInstancePath(instanceOwnerPartyId, instanceGuid);
            if (File.Exists(instancePath))
            {
                string content = File.ReadAllText(instancePath);
                Instance storedInstance = (Instance)JsonConvert.DeserializeObject(content, typeof(Instance));

                if (storedInstance.Status == null)
                {
                    storedInstance.Status = new InstanceStatus();
                }

                if (hard)
                {
                    storedInstance.Status.IsHardDeleted = true;
                    storedInstance.Status.HardDeleted = DateTime.UtcNow;
                }

                storedInstance.Status.IsSoftDeleted = true;
                storedInstance.Status.SoftDeleted = DateTime.UtcNow;

                // mock does not set last changed by, but this is set by the platform.
                storedInstance.LastChangedBy = string.Empty;

                File.WriteAllText(instancePath, JsonConvert.SerializeObject(storedInstance));

                return Task.FromResult(storedInstance);
            }

            return Task.FromResult<Instance>(null);
        }

        /// <summary>
        /// Searches through all instance documents (including pretest)
        /// </summary>
        public async Task<List<Instance>> GetInstances(Dictionary<string, StringValues> queryParams)
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
                // pltform exceptions.
                HttpResponseMessage res = new HttpResponseMessage
                {
                    StatusCode = System.Net.HttpStatusCode.BadRequest,
                    Content = new StringContent($"Unknown query parameter: {invalidKey}")
                };

                throw await PlatformHttpException.CreateAsync(res);
            }

            List<Instance> instances = new List<Instance>();

            string instancesPath = GetInstancesPath();

            int fileDepth = 4;

            if (queryParams.TryGetValue("appId", out StringValues appIdQueryVal))
            {
                if (appIdQueryVal.Count > 0)
                {
                    instancesPath += "\\" + appIdQueryVal.First().Replace('/', '\\');
                    fileDepth -= 2;

                    if (queryParams.TryGetValue("instanceOwner.partyId", out StringValues partyIdQueryVal))
                    {
                        if (partyIdQueryVal.Count > 0)
                        {
                            instancesPath += "\\" + partyIdQueryVal.First();
                            fileDepth -= 1;
                        }
                    }
                }
            }

            if (Directory.Exists(instancesPath))
            {
                string[] files = Directory.GetFiles(instancesPath, "*.json", SearchOption.AllDirectories);
                int instancePathLenght = instancesPath.Split("\\").Length;

                // only parse files at the correct level. Instances are places four levels [org/app/partyId/instance] below instance path.
                List<string> instanceFiles = files.Where(f => f.Split("\\").Length == (instancePathLenght + fileDepth)).ToList();

                foreach (var file in instanceFiles)
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

            instances.RemoveAll(i => i.Status.IsHardDeleted == true);
            return instances;
        }

        private static (string LastChangedBy, DateTime? LastChanged) FindLastChanged(Instance instance)
        {
            string lastChangedBy = instance.LastChangedBy;
            DateTime? lastChanged = instance.LastChanged;
            if (instance.Data == null || instance.Data.Count == 0)
            {
                return (lastChangedBy, lastChanged);
            }

            List<DataElement> newerDataElements = instance.Data.FindAll(dataElement =>
                dataElement.LastChanged != null
                && dataElement.LastChangedBy != null
                && dataElement.LastChanged > instance.LastChanged);

            if (newerDataElements.Count == 0)
            {
                return (lastChangedBy, lastChanged);
            }

            lastChanged = (DateTime)instance.LastChanged;
            newerDataElements.ForEach((DataElement dataElement) =>
            {
                if (dataElement.LastChanged > lastChanged)
                {
                    lastChangedBy = dataElement.LastChangedBy;
                    lastChanged = (DateTime)dataElement.LastChanged;
                }
            });

            return (lastChangedBy, lastChanged);
        }
    }
}
