using System;
using System.Text.Json;
using System.Threading;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Services.Interfaces.Preview;
using Microsoft.Extensions.Caching.Distributed;

namespace Altinn.Studio.Designer.Services.Implementation.Preview;

public class DataService(
        IDistributedCache distributedCache
        ) : IDataService
{

    public DataElement CreateDataElement(string org, string app, int partyId, Guid instanceGuid, string dataTypeId, CancellationToken cancellationToken = default)
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
        Console.WriteLine("Setting data element instance: " + dataElementGuid + " to data type: " + dataTypeId);

        string dataElementJson = JsonSerializer.Serialize(dataElement);
        distributedCache.SetString(dataElementGuid.ToString(), dataElementJson);
        return dataElement;
    }

    public DataElement GetDataElement(string org, string app, int partyId, Guid instanceGuid, Guid dataGuid, CancellationToken cancellationToken = default)
    {
        string dataElementJson = distributedCache.GetString(dataGuid.ToString());
        DataElement dataElement = JsonSerializer.Deserialize<DataElement>(dataElementJson);
        return dataElement;
    }
}
