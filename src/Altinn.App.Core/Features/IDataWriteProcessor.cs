namespace Altinn.App.Core.Features;

/// <summary>
/// This interface defines how you can make changes to the data model on every write operation from frontend.
/// </summary>
public interface IDataWriteProcessor
{
    /// <summary>
    /// Is called to run custom calculation events defined by app developer when data is written to app.
    /// </summary>
    /// <remarks>
    /// Make changes directly to the changes[].CurrentFormData object, or fetch other data elements from the instanceDataMutator.
    /// </remarks>
    /// <param name="instanceDataMutator">Object to fetch data elements not included in changes</param>
    /// <param name="taskId">The current task ID</param>
    /// <param name="changes">List of changes that are included in this request(might not include changes to extra data models from previous )</param>
    /// <param name="language">The currently active language or null</param>
    Task ProcessDataWrite(
        IInstanceDataMutator instanceDataMutator,
        string taskId,
        List<DataElementChange> changes,
        string? language
    );
}
