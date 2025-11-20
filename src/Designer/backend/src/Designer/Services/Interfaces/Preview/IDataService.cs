#nullable disable
using System;
using System.Text.Json.Nodes;
using Altinn.Platform.Storage.Interface.Models;
using Json.Patch;

namespace Altinn.Studio.Designer.Services.Interfaces.Preview;

/// <summary>
/// Interface for handling a mocked datatype object for preview mode
/// </summary>
public interface IDataService
{
    public DataElement CreateDataElement(int partyId, Guid instanceGuid, string dataTypeId);

    public JsonNode GetDataElement(Guid dataGuid);
    public JsonNode PatchDataElement(Guid dataGuid, JsonPatch patch);
}
