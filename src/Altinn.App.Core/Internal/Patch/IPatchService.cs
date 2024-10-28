using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Result;
using Altinn.App.Core.Models.Validation;
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
    /// Runs <see cref="IDataProcessor.ProcessDataWrite"/> and <see cref="IDataWriteProcessor.ProcessDataWrite"/> on the changes.
    /// </summary>
    Task RunDataProcessors(
        IInstanceDataMutator dataMutator,
        DataElementChanges changes,
        string taskId,
        string? language
    );

    /// <summary>
    /// Runs incremental validation on the changes.
    /// </summary>
    Task<List<ValidationSourcePair>> RunIncrementalValidation(
        IInstanceDataAccessor dataAccessor,
        string taskId,
        DataElementChanges changes,
        List<string>? ignoredValidators,
        string? language
    );
}
