using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features;

/// <summary>
/// This interface defines all the methods that are required for overriding DataProcessing calls.
/// </summary>
[ImplementableByApps]
public interface IDataProcessor
{
    /// <summary>
    /// Is called to run custom calculation events defined by app developer when data is read from app
    /// </summary>
    /// <param name="instance">Instance that data belongs to</param>
    /// <param name="dataId">Data id for the  data (nullable if stateless)</param>
    /// <param name="data">The data to perform calculations on</param>
    /// <param name="language">The currently selected language of the user (if available)</param>
    public Task ProcessDataRead(Instance instance, Guid? dataId, object data, string? language);

    /// <summary>
    /// Is called to run custom calculation events defined by app developer when data is written to app
    /// </summary>
    /// <param name="instance">Instance that data belongs to</param>
    /// <param name="dataId">Data id for the  data (nullable if stateless)</param>
    /// <param name="data">The data to perform calculations on</param>
    /// <param name="previousData">The previous data model (for running comparisons)</param>
    /// <param name="language">The currently selected language of the user (if available)</param>
    public Task ProcessDataWrite(Instance instance, Guid? dataId, object data, object? previousData, string? language);
}
