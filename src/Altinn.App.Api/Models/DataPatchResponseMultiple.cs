using Altinn.App.Api.Controllers;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Api.Models;

/// <summary>
/// Represents the response from a data patch operation on the <see cref="DataController"/>.
/// </summary>
public class DataPatchResponseMultiple
{
    /// <summary>
    /// The validation issues that were found during the patch operation.
    /// </summary>
    public required Dictionary<string, List<ValidationIssueWithSource>> ValidationIssues { get; init; }

    /// <summary>
    /// The current data in all data models updated by the patch operation.
    /// </summary>
    public required Dictionary<Guid, object> NewDataModels { get; init; }

    /// <summary>
    /// The instance with updated dataElement list.
    /// </summary>
    public required Instance Instance { get; init; }
}
