using Altinn.App.Core.Features;
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
    Task<ServiceResult<DataPatchResult, DataPatchError>> ApplyPatches(
        Instance instance,
        Dictionary<Guid, JsonPatch> patches,
        string? language,
        List<string>? ignoredValidators
    );

    /// <summary>
    /// Runs data processors on all the changes.
    /// </summary>
    Task RunDataProcessors(
        IInstanceDataMutator dataMutator,
        List<DataElementChange> changes,
        string taskId,
        string? language
    );
}
