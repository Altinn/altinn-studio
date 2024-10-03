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
internal sealed class CachedInstanceDataAccessor : IInstanceDataMutator
{
    // DataClient needs a few arguments to fetch data
    private readonly string _org;
    private readonly string _app;
    private readonly Guid _instanceGuid;
    private readonly int _instanceOwnerPartyId;

    // Services from DI
    private readonly IDataClient _dataClient;
    private readonly IAppMetadata _appMetadata;
    private readonly ModelSerializationService _modelSerializationService;

    // Caches
    // Cache for the most up to date form data (can be mutated or replaced with SetFormData(dataElementId, data))
    private readonly LazyCache<object> _formDataCache = new();

    // Cache for the binary content of the file as currently in storage (updated on save)
    private readonly LazyCache<ReadOnlyMemory<byte>> _binaryCache = new();

    // Data elements to delete (eg RemoveDataElement(dataElementId)), but not yet deleted from instance or storage
    private readonly ConcurrentBag<DataElementId> _dataElementsToDelete = new();

    // Data elements to add (eg AddFormDataElement(dataTypeString, data)), but not yet added to instance or storage
    private readonly ConcurrentBag<(
        DataType dataType,
        string contentType,
        string? filename,
        object? model,
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

    /// <inheritdoc />
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

    private DataType GetDataType(DataElementId dataElementId)
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
    public void AddFormDataElement(string dataTypeString, object model)
    {
        var dataType = GetDataTypeByString(dataTypeString);
        if (dataType.AppLogic?.ClassRef is not { } classRef)
        {
            throw new InvalidOperationException(
                $"Data type {dataTypeString} does not have a class reference in app metadata"
            );
        }

        var modelType = model.GetType();
        if (modelType.FullName != classRef)
        {
            throw new InvalidOperationException(
                $"Data object registered for {dataTypeString} is not of type {classRef} as specified in application metadata"
            );
        }

        ObjectUtils.InitializeAltinnRowId(model);
        var (bytes, contentType) = _modelSerializationService.SerializeToStorage(model, dataType);

        _dataElementsToAdd.Add((dataType, contentType, null, model, bytes));
    }

    /// <inheritdoc />
    public void AddAttachmentDataElement(
        string dataTypeString,
        string contentType,
        string? filename,
        ReadOnlyMemory<byte> bytes
    )
    {
        var dataType = GetDataTypeByString(dataTypeString);
        if (dataType.AppLogic?.ClassRef is not null)
        {
            throw new InvalidOperationException(
                $"Data type {dataTypeString} has a AppLogic.ClassRef in app metadata, and is not a binary data element"
            );
        }
        _dataElementsToAdd.Add((dataType, contentType, filename, null, bytes));
    }

    /// <inheritdoc />
    public void RemoveDataElement(DataElementId dataElementId)
    {
        var dataElement = Instance.Data.Find(d => d.Id == dataElementId.Id);
        if (dataElement is null)
        {
            throw new InvalidOperationException($"Data element with id {dataElementId.Id} not found in instance");
        }

        _dataElementsToDelete.Add(dataElementId);
    }

    public List<DataElementChange> GetDataElementChanges(bool initializeAltinnRowId)
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
            if (initializeAltinnRowId)
            {
                ObjectUtils.InitializeAltinnRowId(data);
            }
            var (currentBinary, contentType) = _modelSerializationService.SerializeToStorage(data, dataType);
            _binaryCache.Set(dataElementId, currentBinary);

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
                        ),
                        CurrentBinaryData = currentBinary,
                        PreviousBinaryData = previousBinary,
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
        foreach (var (dataType, contentType, filename, data, bytes) in _dataElementsToAdd)
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
                _binaryCache.Set(dataElement, bytes);
                if (data is not null)
                {
                    _formDataCache.Set(dataElement, data);
                }
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

    internal async Task SaveChanges(List<DataElementChange> changes)
    {
        var tasks = new List<Task>();

        foreach (var change in changes)
        {
            if (change.CurrentBinaryData is null)
            {
                throw new InvalidOperationException("Changes sent to SaveChanges must have a CurrentBinaryData value");
            }

            var dataElement = GetDataElement(change.DataElement);

            tasks.Add(
                _dataClient.UpdateBinaryData(
                    new InstanceIdentifier(Instance),
                    dataElement.ContentType,
                    dataElement.Filename,
                    Guid.Parse(change.DataElement.Id),
                    new MemoryAsStream(change.CurrentBinaryData.Value)
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
        var dataType = GetDataType(dataElementId);
        if (dataType.AppLogic?.ClassRef is not { } classRef)
        {
            throw new InvalidOperationException($"Data element {dataElementId.Id} don't have app logic");
        }
        if (data.GetType().FullName != classRef)
        {
            throw new InvalidOperationException(
                $"Data object registered for {dataElementId.Id} is not of type {classRef} as specified in application metadata for data type {dataType.Id}, but {data.GetType().FullName}"
            );
        }
        _formDataCache.Set(dataElementId, data);
    }

    /// <summary>
    /// Compatibility function to update both formDataCache and binaryCache as we assume storage has already been updated.
    /// </summary>
    [Obsolete("Should only be used for actions that set UpdatedDataModels on UserActionResult which is deprecated")]
    internal void ReplaceFormDataAssumeSavedToStorage(DataElementId dataElementId, object newModel)
    {
        SetFormData(dataElementId, newModel);
        var (data, _) = _modelSerializationService.SerializeToStorage(newModel, GetDataType(dataElementId));
        _binaryCache.Set(dataElementId, data);
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

    private DataType GetDataTypeByString(string dataTypeString)
    {
        var appMetadata = _appMetadata.GetApplicationMetadata().Result;
        var dataType = appMetadata.DataTypes.Find(d => d.Id == dataTypeString);
        if (dataType is null)
        {
            throw new InvalidOperationException($"Data type {dataTypeString} not found in app metadata");
        }

        return dataType;
    }

    internal void VerifyDataElementsUnchanged()
    {
        var changes = GetDataElementChanges(initializeAltinnRowId: false);
        if (changes.Count > 0)
        {
            throw new InvalidOperationException(
                $"Data elements of type {string.Join(", ", changes.Select(c => c.DataElement.DataType).Distinct())} have been changed by validators"
            );
        }
    }
}
