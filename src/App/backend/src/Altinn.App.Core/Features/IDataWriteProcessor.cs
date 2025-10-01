using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features;

/// <summary>
/// This interface defines how you can make changes to the data model on every write operation from frontend.
/// </summary>
[ImplementableByApps]
public interface IDataWriteProcessor
{
    /// <summary>
    /// Is called to run custom calculation events defined by app developer when data is written to app.
    /// This method is called for POST requests in addition to PATCH and PUT requests as the old <see cref="IDataProcessor"/>.
    /// </summary>
    /// <remarks>
    /// Make changes directly to the <see cref="DataElementChanges.FormDataChanges"/>.<see cref="FormDataChange.CurrentFormData"/> object, or fetch other data elements from the instanceDataMutator.
    /// </remarks>
    /// <param name="instanceDataMutator">Object to fetch data elements not included in changes</param>
    /// <param name="taskId">The current task ID</param>
    /// <param name="changes">List of changes that are included in this request(might not include changes to extra data models from previous )</param>
    /// <param name="language">The currently active language or null</param>
    Task ProcessDataWrite(
        IInstanceDataMutator instanceDataMutator,
        string taskId,
        DataElementChanges changes,
        string? language
    );
}
