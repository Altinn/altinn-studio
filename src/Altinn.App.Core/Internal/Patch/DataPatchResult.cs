using Altinn.App.Core.Features;
using Altinn.App.Core.Models.Validation;

namespace Altinn.App.Core.Internal.Patch;

/// <summary>
/// Result of a data patch operation in the <see cref="IPatchService"/>.
/// </summary>
public class DataPatchResult
{
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
    public Dictionary<Guid, object> GetUpdatedData()
    {
        return ChangedDataElements
            .Where(d => d.HasAppLogic)
            .ToDictionary(
                d => Guid.Parse(d.DataElement.Id),
                d =>
                    d.CurrentValue
                    ?? throw new InvalidOperationException("Data element has app logic but no current value")
            );
    }
}
