using System.Collections.Concurrent;
using System.Globalization;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Data;

/// <summary>
/// Class that caches form data to avoid multiple calls to the data service for a single validation
///
/// Do not add this to the DI container, as it should only be created explicitly because of data leak potential.
/// </summary>
internal sealed class CachedInstanceDataAccessor : IInstanceDataAccessor
{
    private readonly string _org;
    private readonly string _app;
    private readonly Guid _instanceGuid;
    private readonly int _instanceOwnerPartyId;
    private readonly IDataClient _dataClient;
    private readonly IAppMetadata _appMetadata;
    private readonly IAppModel _appModel;
    private readonly LazyCache<DataElementId, object> _cache = new();

    public CachedInstanceDataAccessor(
        Instance instance,
        IDataClient dataClient,
        IAppMetadata appMetadata,
        IAppModel appModel
    )
    {
        var splitApp = instance.AppId.Split("/");
        _org = splitApp[0];
        _app = splitApp[1];
        var splitId = instance.Id.Split("/");
        _instanceOwnerPartyId = int.Parse(splitId[0], CultureInfo.InvariantCulture);
        _instanceGuid = Guid.Parse(splitId[1]);
        Instance = instance;
        _dataClient = dataClient;
        _appMetadata = appMetadata;
        _appModel = appModel;
    }

    public Instance Instance { get; }

    public async Task<object?> GetSingleDataByType(string dataType)
    {
        var appMetadata = await _appMetadata.GetApplicationMetadata();
        var dataTypeObj = appMetadata.DataTypes.Find(d => d.Id == dataType);
        if (dataTypeObj == null)
        {
            throw new InvalidOperationException($"Data type {dataType} not found in app metadata");
        }
        if (dataTypeObj?.MaxCount != 1)
        {
            throw new InvalidOperationException($"Data type {dataType} is not a single data type");
        }
        var dataElement = Instance.Data.Find(d => d.DataType == dataType);
        if (dataElement == null)
        {
            return null;
        }

        return await GetData(dataElement);
    }

    /// <inheritdoc />
    public async Task<object> GetData(DataElementId dataElementId)
    {
        return await _cache.GetOrCreate(
            dataElementId,
            async _ =>
            {
                var appMetadata = await _appMetadata.GetApplicationMetadata();
                var dataElementIdString = dataElementId.Id.ToString();
                var dataElementType = Instance.Data.Find(d => d.Id == dataElementIdString)?.DataType;
                var dataType = appMetadata.DataTypes.Find(d => d.Id == dataElementType);
                if (dataType == null)
                {
                    throw new InvalidOperationException(
                        $"Data type {dataElementType ?? "unknown"} for data element id {dataElementId} not found in app metadata"
                    );
                }

                if (dataType.AppLogic?.ClassRef != null)
                {
                    return await GetFormData(dataElementId, dataType);
                }

                return await GetBinaryData(dataElementId);
            }
        );
    }

    /// <summary>
    /// Add data to the cache, so that it won't be fetched again
    /// </summary>
    public void Set(DataElementId dataElementId, object data)
    {
        _cache.Set(dataElementId, data);
    }

    /// <summary>
    /// Simple wrapper around a ConcurrentDictionary using Lazy to ensure that the valueFactory is only called once
    /// </summary>
    /// <typeparam name="TKey">The type of the key in the cache</typeparam>
    /// <typeparam name="TValue">The type of the object to cache</typeparam>
    private sealed class LazyCache<TKey, TValue>
        where TKey : notnull
        where TValue : notnull
    {
        private readonly ConcurrentDictionary<TKey, Lazy<Task<TValue>>> _cache = new();

        public async Task<TValue> GetOrCreate(TKey key, Func<TKey, Task<TValue>> valueFactory)
        {
            Task<TValue> task;
            lock (_cache)
            {
                task = _cache.GetOrAdd(key, innerKey => new Lazy<Task<TValue>>(() => valueFactory(innerKey))).Value;
            }
            return await task;
        }

        public void Set(TKey key, TValue data)
        {
            lock (_cache)
            {
                _cache.AddOrUpdate(
                    key,
                    _ => new Lazy<Task<TValue>>(Task.FromResult(data)),
                    (_, _) => new Lazy<Task<TValue>>(Task.FromResult(data))
                );
            }
        }
    }

    private async Task<Stream> GetBinaryData(DataElementId dataElementId)
    {
        var data = await _dataClient.GetBinaryData(_org, _app, _instanceOwnerPartyId, _instanceGuid, dataElementId.Id);
        return data;
    }

    private async Task<object> GetFormData(DataElementId dataElementId, DataType dataType)
    {
        var modelType = _appModel.GetModelType(dataType.AppLogic.ClassRef);

        var data = await _dataClient.GetFormData(
            _instanceGuid,
            modelType,
            _org,
            _app,
            _instanceOwnerPartyId,
            dataElementId.Id
        );
        return data;
    }
}
