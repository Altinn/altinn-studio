using System;
using System.Text.Json.Nodes;
using System.Threading;
using Altinn.Platform.Storage.Interface.Models;
using Json.Patch;

namespace Altinn.Studio.Designer.Services.Interfaces.Preview;

/// <summary>
/// Interface for handling a mocked datatype object for preview mode
/// </summary>
public interface IDataService
{
    public DataElement CreateDataElement(string org, string app, int partyId, Guid instanceGuid, string dataTypeId, CancellationToken cancellationToken = default);
    public JsonNode GetDataElement(string org, string app, int partyId, Guid instanceGuid, Guid dataGuid, CancellationToken cancellationToken = default);
    public JsonNode PatchDataElement(string org, string app, int partyId, Guid instanceGuid, Guid dataGuid, JsonPatch patch, CancellationToken cancellationToken);
}
