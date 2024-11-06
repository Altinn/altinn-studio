using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Api.Helpers.Patch;

/// <summary>
/// Result of a data patch operation in the <see cref="InternalPatchService"/>.
/// </summary>
public class DataPatchResult
{
    /// <summary>
    /// The updated instance after the patch and dataProcessing operations.
    /// </summary>
    public required Instance Instance { get; init; }

    /// <summary>
    /// The validation issues that were found during the patch operation.
    /// </summary>
    public required List<ValidationSourcePair> ValidationIssues { get; init; }

    /// <summary>
    /// Get updated data elements that have app logic in a dictionary with the data element id as key.
    /// </summary>
    public required DataElementChanges FormDataChanges { get; init; }
}
