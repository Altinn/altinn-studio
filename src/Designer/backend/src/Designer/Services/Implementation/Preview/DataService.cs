#nullable disable
using System;
using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Services.Interfaces.Preview;
using Json.Patch;
using Microsoft.Extensions.Caching.Distributed;

namespace Altinn.Studio.Designer.Services.Implementation.Preview;

public class DataService(
        IDistributedCache distributedCache
) : IDataService
{
    readonly DistributedCacheEntryOptions _cacheOptions = new()
    {
        SlidingExpiration = TimeSpan.FromMinutes(30),
    };

    public DataElement CreateDataElement(int partyId, Guid instanceGuid, string dataTypeId)
    {
        Guid dataElementGuid = Guid.NewGuid();
        DataElement dataElement = new()
        {
            Id = dataElementGuid.ToString(),
            DataType = dataTypeId,
            InstanceGuid = instanceGuid.ToString(),
            Created = DateTime.Now,
            CreatedBy = partyId.ToString(),
        };

        distributedCache.SetString(dataElementGuid.ToString(), "{}", _cacheOptions);
        return dataElement;
    }

    public JsonNode GetDataElement(Guid dataGuid)
    {
        string dataElementJson = distributedCache.GetString(dataGuid.ToString());
        JsonNode dataElement = JsonSerializer.Deserialize<JsonNode>(dataElementJson);
        return dataElement;
    }

    public JsonNode PatchDataElement(Guid dataGuid, JsonPatch patch)
    {
        string dataJson = distributedCache.GetString(dataGuid.ToString());
        JsonNode dataNode = JsonSerializer.Deserialize<JsonNode>(dataJson);
        PatchResult patchResult = patch.Apply(dataNode);
        if (!patchResult.IsSuccess)
        {
            throw new InvalidOperationException("Patch operation failed." + patchResult.Error);
        }
        dataNode = patchResult.Result;
        distributedCache.SetString(dataGuid.ToString(), JsonSerializer.Serialize(dataNode), _cacheOptions);
        return dataNode;
    }

}
