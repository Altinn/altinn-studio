using Altinn.App.Core.Features;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Patch;

/// <summary>
/// Result of a data patch operation in the <see cref="IPatchService"/>.
/// </summary>
public class DataPatchResult
{
    /// <summary>
    /// The updated instance after the patch and dataProcessing operations.
    /// </summary>
    public required Instance Instance { get; set; }

    /// <summary>
    /// The validation issues that were found during the patch operation.
    /// </summary>
    public required Dictionary<string, List<ValidationIssueWithSource>> ValidationIssues { get; init; }

    /// <summary>
    /// The current data model after the patch operation.
    /// </summary>
    public required List<DataElementChange> ChangedDataElements { get; init; }

    /// <summary>
    /// Get updated data elements that have app logic in a dictionary with the data element id as key.
    /// </summary>
    public required Dictionary<Guid, object> UpdatedData { get; init; }
}
