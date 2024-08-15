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
    public required Dictionary<Guid, object> NewDataModels { get; init; }
}
