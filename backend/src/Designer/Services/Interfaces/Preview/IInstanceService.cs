using System;
using System.Collections.Generic;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Studio.Designer.Services.Interfaces.Preview;

/// <summary>
/// Interface for handling a mocked datatype object for preview mode
/// </summary>
public interface IInstanceService
{
    public Instance CreateInstance(string org, string app, int partyId, string taskId, List<DataType> dataTypes);
    public Instance GetInstance(Guid instanceGuid);

    public Instance AddDataElement(Guid instanceGuid, DataElement dataElement);
    public Instance RemoveDataElement(Guid instanceGuid, Guid dataElementGuid);
}
