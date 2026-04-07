using System.Text.Json;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Instances;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Primitives;

namespace Altinn.App.Api.Tests.Mocks;

public sealed class InstanceClientMockSi : IInstanceClient
{
    private readonly ILogger _logger;
    private readonly IHttpContextAccessor _httpContextAccessor;

    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        AllowTrailingCommas = true,
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.Never,
        NewLine = "\n",
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() },
    };

    public InstanceClientMockSi(ILogger<IInstanceClient> logger, IHttpContextAccessor httpContextAccessor)
    {
        _logger = logger;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task<Instance> CreateInstance(
        string org,
        string app,
        Instance instanceTemplate,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    )
    {
        string partyId = instanceTemplate.InstanceOwner.PartyId;
        Guid instanceGuid = Guid.NewGuid();
        instanceTemplate.Id = $"{partyId}/{instanceGuid}";
        instanceTemplate.AppId = $"{org}/{app}";
        instanceTemplate.Org = org;
        instanceTemplate.Data = new List<DataElement>();

        string instancePath = GetInstancePath(app, org, int.Parse(partyId), instanceGuid);
        string directory =
            Path.GetDirectoryName(instancePath)
            ?? throw new IOException($"Could not get directory name of specified path {instancePath}");
        _ = Directory.CreateDirectory(directory);
        await WriteJsonFile(instancePath, instanceTemplate);

        _logger.LogInformation(
            "Created instance for app {org}/{app}. writing to path: {instancePath}",
            org,
            app,
            instancePath
        );

        return instanceTemplate;
    }

    /// <inheritdoc />
    public async Task<Instance> GetInstance(
        Instance instance,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    )
    {
        string app = instance.AppId.Split("/")[1];
        string org = instance.Org;
        int instanceOwnerId = int.Parse(instance.InstanceOwner.PartyId);
        Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);

        return await GetInstance(app, org, instanceOwnerId, instanceGuid);
    }

    public async Task<Instance> GetInstance(
        string app,
        string org,
        int instanceOwnerPartyId,
        Guid instanceId,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    )
    {
        Instance instance = await GetTestInstance(app, org, instanceOwnerPartyId, instanceId);

        if (instance is null)
        {
            throw new IOException($"Could not load instance {instanceId} from app {org}/{app}");
        }

        instance.Data = await GetDataElements(org, app, instanceOwnerPartyId, instanceId);
        (instance.LastChangedBy, instance.LastChanged) = FindLastChanged(instance);

        return instance;
    }

    public async Task<Instance> UpdateProcess(
        Instance instance,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    )
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

        Instance storedInstance = await ReadJsonFile<Instance>(instancePath);

        // Archiving instance if process was ended
        if (storedInstance.Process?.Ended == null && process.Ended != null)
        {
            storedInstance.Status ??= new InstanceStatus();
            storedInstance.Status.Archived = process.Ended;
            storedInstance.Status.IsArchived = true;
        }

        storedInstance.Process = process;
        storedInstance.LastChanged = DateTime.UtcNow;

        await WriteJsonFile(instancePath, storedInstance);

        return storedInstance;
    }

    public Task<Instance> UpdateProcessAndEvents(
        Instance instance,
        List<InstanceEvent> events,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    )
    {
        return UpdateProcess(instance);
    }

    private static async Task<Instance> GetTestInstance(string app, string org, int instanceOwnerId, Guid instanceId)
    {
        string instancePath = GetInstancePath(app, org, instanceOwnerId, instanceId);

        return await ReadJsonFile<Instance>(instancePath);
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

    private async Task<List<DataElement>> GetDataElements(string org, string app, int instanceOwnerId, Guid instanceId)
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

            DataElement dataElement = await ReadJsonFile<DataElement>(file);

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

    public Task<List<Instance>> GetActiveInstances(
        int instanceOwnerPartyId,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        throw new NotImplementedException();
    }

    public async Task<Instance> AddCompleteConfirmation(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    )
    {
        string org;
        string app;
        Instance instance;

        switch ($"{instanceOwnerPartyId}/{instanceGuid}")
        {
            case "1337/66233fb5-a9f2-45d4-90b1-f6d93ad40713":
                org = "tdd";
                app = "endring-av-navn";
                instance = await GetTestInstance(app, org, instanceOwnerPartyId, instanceGuid);
                break;
            default:
                org = string.Empty;
                instance = new Instance();
                break;
        }

        instance.CompleteConfirmations = [new CompleteConfirmation { StakeholderId = org }];

        return instance;
    }

    public async Task<Instance> UpdateReadStatus(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        string readStatus,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    )
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

        Instance storedInstance = await ReadJsonFile<Instance>(instancePath);

        storedInstance.Status ??= new InstanceStatus();
        storedInstance.Status.ReadStatus = newStatus;

        await WriteJsonFile(instancePath, storedInstance);
        return storedInstance;
    }

    public async Task<Instance> UpdateSubstatus(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Substatus substatus,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    )
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

        Instance storedInstance = await ReadJsonFile<Instance>(instancePath);

        storedInstance.Status ??= new InstanceStatus();
        storedInstance.Status.Substatus = substatus;
        storedInstance.LastChanged = creationTime;

        // mock does not set last changed by, but this is set by the platform.
        storedInstance.LastChangedBy = string.Empty;

        await WriteJsonFile(instancePath, storedInstance);
        return await GetInstance(storedInstance);
    }

    public async Task<Instance> UpdatePresentationTexts(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        PresentationTexts presentationTexts,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    )
    {
        string instancePath = GetInstancePath(instanceOwnerPartyId, instanceGuid);
        if (!File.Exists(instancePath))
        {
            throw new IOException($"Could not find file for instance on specified path {instancePath}.");
        }

        Instance storedInstance = await ReadJsonFile<Instance>(instancePath);

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

        await WriteJsonFile(instancePath, storedInstance);
        var org = storedInstance.Org;
        var app = storedInstance.AppId.Split("/")[1];

        storedInstance.Data = await GetDataElements(org, app, instanceOwnerPartyId, instanceGuid);
        (storedInstance.LastChangedBy, storedInstance.LastChanged) = FindLastChanged(storedInstance);

        return storedInstance;
    }

    public async Task<Instance> UpdateDataValues(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        DataValues dataValues,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    )
    {
        string instancePath = GetInstancePath(instanceOwnerPartyId, instanceGuid);
        if (!File.Exists(instancePath))
        {
            throw new IOException($"Could not find file for instance on specified path {instancePath}.");
        }

        Instance storedInstance = await ReadJsonFile<Instance>(instancePath);

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

        await WriteJsonFile(instancePath, storedInstance);
        var org = storedInstance.Org;
        var app = storedInstance.AppId.Split("/")[1];

        storedInstance.Data = await GetDataElements(org, app, instanceOwnerPartyId, instanceGuid);
        (storedInstance.LastChangedBy, storedInstance.LastChanged) = FindLastChanged(storedInstance);

        return storedInstance;
    }

    public async Task<Instance> DeleteInstance(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        bool hard,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    )
    {
        string instancePath = GetInstancePath(instanceOwnerPartyId, instanceGuid);
        if (!File.Exists(instancePath))
        {
            throw new IOException($"Could not find file for instance on specified path {instancePath}.");
        }

        Instance storedInstance = await ReadJsonFile<Instance>(instancePath);

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

        await WriteJsonFile(instancePath, storedInstance);

        return storedInstance;
    }

    /// <summary>
    /// Searches through all instance documents (including pretest)
    /// </summary>
    public async Task<List<Instance>> GetInstances(
        Dictionary<string, StringValues> queryParams,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    )
    {
        List<string> validQueryParams =
        [
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
        ];

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
                Instance instance = await ReadJsonFile<Instance>(file);
                if (instance.Id != null)
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

        if (queryParams.TryGetValue("instanceOwner.partyId", out var instanceOwnerPartyIdParam))
        {
            instances.RemoveAll(i => !instanceOwnerPartyIdParam.Contains(i.InstanceOwner.PartyId));
        }

        if (queryParams.ContainsKey("archiveReference"))
        {
            string archiveRef = queryParams.GetValueOrDefault("archiveReference").ToString();
            instances.RemoveAll(i => !i.Id.EndsWith(archiveRef.ToLower()));
        }

        if (
            queryParams.ContainsKey("status.isArchived")
            && bool.TryParse(queryParams.GetValueOrDefault("status.isArchived"), out var match)
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
        newerDataElements.ForEach(dataElement =>
        {
            if (dataElement.LastChanged > lastChanged)
            {
                lastChangedBy = dataElement.LastChangedBy;
                lastChanged = (DateTime)dataElement.LastChanged;
            }
        });

        return (lastChangedBy, lastChanged);
    }

    private static readonly SemaphoreSlim _fileLock = new(1, 1);

    public static async Task<T> ReadJsonFile<T>(string path, CancellationToken cancellationToken = default)
    {
        if (!File.Exists(path))
        {
            throw new FileNotFoundException($"Could not find file on specified path {path}");
        }
        await _fileLock.WaitAsync(cancellationToken);
        try
        {
            var bytes = await File.ReadAllBytesAsync(path, cancellationToken);
            return JsonSerializer.Deserialize<T>(bytes, _jsonSerializerOptions)
                ?? throw new InvalidDataException($"Something went wrong deserializing json from path {path}");
        }
        catch (JsonException e)
        {
            throw new InvalidDataException($"Could not deserialize json from path {path}", e);
        }
        finally
        {
            _fileLock.Release();
        }
    }

    public static async Task WriteJsonFile<T>(string path, T obj, CancellationToken cancellationToken = default)
    {
        var bytes = JsonSerializer.SerializeToUtf8Bytes(obj, _jsonSerializerOptions);
        await _fileLock.WaitAsync(cancellationToken);
        try
        {
            await File.WriteAllBytesAsync(path, bytes, cancellationToken);
        }
        finally
        {
            _fileLock.Release();
        }
    }
}
