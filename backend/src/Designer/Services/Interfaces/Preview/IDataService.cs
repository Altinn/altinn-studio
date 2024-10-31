using System;
using System.Threading;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Studio.Designer.Services.Interfaces.Preview;

/// <summary>
/// Interface for handling a mocked instance object for preview mode
/// </summary>
public interface IDataService
{
    public DataElement GetDataElement(string org, string app, int partyId, Guid instanceGuid, Guid dataGuid, CancellationToken cancellationToken = default);
    public DataElement CreateDataElement(string org, string app, int partyId, Guid instanceGuid, string dataTypeId, CancellationToken cancellationToken = default);
}
