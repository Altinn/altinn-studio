using Altinn.App.Api.Tests.Data;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Instances;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Primitives;
using Newtonsoft.Json;

namespace Altinn.App.Api.Tests.Mocks;

public class InstanceClientMockSi : IInstanceClient
{
    private readonly ILogger _logger;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public InstanceClientMockSi(ILogger<IInstanceClient> logger, IHttpContextAccessor httpContextAccessor)
    {
        _logger = logger;
        _httpContextAccessor = httpContextAccessor;
    }

    public Task<Instance> CreateInstance(string org, string app, Instance instance)
    {
        string partyId = instance.InstanceOwner.PartyId;
        Guid instanceGuid = Guid.NewGuid();
        instance.Id = $"{partyId}/{instanceGuid}";
        instance.AppId = $"{org}/{app}";
        instance.Org = org;
        instance.Data = new List<DataElement>();

        string instancePath = GetInstancePath(app, org, int.Parse(partyId), instanceGuid);
        string directory =
            Path.GetDirectoryName(instancePath)
            ?? throw new IOException($"Could not get directory name of specified path {instancePath}");
        _ = Directory.CreateDirectory(directory);
        File.WriteAllText(instancePath, instance.ToString());

        _logger.LogInformation(
            "Created instance for app {org}/{app}. writing to path: {instancePath}",
            org,
            app,
            instancePath
        );

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

        if (instance is null)
        {
            throw new IOException($"Could not load instance {instanceId} from app {org}/{app}");
        }

        instance.Data = GetDataElements(org, app, instanceOwnerPartyId, instanceId);
        (instance.LastChangedBy, instance.LastChanged) = FindLastChanged(instance);

        return Task.FromResult(instance);
    }

    public Task<Instance> UpdateProcess(Instance instance)
    {
        ProcessState process = instance.Process;

        string app = instance.AppId.Split("/")[1];
        Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);

        string instancePath = GetInstancePath(
            app,
            instance.Org,
            int.Parse(instance.InstanceOwner.PartyId),
            instanceGuid
        );

        if (!File.Exists(instancePath))
        {
            throw new IOException($"Could not find instance {instance.Id} on path {instancePath}");
        }

        string content = File.ReadAllText(instancePath);

        Instance storedInstance =
            JsonConvert.DeserializeObject<Instance>(content)
            ?? throw new InvalidDataException(
                $"Something went wrong deserializing json for instance {instance.Id} from path {instancePath}"
            );

        // Archiving instance if process was ended
        if (storedInstance.Process?.Ended == null && process.Ended != null)
        {
            storedInstance.Status ??= new InstanceStatus();
            storedInstance.Status.Archived = process.Ended;
            storedInstance.Status.IsArchived = true;
        }

        storedInstance.Process = process;
        storedInstance.LastChanged = DateTime.UtcNow;

        File.WriteAllText(instancePath, JsonConvert.SerializeObject(storedInstance));

        return Task.FromResult(storedInstance);
    }

    public Task<Instance> UpdateProcessAndEvents(Instance instance, List<InstanceEvent> events)
    {
        return UpdateProcess(instance);
    }

    private static Instance GetTestInstance(string app, string org, int instanceOwnerId, Guid instanceId)
    {
        string instancePath = GetInstancePath(app, org, instanceOwnerId, instanceId);
        if (!File.Exists(instancePath))
        {
            throw new IOException($"Could not find file for instance {instanceId} on specified path {instancePath}.");
        }

        string content = File.ReadAllText(instancePath);
        Instance instance =
            JsonConvert.DeserializeObject<Instance>(content)
            ?? throw new InvalidDataException(
                $"Something went wrong deserializing json for instance from path {instancePath}"
            );

        return instance;
    }

    // Finds the path for the instance based on instanceId. Only works if guid is unique.
    private static string GetInstancePath(int instanceOwnerPartyId, Guid instanceGuid)
    {
        string[] paths = Directory.GetFiles(
            TestData.GetInstancesDirectory(),
            instanceGuid + ".json",
            SearchOption.AllDirectories
        );
        paths = paths.Where(p => p.Contains($"{instanceOwnerPartyId}")).ToArray();
        if (paths.Length == 1)
        {
            return paths.First();
        }

        return string.Empty;
    }

    private static string GetInstancePath(string app, string org, int instanceOwnerId, Guid instanceId)
    {
        return Path.Join(TestData.GetInstancesDirectory(), org, app, instanceOwnerId.ToString(), instanceId + ".json");
    }

    private static string GetDataPath(string org, string app, int instanceOwnerId, Guid instanceGuid)
    {
        return Path.Join(
                TestData.GetInstancesDirectory(),
                org,
                app,
                instanceOwnerId.ToString(),
                instanceGuid.ToString()
            ) + Path.DirectorySeparatorChar;
    }

    private List<DataElement> GetDataElements(string org, string app, int instanceOwnerId, Guid instanceId)
    {
        string path = GetDataPath(org, app, instanceOwnerId, instanceId);

        List<DataElement> dataElements = new();

        if (!Directory.Exists(path))
        {
            return dataElements;
        }

        foreach (string file in Directory.GetFiles(path))
        {
            if (file.Contains(".pretest"))
            {
                continue;
            }

            string content = File.ReadAllText(file);
            DataElement dataElement =
                JsonConvert.DeserializeObject<DataElement>(content)
                ?? throw new InvalidDataException($"Something went wrong deserializing json for data from path {file}");

            if (
                dataElement.DeleteStatus?.IsHardDeleted == true
                && string.IsNullOrEmpty(_httpContextAccessor?.HttpContext?.User?.GetOrg())
            )
            {
                continue;
            }

            dataElements.Add(dataElement);
        }

        return dataElements;
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

        instance.CompleteConfirmations = new List<CompleteConfirmation>
        {
            new CompleteConfirmation { StakeholderId = org },
        };

        return await Task.FromResult(instance);
    }

    public async Task<Instance> UpdateReadStatus(int instanceOwnerPartyId, Guid instanceGuid, string readStatus)
    {
        if (!Enum.TryParse(readStatus, true, out ReadStatus newStatus))
        {
            throw new ArgumentOutOfRangeException(
                nameof(readStatus),
                $"Unable to parse argument as a valid ReadStatus enum."
            );
        }

        string instancePath = GetInstancePath(instanceOwnerPartyId, instanceGuid);

        if (!File.Exists(instancePath))
        {
            throw new IOException($"Could not find file for instance on specified path {instancePath}.");
        }

        string content = File.ReadAllText(instancePath);
        Instance storedInstance =
            JsonConvert.DeserializeObject<Instance>(content)
            ?? throw new InvalidDataException(
                $"Something went wrong deserializing json for instance from path {instancePath}"
            );

        storedInstance.Status ??= new InstanceStatus();
        storedInstance.Status.ReadStatus = newStatus;

        File.WriteAllText(instancePath, JsonConvert.SerializeObject(storedInstance));
        return await Task.FromResult(storedInstance);
    }

    public async Task<Instance> UpdateSubstatus(int instanceOwnerPartyId, Guid instanceGuid, Substatus substatus)
    {
        DateTime creationTime = DateTime.UtcNow;

        if (substatus == null || string.IsNullOrEmpty(substatus.Label))
        {
            throw await PlatformHttpException.CreateAsync(
                new HttpResponseMessage { StatusCode = System.Net.HttpStatusCode.BadRequest }
            );
        }

        string instancePath = GetInstancePath(instanceOwnerPartyId, instanceGuid);

        if (!File.Exists(instancePath))
        {
            throw new IOException($"Could not find file for instance on specified path {instancePath}.");
        }

        string content = File.ReadAllText(instancePath);
        Instance storedInstance =
            JsonConvert.DeserializeObject<Instance>(content)
            ?? throw new InvalidDataException(
                $"Something went wrong deserializing json for instance from path {instancePath}"
            );

        storedInstance.Status ??= new InstanceStatus();
        storedInstance.Status.Substatus = substatus;
        storedInstance.LastChanged = creationTime;

        // mock does not set last changed by, but this is set by the platform.
        storedInstance.LastChangedBy = string.Empty;

        File.WriteAllText(instancePath, JsonConvert.SerializeObject(storedInstance));
        return await GetInstance(storedInstance);
    }

    public async Task<Instance> UpdatePresentationTexts(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        PresentationTexts presentationTexts
    )
    {
        string instancePath = GetInstancePath(instanceOwnerPartyId, instanceGuid);
        if (!File.Exists(instancePath))
        {
            throw new IOException($"Could not find file for instance on specified path {instancePath}.");
        }

        string content = File.ReadAllText(instancePath);
        Instance storedInstance =
            JsonConvert.DeserializeObject<Instance>(content)
            ?? throw new InvalidDataException(
                $"Something went wrong deserializing json for instance from path {instancePath}"
            );

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

    public async Task<Instance> UpdateDataValues(int instanceOwnerPartyId, Guid instanceGuid, DataValues dataValues)
    {
        string instancePath = GetInstancePath(instanceOwnerPartyId, instanceGuid);
        if (!File.Exists(instancePath))
        {
            throw new IOException($"Could not find file for instance on specified path {instancePath}.");
        }

        string content = File.ReadAllText(instancePath);
        Instance storedInstance =
            JsonConvert.DeserializeObject<Instance>(content)
            ?? throw new InvalidDataException(
                $"Something went wrong deserializing json for instance from path {instancePath}"
            );

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

    public Task<Instance> DeleteInstance(int instanceOwnerPartyId, Guid instanceGuid, bool hard)
    {
        string instancePath = GetInstancePath(instanceOwnerPartyId, instanceGuid);
        if (!File.Exists(instancePath))
        {
            throw new IOException($"Could not find file for instance on specified path {instancePath}.");
        }

        string content = File.ReadAllText(instancePath);
        Instance storedInstance =
            JsonConvert.DeserializeObject<Instance>(content)
            ?? throw new InvalidDataException(
                $"Something went wrong deserializing json for instance from path {instancePath}"
            );

        storedInstance.Status ??= new InstanceStatus();

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

    /// <summary>
    /// Searches through all instance documents (including pretest)
    /// </summary>
    public async Task<List<Instance>> GetInstances(Dictionary<string, StringValues> queryParams)
    {
        List<string> validQueryParams = new()
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
            "archiveReference",
        };

        string invalidKey = queryParams.FirstOrDefault(q => !validQueryParams.Contains(q.Key)).Key;
        if (!string.IsNullOrEmpty(invalidKey))
        {
            // platform exceptions.
            HttpResponseMessage res = new()
            {
                StatusCode = System.Net.HttpStatusCode.BadRequest,
                Content = new StringContent($"Unknown query parameter: {invalidKey}"),
            };

            throw await PlatformHttpException.CreateAsync(res);
        }

        List<Instance> instances = new();

        string instancesPath = TestData.GetInstancesDirectory();

        int fileDepth = 4;

        if (queryParams.TryGetValue("appId", out StringValues appIdQueryVal) && appIdQueryVal.Count > 0)
        {
            instancesPath +=
                Path.DirectorySeparatorChar + appIdQueryVal.First()?.Replace('/', Path.DirectorySeparatorChar);
            fileDepth -= 2;

            if (
                queryParams.TryGetValue("instanceOwner.partyId", out StringValues partyIdQueryVal)
                && partyIdQueryVal.Count > 0
            )
            {
                instancesPath += Path.DirectorySeparatorChar + partyIdQueryVal.First();
                fileDepth -= 1;
            }
        }

        if (Directory.Exists(instancesPath))
        {
            string[] files = Directory.GetFiles(instancesPath, "*.json", SearchOption.AllDirectories);
            int instancePathLenght = instancesPath.Split(Path.DirectorySeparatorChar).Length;

            // only parse files at the correct level. Instances are places four levels [org/app/partyId/instance] below instance path.
            List<string> instanceFiles = files
                .Where(f => f.Split(Path.DirectorySeparatorChar).Length == (instancePathLenght + fileDepth))
                .ToList();

            foreach (var file in instanceFiles)
            {
                string content = File.ReadAllText(file);
                Instance? instance = JsonConvert.DeserializeObject<Instance>(content);
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

        if (
            queryParams.ContainsKey("status.isArchived")
            && bool.TryParse(queryParams.GetValueOrDefault("status.isArchived"), out match)
        )
        {
            instances.RemoveAll(i => i.Status.IsArchived != match);
        }

        if (
            queryParams.ContainsKey("status.isHardDeleted")
            && bool.TryParse(queryParams.GetValueOrDefault("status.isHardDeleted"), out match)
        )
        {
            instances.RemoveAll(i => i.Status.IsHardDeleted != match);
        }

        if (
            queryParams.ContainsKey("status.isSoftDeleted")
            && bool.TryParse(queryParams.GetValueOrDefault("status.isSoftDeleted"), out match)
        )
        {
            instances.RemoveAll(i => i.Status.IsSoftDeleted != match);
        }

        instances.RemoveAll(i => i.Status.IsHardDeleted);
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
            && dataElement.LastChanged > instance.LastChanged
        );

        if (newerDataElements.Count == 0)
        {
            return (lastChangedBy, lastChanged);
        }

        lastChanged = instance.LastChanged;
        newerDataElements.ForEach(
            (DataElement dataElement) =>
            {
                if (dataElement.LastChanged > lastChanged)
                {
                    lastChangedBy = dataElement.LastChangedBy;
                    lastChanged = (DateTime)dataElement.LastChanged;
                }
            }
        );

        return (lastChangedBy, lastChanged);
    }
}
