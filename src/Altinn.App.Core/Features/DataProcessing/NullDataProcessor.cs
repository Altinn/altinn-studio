using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.DataProcessing;

/// <summary>
/// Default implementation of the IDataProcessor interface.
/// This implementation does not do any thing to the data
/// </summary>
public class NullDataProcessor: IDataProcessor
{
    /// <inheritdoc />
    public async Task<bool> ProcessDataRead(Instance instance, Guid? dataId, object data)
    {
        return await Task.FromResult(false);
    }

    /// <inheritdoc />
    public async Task<bool> ProcessDataWrite(Instance instance, Guid? dataId, object data)
    {
        return await Task.FromResult(false);
    }
}