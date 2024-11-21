using System;
using System.Collections.Generic;
using System.Text.Json.Nodes;
using Altinn.Platform.Storage.Interface.Models;
using Json.Patch;

namespace Altinn.Studio.Designer.Services.Interfaces.Preview;

/// <summary>
/// Interface for handling a mocked datatype object for preview mode
/// </summary>
public interface IInstanceService
{
    public Instance CreateInstance(string org, string app, int partyId, string taskId, List<DataType> dataTypes);
    public JsonNode GetInstance(Guid instanceGuid);
    public JsonNode PatchInstance(Guid instanceGuid, JsonPatch patch);
}
