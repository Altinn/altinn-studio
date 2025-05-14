using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Api.Models;

/// <summary>
/// Response that contains the data elements that should be signed.
/// </summary>
public class SigningDataElementsResponse
{
    /// <summary>
    /// The data elements that should be signed.
    /// </summary>
    public required List<DataElement> DataElements { get; set; }
}
