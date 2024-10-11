using Altinn.App.Api.Controllers;
using Altinn.App.Core.Models.Validation;

namespace Altinn.App.Api.Models;

/// <summary>
/// Represents the response from a data patch operation on the <see cref="DataController"/>.
/// </summary>
public class DataPatchResponse
{
    /// <summary>
    /// The validation issues that were found during the patch operation.
    /// </summary>
    public required Dictionary<string, List<ValidationIssueWithSource>> ValidationIssues { get; init; }

    /// <summary>
    /// The current data model after the patch operation.
    /// </summary>
    public required object NewDataModel { get; init; }
}
