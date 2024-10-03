using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features;

/// <summary>
/// Extension of the IInstanceDataAccessor that allows for adding and removing data elements,
/// and also indicate that it is OK to mutate the models
/// </summary>
public interface IInstanceDataMutator : IInstanceDataAccessor
{
    /// <summary>
    /// Add a new data element with app logic to the instance of this accessor
    /// </summary>
    /// <remarks>
    /// Serialization of data is done immediately, so the data object should be in a valid state.
    /// </remarks>
    /// <throws>Throws an InvalidOperationException if the dataType is not found in applicationmetadata</throws>
    void AddFormDataElement(string dataType, object model);

    /// <summary>
    /// Add a new data element without app logic to the instance.
    /// </summary>
    /// <remarks>
    /// Saving to storage is not done until the instance is saved, so mutations to data might or might not be sendt to storage.
    /// </remarks>
    void AddAttachmentDataElement(string dataType, string contentType, string? filename, ReadOnlyMemory<byte> bytes);

    /// <summary>
    /// Remove a data element from the instance.
    ///
    /// Actual removal from storage is not done until the instance is saved.
    /// </summary>
    void RemoveDataElement(DataElementIdentifier dataElementIdentifier);
}
