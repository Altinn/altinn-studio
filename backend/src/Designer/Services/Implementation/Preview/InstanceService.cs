using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Services.Interfaces.Preview;
using Json.Patch;
using Microsoft.Extensions.Caching.Distributed;

namespace Altinn.Studio.Designer.Services.Implementation.Preview;

public class InstanceService(
        IDistributedCache distributedCache,
        IDataService dataService
) : IInstanceService
{
    readonly DistributedCacheEntryOptions _cacheOptions = new()
    {
        SlidingExpiration = TimeSpan.FromMinutes(30),
    };

    public Instance CreateInstance(string org, string app, int partyId, string taskId, List<DataType> dataTypes)
    {
        Guid instanceGuid = Guid.NewGuid();
        Instance instance = new()
        {
            InstanceOwner = new InstanceOwner { PartyId = partyId.ToString() },
            Id = $"{instanceGuid}",
            AppId = app,
            Data = [],
            Org = org,
            Process = new ProcessState
            {
                CurrentTask = new ProcessElementInfo
                {
                    AltinnTaskType = "data",
                    ElementId = taskId
                }
            }
        };
        dataTypes.ForEach(dataType =>
        {
            if (dataType.AppLogic?.AutoCreate == true)
            {
                DataElement dataElement = dataService.CreateDataElement(partyId, instanceGuid, dataType.Id);
                instance.Data.Add(dataElement);
            }
        });
        string instanceJson = JsonSerializer.Serialize<Instance>(instance, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        distributedCache.SetString(instance.Id, instanceJson, _cacheOptions);
        return instance;
    }

    public JsonNode GetInstance(Guid instanceGuid)
    {
        string instanceJson = distributedCache.GetString(instanceGuid.ToString());
        JsonNode instanceElement = JsonSerializer.Deserialize<JsonNode>(instanceJson);
        return instanceElement;
    }

    public JsonNode PatchInstance(Guid instanceGuid, JsonPatch patch)
    {
        string instanceJson = distributedCache.GetString(instanceGuid.ToString());
        JsonNode instanceNode = JsonSerializer.Deserialize<JsonNode>(instanceJson);
        PatchResult patchResult = patch.Apply(instanceNode);
        if (!patchResult.IsSuccess)
        {
            throw new InvalidOperationException("Patch operation failed." + patchResult.Error);
        }
        instanceNode = patchResult.Result;
        distributedCache.SetString(instanceGuid.ToString(), JsonSerializer.Serialize(instanceNode), _cacheOptions);
        return instanceNode;
    }
}
