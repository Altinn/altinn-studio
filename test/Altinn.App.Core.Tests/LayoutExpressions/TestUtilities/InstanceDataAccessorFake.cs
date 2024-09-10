using System.Collections;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Tests.LayoutExpressions.TestUtilities;

public class InstanceDataAccessorFake : IInstanceDataAccessor, IEnumerable<KeyValuePair<DataElement?, object>>
{
    private readonly ApplicationMetadata? _applicationMetadata;
    private readonly string? _defaultTaskId;
    private readonly string _defaultDataType;

    public InstanceDataAccessorFake(
        Instance instance,
        ApplicationMetadata? applicationMetadata = null,
        string defaultTaskId = "Task_1",
        string defaultDataType = "default"
    )
    {
        _applicationMetadata = applicationMetadata;
        _defaultTaskId = defaultTaskId;
        _defaultDataType = defaultDataType;
        Instance = instance;
        Instance.Data ??= new();
    }

    private readonly Dictionary<DataElementId, object> _dataById = new();
    private readonly Dictionary<string, object> _dataByType = new();
    private readonly List<KeyValuePair<DataElement, object>> _data = new();

    public void Add(DataElement? dataElement, object data, int maxCount = 1)
    {
        dataElement ??= new DataElement();
        dataElement.DataType ??= _defaultDataType;
        dataElement.Id ??= Guid.NewGuid().ToString();
        if (!Instance.Data.Contains(dataElement))
        {
            Instance.Data.Add(dataElement);
        }

        _dataById.Add(dataElement, data);
        if (_applicationMetadata is not null)
        {
            var dataType = _applicationMetadata.DataTypes.Find(d => d.Id == dataElement.DataType);
            if (dataType is null)
            {
                // Create a new dataType if it doesn't exist in the application metadata yet
                dataType = new DataType()
                {
                    Id = dataElement.DataType,
                    TaskId = _defaultTaskId,
                    AppLogic = new() { ClassRef = data.GetType().FullName },
                    MaxCount = maxCount
                };
                _applicationMetadata.DataTypes.Add(dataType);
            }

            if (dataType.AppLogic is not null)
            {
                if (dataType.AppLogic.ClassRef != data.GetType().FullName)
                    throw new InvalidOperationException(
                        $"Data object registered for {dataElement.DataType} is not of type {dataType.AppLogic.ClassRef ?? "NULL"} as specified in applicationmetadata"
                    );
                if (dataType.MaxCount == 1)
                {
                    _dataByType[dataType.Id] = data;
                }
            }
        }
        else
        {
            // We don't have application metadata, so just add the first element we see
            _dataByType.TryAdd(dataElement.DataType, data);
        }
        _data.Add(KeyValuePair.Create(dataElement, data));
    }

    public Instance Instance { get; }

    public Task<object> GetData(DataElementId dataElementId)
    {
        return Task.FromResult(_dataById[dataElementId]);
    }

    public Task<object?> GetSingleDataByType(string dataType)
    {
        return Task.FromResult(_dataByType.GetValueOrDefault(dataType));
    }

    public IEnumerator<KeyValuePair<DataElement?, object>> GetEnumerator()
    {
        // We implement IEnumerable so that we can use the collection initializer syntax, but we also store the elements for debugger visualization
        return _data.GetEnumerator();
    }

    IEnumerator IEnumerable.GetEnumerator()
    {
        // We implement IEnumerable so that we can use the collection initializer syntax
        return GetEnumerator();
    }
}
