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
    /// <param name="dataType"></param>
    /// <param name="dataElement"></param>
    /// <param name="jsonPatch"></param>
    /// <param name="language"></param>
    /// <param name="ignoredValidators"></param>
    /// <returns></returns>
    public Task<ServiceResult<DataPatchResult, DataPatchError>> ApplyPatch(Instance instance, DataType dataType, DataElement dataElement, JsonPatch jsonPatch, string? language, List<string>? ignoredValidators = null);
}