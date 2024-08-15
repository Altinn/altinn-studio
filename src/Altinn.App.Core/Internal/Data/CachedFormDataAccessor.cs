using System.Collections.Concurrent;
using System.Globalization;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
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
    private readonly LazyCache<string, object> _cache = new();

    public CachedInstanceDataAccessor(
        Instance instance,
        IDataClient dataClient,
        IAppMetadata appMetadata,
        IAppModel appModel
    )
    {
        _org = instance.Org;
        _app = instance.AppId.Split("/")[1];
        _instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);
        _instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId, CultureInfo.InvariantCulture);
        _dataClient = dataClient;
        _appMetadata = appMetadata;
        _appModel = appModel;
    }

    /// <inheritdoc />
    public async Task<object> Get(DataElement dataElement)
    {
        return await _cache.GetOrCreate(
            dataElement.Id,
            async _ =>
            {
                var appMetadata = await _appMetadata.GetApplicationMetadata();
                var dataType = appMetadata.DataTypes.Find(d => d.Id == dataElement.DataType);
                if (dataType == null)
                {
                    throw new InvalidOperationException($"Data type {dataElement.DataType} not found in app metadata");
                }

                if (dataType.AppLogic?.ClassRef != null)
                {
                    return await GetFormData(dataElement, dataType);
                }

                return await GetBinaryData(dataElement);
            }
        );
    }

    /// <summary>
    /// Add data to the cache, so that it won't be fetched again
    /// </summary>
    /// <param name="dataElement"></param>
    /// <param name="data"></param>
    public void Set(DataElement dataElement, object data)
    {
        _cache.Set(dataElement.Id, data);
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
            ;
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

    private async Task<Stream> GetBinaryData(DataElement dataElement)
    {
        ;
        var data = await _dataClient.GetBinaryData(
            _org,
            _app,
            _instanceOwnerPartyId,
            _instanceGuid,
            Guid.Parse(dataElement.Id)
        );
        return data;
    }

    private async Task<object> GetFormData(DataElement dataElement, DataType dataType)
    {
        var modelType = _appModel.GetModelType(dataType.AppLogic.ClassRef);

        var data = await _dataClient.GetFormData(
            _instanceGuid,
            modelType,
            _org,
            _app,
            _instanceOwnerPartyId,
            Guid.Parse(dataElement.Id)
        );
        return data;
    }
}
