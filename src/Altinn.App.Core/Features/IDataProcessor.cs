using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features;

/// <summary>
/// This interface defines all the methods that are required for overriding DataProcessing calls.
/// </summary>
public interface IDataProcessor
{
    /// <summary>
    /// Is called to run custom calculation events defined by app developer when data is read from app
    /// </summary>
    /// <param name="instance">Instance that data belongs to</param>
    /// <param name="dataId">Data id for the  data (nullable if stateless)</param>
    /// <param name="data">The data to perform calculations on</param>
    public Task ProcessDataRead(Instance instance, Guid? dataId, object data);

    /// <summary>
    /// Is called to run custom calculation events defined by app developer when data is written to app
    /// </summary>
    /// <param name="instance">Instance that data belongs to</param>
    /// <param name="dataId">Data id for the  data (nullable if stateless)</param>
    /// <param name="data">The data to perform calculations on</param>
    /// <param name="changedFields">optional dictionary of field keys and previous values (untrusted from frontend)</param>
    public Task ProcessDataWrite(Instance instance, Guid? dataId, object data, Dictionary<string, string?>? changedFields);
}