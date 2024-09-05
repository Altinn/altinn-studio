using System.Collections;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Tests.LayoutExpressions.TestUtilities;

public class InstanceDataAccessorFake : IInstanceDataAccessor, IEnumerable<KeyValuePair<DataElement?, object>>
{
    private readonly ApplicationMetadata? _applicationMetadata;

    public InstanceDataAccessorFake(Instance instance, ApplicationMetadata? applicationMetadata = null)
    {
        _applicationMetadata = applicationMetadata;
        Instance = instance;
        Instance.Data ??= new();
    }

    private readonly Dictionary<DataElementId, object> _dataById = new();
    private readonly Dictionary<string, object> _dataByType = new();

    public void Add(DataElement? dataElement, object data)
    {
        dataElement ??= new DataElement();
        dataElement.DataType ??= "default";
        dataElement.Id ??= Guid.NewGuid().ToString();
        if (!Instance.Data.Contains(dataElement))
        {
            Instance.Data.Add(dataElement);
        }

        _dataById.Add(dataElement, data);
        if (_applicationMetadata is not null)
        {
            var dataType =
                _applicationMetadata.DataTypes.Find(d => d.Id == dataElement.DataType)
                ?? throw new ArgumentException($"Data type {dataElement.DataType} not found in application metadata");
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
        // We implement IEnumerable so that we can use the collection initializer syntax
        throw new NotImplementedException();
    }

    IEnumerator IEnumerable.GetEnumerator()
    {
        // We implement IEnumerable so that we can use the collection initializer syntax
        return GetEnumerator();
    }
}
