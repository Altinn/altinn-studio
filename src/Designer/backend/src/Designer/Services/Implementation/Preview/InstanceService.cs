using System;
using System.Collections.Generic;
using System.Text.Json;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Services.Interfaces.Preview;
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
            if (dataType.AppLogic?.ClassRef is not null)
            {
                DataElement dataElement = dataService.CreateDataElement(partyId, instanceGuid, dataType.Id);
                instance.Data.Add(dataElement);
                if (dataType.MaxCount != 1)
                {
                    // Add two elments when more than 1 element is supported
                    instance.Data.Add(dataService.CreateDataElement(partyId, instanceGuid, dataType.Id));
                }
            }
        });
        distributedCache.SetString(instance.Id, JsonSerializer.Serialize(instance), _cacheOptions);
        return instance;
    }

    public Instance GetInstance(Guid instanceGuid)
    {
        string instanceJson = distributedCache.GetString(instanceGuid.ToString());
        Instance instanceElement = JsonSerializer.Deserialize<Instance>(instanceJson);
        return instanceElement;
    }

    public Instance AddDataElement(Guid instanceGuid, DataElement dataElement)
    {
        string instanceJson = distributedCache.GetString(instanceGuid.ToString());
        Instance instanceElement = JsonSerializer.Deserialize<Instance>(instanceJson);
        instanceElement.Data.Add(dataElement);
        distributedCache.SetString(instanceGuid.ToString(), JsonSerializer.Serialize(instanceElement), _cacheOptions);
        return instanceElement;
    }

    public Instance RemoveDataElement(Guid instanceGuid, Guid dataElementGuid)
    {
        string instanceJson = distributedCache.GetString(instanceGuid.ToString());
        Instance instanceElement = JsonSerializer.Deserialize<Instance>(instanceJson);
        instanceElement.Data.RemoveAll(dataElement => dataElement.Id == dataElementGuid.ToString());
        distributedCache.SetString(instanceGuid.ToString(), JsonSerializer.Serialize(instanceElement), _cacheOptions);
        return instanceElement;
    }
}
