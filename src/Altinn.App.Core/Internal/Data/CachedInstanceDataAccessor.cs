using System.Collections.Concurrent;
using System.Globalization;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
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
    private readonly ModelSerializationService _modelSerializationService;
    private readonly LazyCache<object> _formDataCache = new();
    private readonly LazyCache<ReadOnlyMemory<byte>> _binaryCache = new();
    private readonly ConcurrentBag<DataElementId> _dataElementsToDelete = new();
    private readonly ConcurrentBag<(
        DataType dataType,
        string contentType,
        string? filename,
        ReadOnlyMemory<byte> bytes
    )> _dataElementsToAdd = new();

    public CachedInstanceDataAccessor(
        Instance instance,
        IDataClient dataClient,
        IAppMetadata appMetadata,
        ModelSerializationService modelSerializationService
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
        _modelSerializationService = modelSerializationService;
    }

    public Instance Instance { get; }

    /// <inheritdoc />
    public async Task<object> GetFormData(DataElementId dataElementId)
    {
        return await _formDataCache.GetOrCreate(
            dataElementId,
            async () =>
            {
                var binaryData = await GetBinaryData(dataElementId);

                return _modelSerializationService.DeserializeFromStorage(binaryData.Span, GetDataType(dataElementId));
            }
        );
    }

    public async Task<ReadOnlyMemory<byte>> GetBinaryData(DataElementId dataElementId) =>
        await _binaryCache.GetOrCreate(
            dataElementId,
            async () =>
                await _dataClient.GetDataBytes(_org, _app, _instanceOwnerPartyId, _instanceGuid, dataElementId.Guid)
        );

    /// <inheritdoc />
    public DataElement GetDataElement(DataElementId dataElementId)
    {
        return Instance.Data.Find(d => d.Id == dataElementId.Id)
            ?? throw new InvalidOperationException($"Data element with id {dataElementId.Id} not found in instance");
    }

    public DataType GetDataType(DataElementId dataElementId)
    {
        var dataElement = GetDataElement(dataElementId);
        var appMetadata = _appMetadata.GetApplicationMetadata().Result;
        var dataType = appMetadata.DataTypes.Find(d => d.Id == dataElement.DataType);
        if (dataType is null)
        {
            throw new InvalidOperationException($"Data type {dataElement.DataType} not found in instance");
        }

        return dataType;
    }

    /// <inheritdoc />
    public void AddFormDataElement(string dataTypeString, object data)
    {
        var dataType = GetDataTypeByString(dataTypeString).Result;
        if (dataType.AppLogic?.ClassRef is not { } classRef)
        {
            throw new InvalidOperationException(
                $"Data type {dataTypeString} does not have a class reference in app metadata"
            );
        }

        var modelType = data.GetType();
        if (modelType.FullName != classRef)
        {
            throw new InvalidOperationException(
                $"Data object registered for {dataTypeString} is not of type {classRef} as specified in application metadata"
            );
        }

        var (bytes, contentType) = _modelSerializationService.SerializeToStorage(data, dataType);

        _dataElementsToAdd.Add((dataType, contentType, null, bytes));
        // var dataElement = await _dataClient.InsertBinaryData(
        //     Instance.Id,
        //     dataTypeString,
        //     contentType,
        //     null,
        //     new MemoryAsStream(binaryData)
        // );
        // Instance.Data.Add(dataElement);
        //
        // return dataElement;
    }

    /// <inheritdoc />
    public void AddAttachmentDataElement(
        string dataTypeString,
        string contentType,
        string? filename,
        ReadOnlyMemory<byte> bytes
    )
    {
        var dataType = GetDataTypeByString(dataTypeString).Result;
        if (dataType.AppLogic?.ClassRef is not null)
        {
            throw new InvalidOperationException(
                $"Data type {dataTypeString} has a AppLogic.ClassRef in app metadata, and is not a binary data element"
            );
        }
        _dataElementsToAdd.Add((dataType, contentType, filename, bytes));
    }

    /// <inheritdoc />
    public void RemoveDataElement(DataElementId dataElementId)
    {
        var idAsString = dataElementId.ToString();
        var dataElement = Instance.Data.Find(d => d.Id == idAsString);
        if (dataElement is null)
        {
            throw new InvalidOperationException($"Data element with id {idAsString} not found in instance");
        }
        //TODO: Add to list of data elements to delete
        // await _dataClient.DeleteData(_org, _app, _instanceOwnerPartyId, _instanceGuid, dataElementId.Guid, true);

        Instance.Data.Remove(dataElement);
    }

    public List<DataElementChange> GetDataElementChanges()
    {
        var changes = new List<DataElementChange>();
        foreach (var dataElement in Instance.Data)
        {
            DataElementId dataElementId = dataElement;
            object? data = _formDataCache.GetCachedValueOrDefault(dataElementId);
            // Skip data elements that have not been fetched
            if (data is null)
                continue;
            var dataType = GetDataType(dataElementId);
            var previousBinary = _binaryCache.GetCachedValueOrDefault(dataElementId);

            ObjectUtils.InitializeAltinnRowId(data);
            ObjectUtils.PrepareModelForXmlStorage(data);

            var (currentBinary, _) = _modelSerializationService.SerializeToStorage(data, dataType);

            if (!currentBinary.Span.SequenceEqual(previousBinary.Span))
            {
                changes.Add(
                    new DataElementChange()
                    {
                        DataElement = dataElement,
                        CurrentFormData = data,
                        PreviousFormData = _modelSerializationService.DeserializeFromStorage(
                            previousBinary.Span,
                            dataType
                        )
                    }
                );
            }
        }

        return changes;
    }

    internal async Task UpdateInstanceData()
    {
        var tasks = new List<Task>();
        ConcurrentBag<DataElement> createdDataElements = new();
        // We need to create data elements here, so that we can set them correctly on the instance
        // Updating and deleting is done in SaveChanges and happen in parallel with validation.

        // Upload added data elements
        foreach (var (dataType, contentType, filename, bytes) in _dataElementsToAdd)
        {
            async Task InsertBinaryData()
            {
                var dataElement = await _dataClient.InsertBinaryData(
                    Instance.Id,
                    dataType.Id,
                    contentType,
                    filename,
                    new MemoryAsStream(bytes)
                );
                createdDataElements.Add(dataElement);
            }

            tasks.Add(InsertBinaryData());
        }

        // Delete data elements
        foreach (var dataElementId in _dataElementsToDelete)
        {
            async Task DeleteData()
            {
                await _dataClient.DeleteData(
                    _org,
                    _app,
                    _instanceOwnerPartyId,
                    _instanceGuid,
                    dataElementId.Guid,
                    true
                );
            }

            tasks.Add(DeleteData());
        }

        await Task.WhenAll(tasks);

        // Remove deleted data elements from instance.Data
        Instance.Data.RemoveAll(dataElement => _dataElementsToDelete.Any(d => d.Id == dataElement.Id));

        // Add Created data elements to instance
        Instance.Data.AddRange(createdDataElements);
    }

    internal async Task SaveChanges(List<DataElementChange> changes, bool initializeRowId)
    {
        var tasks = new List<Task>();

        foreach (var change in changes)
        {
            var dataType = GetDataType(change.DataElement);
            if (initializeRowId)
            {
                ObjectUtils.InitializeAltinnRowId(change.CurrentFormData);
            }

            var (binaryData, contentType) = _modelSerializationService.SerializeToStorage(
                change.CurrentFormData,
                dataType
            );
            // Update cache so that we can compare with the saved data to ensure no changes after save
            _binaryCache.Set(change.DataElement, binaryData);
            tasks.Add(
                _dataClient.UpdateBinaryData(
                    new InstanceIdentifier(Instance),
                    contentType,
                    null,
                    change.DataElement.Guid,
                    new MemoryAsStream(binaryData)
                )
            );
        }

        await Task.WhenAll(tasks);
    }

    /// <summary>
    /// Add or replace existing data element data in the cache
    /// </summary>
    internal void SetFormData(DataElementId dataElementId, object data)
    {
        _formDataCache.Set(dataElementId, data);
    }

    /// <summary>
    /// Simple wrapper around a Dictionary using Lazy to ensure that the valueFactory is only called once
    /// </summary>
    private sealed class LazyCache<T>
    {
        private readonly Dictionary<Guid, Lazy<Task<T>>> _cache = new();

        public async Task<T> GetOrCreate(DataElementId key, Func<Task<T>> valueFactory)
        {
            Lazy<Task<T>>? lazyTask;
            lock (_cache)
            {
                if (!_cache.TryGetValue(key.Guid, out lazyTask))
                {
                    lazyTask = new Lazy<Task<T>>(valueFactory);
                    _cache.Add(key.Guid, lazyTask);
                }
            }
            return await lazyTask.Value;
        }

        public void Set(DataElementId key, T data)
        {
            lock (_cache)
            {
                _cache[key.Guid] = new Lazy<Task<T>>(Task.FromResult(data));
            }
        }

        public T? GetCachedValueOrDefault(DataElementId id)
        {
            lock (_cache)
            {
                if (
                    _cache.TryGetValue(id.Guid, out var lazyTask)
                    && lazyTask.IsValueCreated
                    && lazyTask.Value.IsCompletedSuccessfully
                )
                {
                    return lazyTask.Value.Result;
                }
            }
            return default;
        }
    }

    private async Task<DataType> GetDataTypeByString(string dataTypeString)
    {
        var appMetadata = await _appMetadata.GetApplicationMetadata();
        var dataType = appMetadata.DataTypes.Find(d => d.Id == dataTypeString);
        if (dataType is null)
        {
            throw new InvalidOperationException($"Data type {dataTypeString} not found in app metadata");
        }

        return dataType;
    }

    internal void VerifyDataElementsUnchanged()
    {
        var changes = GetDataElementChanges();
        if (changes.Count > 0)
        {
            throw new InvalidOperationException(
                $"Data elements of type {string.Join(", ", changes.Select(c => c.DataElement.DataType).Distinct())} have been changed by validators"
            );
        }
    }
}
