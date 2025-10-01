using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process.ProcessTasks;

/// <inheritdoc/>
public class ProcessTaskDataLocker : IProcessTaskDataLocker
{
    private readonly IAppMetadata _appMetadata;
    private readonly IDataClient _dataClient;

    /// <summary>
    /// Initializes a new instance of the <see cref="ProcessTaskDataLocker"/> class.
    /// </summary>
    /// <param name="appMetadata"></param>
    /// <param name="dataClient"></param>
    public ProcessTaskDataLocker(IAppMetadata appMetadata, IDataClient dataClient)
    {
        _appMetadata = appMetadata;
        _dataClient = dataClient;
    }

    /// <inheritdoc/>
    public async Task Unlock(string taskId, Instance instance)
    {
        ApplicationMetadata applicationMetadata = await _appMetadata.GetApplicationMetadata();
        List<DataType> connectedDataTypes = applicationMetadata.DataTypes.FindAll(dt => dt.TaskId == taskId);
        InstanceIdentifier instanceIdentifier = new(instance);
        foreach (DataType dataType in connectedDataTypes)
        {
            List<DataElement> dataElements = instance.Data.FindAll(de => de.DataType == dataType.Id);
            foreach (DataElement dataElement in dataElements)
            {
                await _dataClient.UnlockDataElement(instanceIdentifier, Guid.Parse(dataElement.Id));
            }
        }
    }

    /// <inheritdoc/>
    public async Task Lock(string taskId, Instance instance)
    {
        ApplicationMetadata applicationMetadata = await _appMetadata.GetApplicationMetadata();
        List<DataType> connectedDataTypes = applicationMetadata.DataTypes.FindAll(dt => dt.TaskId == taskId);
        InstanceIdentifier instanceIdentifier = new(instance);
        foreach (DataType dataType in connectedDataTypes)
        {
            List<DataElement> dataElements = instance.Data.FindAll(de => de.DataType == dataType.Id);
            foreach (DataElement dataElement in dataElements)
            {
                await _dataClient.LockDataElement(instanceIdentifier, Guid.Parse(dataElement.Id));
            }
        }
    }
}
