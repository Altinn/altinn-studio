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
    public required List<ValidationSourcePair> ValidationIssues { get; init; }

    /// <summary>
    /// The current data in all data models updated by the patch operation.
    /// </summary>
    public required List<DataModelPairResponse> NewDataModels { get; init; }

    /// <summary>
    /// Pair of Guid and data object.
    /// </summary>
    /// <param name="Id">The guid of the DataElement</param>
    /// <param name="Data">The form data of the data element</param>
    public record DataModelPairResponse(Guid Id, object Data);

    /// <summary>
    /// The instance with updated dataElement list.
    /// </summary>
    public required Instance Instance { get; init; }
}
