using System.Collections;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Tests.LayoutExpressions.TestUtilities;

public class TestInstanceDataAccessor : IInstanceDataAccessor, IEnumerable<KeyValuePair<DataElement?, object>>
{
    public TestInstanceDataAccessor(Instance instance)
    {
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
        _dataByType.TryAdd(dataElement.DataType, data);
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
        return GetEnumerator();
    }
}
