using System.Text.Json.Nodes;
using Altinn.App.Core.Models.Result;
using Altinn.Platform.Storage.Interface.Models;
using Json.Patch;

namespace Altinn.App.Core.Internal.Patch;

/// <summary>
/// Service for handling JsonPatches to data elements.
/// </summary>
public interface IPatchService
{
    /// <summary>
    /// Applies a patch to a Form Data element
    /// </summary>
    /// <param name="instance"></param>
    /// <param name="patches"></param>
    /// <param name="language"></param>
    /// <param name="ignoredValidators"></param>
    /// <returns></returns>
    Task<ServiceResult<DataPatchResult, DataPatchError>> ApplyPatches(
        Instance instance,
        Dictionary<Guid, JsonPatch> patches,
        string? language,
        List<string>? ignoredValidators
    );
}
