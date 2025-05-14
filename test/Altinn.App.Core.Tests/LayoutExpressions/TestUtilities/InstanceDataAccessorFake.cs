using System.Collections;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Tests.LayoutExpressions.TestUtilities;

public class InstanceDataAccessorFake : IInstanceDataAccessor, IEnumerable<KeyValuePair<DataElement?, object>>
{
    private readonly ApplicationMetadata _applicationMetadata;
    private readonly string? _defaultTaskId;
    private readonly string _defaultDataType;

    public InstanceDataAccessorFake(
        Instance instance,
        ApplicationMetadata? applicationMetadata,
        string defaultTaskId = "Task_1",
        string defaultDataType = "default"
    )
    {
        _applicationMetadata = applicationMetadata ?? new ApplicationMetadata("app/org") { DataTypes = [] };
        _defaultTaskId = defaultTaskId;
        _defaultDataType = defaultDataType;
        Instance = instance;
        Instance.Data ??= new();
    }

    private readonly Dictionary<DataElementIdentifier, object> _dataById = new();
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
        var dataType = _applicationMetadata.DataTypes.Find(d => d.Id == dataElement.DataType);
        if (dataType is null)
        {
            // Create a new dataType if it doesn't exist in the application metadata yet
            dataType = new DataType()
            {
                Id = dataElement.DataType,
                TaskId = _defaultTaskId,
                AppLogic = new() { ClassRef = data.GetType().FullName },
                MaxCount = maxCount,
            };
            _applicationMetadata.DataTypes.Add(dataType);
        }

        if (dataType.AppLogic is not null)
        {
            if (dataType.AppLogic.ClassRef != data.GetType().FullName)
                throw new InvalidOperationException(
                    $"Data object registered for {dataElement.DataType} is not of type {dataType.AppLogic.ClassRef ?? "NULL"} as specified in applicationmetadata, but was {data.GetType().FullName}"
                );
        }

        _data.Add(KeyValuePair.Create(dataElement, data));
    }

    public Instance Instance { get; }

    public Task<object> GetFormData(DataElementIdentifier dataElementIdentifier)
    {
        return Task.FromResult(_dataById[dataElementIdentifier]);
    }

    public Task<ReadOnlyMemory<byte>> GetBinaryData(DataElementIdentifier dataElementIdentifier)
    {
        throw new NotImplementedException();
    }

    public DataElement GetDataElement(DataElementIdentifier dataElementIdentifier)
    {
        return Instance.Data.Find(d => d.Id == dataElementIdentifier.Id)
            ?? throw new InvalidOperationException(
                $"Data element of id {dataElementIdentifier.Id} not found on instance"
            );
    }

    public DataType? GetDataType(string dataTypeId)
    {
        if (_applicationMetadata is null)
        {
            throw new InvalidOperationException("Application metadata not set for InstanceDataAccessorFake");
        }
        var dataType = _applicationMetadata.DataTypes.Find(d => d.Id == dataTypeId);

        return dataType;
    }

    public void AddFormDataElement(string dataType, object model)
    {
        throw new NotImplementedException();
    }

    public void AddAttachmentDataElement(
        string dataType,
        string contentType,
        string? filename,
        ReadOnlyMemory<byte> data
    )
    {
        throw new NotImplementedException();
    }

    public void RemoveDataElement(DataElementIdentifier dataElementIdentifier)
    {
        throw new NotImplementedException();
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
