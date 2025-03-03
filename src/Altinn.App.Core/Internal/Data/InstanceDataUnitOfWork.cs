using System.Collections.Concurrent;
using System.Diagnostics;
using System.Globalization;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Internal.Data;

/// <summary>
/// Class that caches form data to avoid multiple calls to the data service for a single validation
///
/// Do not add this to the DI container, as it should only be created explicitly because of data leak potential.
/// </summary>
internal sealed class InstanceDataUnitOfWork : IInstanceDataMutator
{
    // DataClient needs a few arguments to fetch data
    private readonly Guid _instanceGuid;
    private readonly int _instanceOwnerPartyId;

    // Services from DI
    private readonly IDataClient _dataClient;
    private readonly IInstanceClient _instanceClient;
    private readonly ApplicationMetadata _appMetadata;
    private readonly ModelSerializationService _modelSerializationService;

    // Cache for the most up to date form data (can be mutated or replaced with SetFormData(dataElementId, data))
    private readonly DataElementCache<object> _formDataCache = new();

    // Cache for the binary content of the file as currently in storage (updated on save)
    private readonly DataElementCache<ReadOnlyMemory<byte>> _binaryCache = new();

    // Data elements to delete (eg RemoveDataElement(dataElementId)), but not yet deleted from instance or storage
    private readonly ConcurrentBag<DataElementChange> _changesForDeletion = [];

    // Form data not yet saved to storage (thus no dataElementId)
    private readonly ConcurrentBag<DataElementChange> _changesForCreation = [];

    // The update functions returns updated data elements.
    // We want to make sure that the data elements are updated in the instance object
    private readonly ConcurrentBag<DataElement> _savedDataElements = [];

    public InstanceDataUnitOfWork(
        Instance instance,
        IDataClient dataClient,
        IInstanceClient instanceClient,
        ApplicationMetadata appMetadata,
        ModelSerializationService modelSerializationService,
        IAppResources appResources,
        IOptions<FrontEndSettings> frontEndSettings,
        string? taskId,
        string? language
    )
    {
        if (instance.Id is not null)
        {
            var splitId = instance.Id.Split("/");
            _instanceOwnerPartyId = int.Parse(splitId[0], CultureInfo.InvariantCulture);
            _instanceGuid = Guid.Parse(splitId[1]);
        }

        Instance = instance;
        _dataClient = dataClient;
        _appMetadata = appMetadata;
        _modelSerializationService = modelSerializationService;
        _instanceClient = instanceClient;
    }

    public Instance Instance { get; }

    /// <inheritdoc />
    public async Task<object> GetFormData(DataElementIdentifier dataElementIdentifier)
    {
        return await _formDataCache.GetOrCreate(
            dataElementIdentifier,
            async () =>
            {
                var binaryData = await GetBinaryData(dataElementIdentifier);

                return _modelSerializationService.DeserializeFromStorage(
                    binaryData.Span,
                    this.GetDataType(dataElementIdentifier)
                );
            }
        );
    }

    /// <inheritdoc />
    public async Task<ReadOnlyMemory<byte>> GetBinaryData(DataElementIdentifier dataElementIdentifier)
    {
        // Verify that the data element exists on the instance
        GetDataElement(dataElementIdentifier);

        return await _binaryCache.GetOrCreate(
            dataElementIdentifier,
            async () =>
                await _dataClient.GetDataBytes(
                    _appMetadata.AppIdentifier.Org,
                    _appMetadata.AppIdentifier.App,
                    _instanceOwnerPartyId,
                    _instanceGuid,
                    dataElementIdentifier.Guid
                )
        );
    }

    /// <inheritdoc />
    public DataElement GetDataElement(DataElementIdentifier dataElementIdentifier)
    {
        if (_instanceOwnerPartyId == 0 || _instanceGuid == Guid.Empty)
        {
            throw new InvalidOperationException("Cannot access instance data before it has been created");
        }

        return Instance.Data.Find(d => d.Id == dataElementIdentifier.Id)
            ?? throw new InvalidOperationException(
                $"Data element of id {dataElementIdentifier.Id} not found on instance with id {Instance.Id}"
            );
    }

    /// <inheritdoc />
    public DataType? GetDataType(string dataTypeId) => _appMetadata.DataTypes.Find(d => d.Id == dataTypeId);

    /// <inheritdoc />
    public FormDataChange AddFormDataElement(string dataTypeId, object model)
    {
        ArgumentNullException.ThrowIfNull(model);
        var dataType = GetDataTypeByString(dataTypeId);
        if (dataType.AppLogic?.ClassRef is not { } classRef)
        {
            throw new InvalidOperationException(
                $"Data type {dataTypeId} does not have a class reference in app metadata"
            );
        }

        var modelType = model.GetType();
        if (modelType.FullName != classRef)
        {
            throw new InvalidOperationException(
                $"Tried to save {modelType.FullName} as {dataTypeId}, but applicationmetadata.json specifies {classRef}"
            );
        }

        ObjectUtils.InitializeAltinnRowId(model);
        var (bytes, contentType) = _modelSerializationService.SerializeToStorage(model, dataType);

        FormDataChange change = new FormDataChange
        {
            Type = ChangeType.Created,
            DataElement = null,
            DataType = dataType,
            ContentType = contentType,
            CurrentFormData = model,
            PreviousFormData = _modelSerializationService.GetEmpty(dataType),
            CurrentBinaryData = bytes,
            PreviousBinaryData = default, // empty memory reference
        };
        _changesForCreation.Add(change);
        return change;
    }

    /// <inheritdoc />
    public BinaryDataChange AddBinaryDataElement(
        string dataTypeId,
        string contentType,
        string? filename,
        ReadOnlyMemory<byte> bytes
    )
    {
        var dataType = GetDataTypeByString(dataTypeId);
        if (dataType.AppLogic?.ClassRef is not null)
        {
            throw new InvalidOperationException(
                $"Data type {dataTypeId} has a AppLogic.ClassRef in app metadata, and is not a binary data element"
            );
        }

        if (dataType.MaxSize.HasValue && bytes.Length > dataType.MaxSize.Value * 1024 * 1024)
        {
            throw new InvalidOperationException(
                $"Data element of type {dataTypeId} exceeds the size limit of {dataType.MaxSize} MB"
            );
        }

        if (dataType.AllowedContentTypes is { Count: > 0 } && !dataType.AllowedContentTypes.Contains(contentType))
        {
            throw new InvalidOperationException(
                $"Data element of type {dataTypeId} has a Content-Type '{contentType}' which is invalid for element type '{dataTypeId}'"
            );
        }

        BinaryDataChange change = new BinaryDataChange
        {
            Type = ChangeType.Created,
            DataElement = null, // Not yet saved to storage
            DataType = dataType,
            FileName = filename,
            ContentType = contentType,
            CurrentBinaryData = bytes,
        };
        _changesForCreation.Add(change);
        return change;
    }

    /// <inheritdoc />
    public void RemoveDataElement(DataElementIdentifier dataElementIdentifier)
    {
        var dataElement = Instance.Data.Find(d => d.Id == dataElementIdentifier.Id);
        if (dataElement is null)
        {
            throw new InvalidOperationException(
                $"Data element with id {dataElementIdentifier.Id} not found in instance"
            );
        }
        var dataType =
            GetDataType(dataElement.DataType)
            ?? throw new InvalidOperationException(
                $"Data element {dataElement.Id} has data type {dataElement.DataType}, but the data type is not found in app metadata"
            );
        if (_changesForDeletion.Any(c => c.DataElementIdentifier == dataElementIdentifier))
        {
            throw new InvalidOperationException(
                $"Data element with id {dataElementIdentifier.Id} is already marked for deletion"
            );
        }
        if (dataType.AppLogic?.ClassRef is null)
        {
            _changesForDeletion.Add(
                new BinaryDataChange()
                {
                    Type = ChangeType.Deleted,
                    DataElement = dataElement,
                    DataType = dataType,
                    FileName = dataElement.Filename,
                    ContentType = dataElement.ContentType,
                    CurrentBinaryData = ReadOnlyMemory<byte>.Empty,
                }
            );
        }
        else
        {
            _changesForDeletion.Add(
                new FormDataChange()
                {
                    Type = ChangeType.Deleted,
                    DataElement = dataElement,
                    DataType = dataType,
                    ContentType = dataElement.ContentType,
                    CurrentFormData = _formDataCache.TryGetCachedValue(dataElementIdentifier, out var cfd)
                        ? cfd
                        : _modelSerializationService.GetEmpty(dataType),
                    PreviousFormData = _modelSerializationService.GetEmpty(dataType),
                    CurrentBinaryData = ReadOnlyMemory<byte>.Empty,
                    PreviousBinaryData = _binaryCache.TryGetCachedValue(dataElementIdentifier, out var value)
                        ? value
                        : null,
                }
            );
        }
    }

    internal List<ValidationIssue> AbandonIssues { get; } = [];

    public bool HasAbandonIssues => AbandonIssues.Count > 0;

    public void AbandonAllChanges(IEnumerable<ValidationIssue> validationIssues)
    {
        AbandonIssues.AddRange(validationIssues);
        if (AbandonIssues.Count == 0)
        {
            throw new InvalidOperationException("AbandonAllChanges called without any validation issues");
        }
    }

    public DataElementChanges GetDataElementChanges(bool initializeAltinnRowId)
    {
        if (HasAbandonIssues)
        {
            throw new InvalidOperationException("AbandonAllChanges has been called, and no changes should be saved");
        }
        var changes = new List<DataElementChange>();

        // Add form data where the CurrentFormData serializes to a different binary than the PreviousBinaryData
        foreach (var dataElement in Instance.Data)
        {
            DataElementIdentifier dataElementIdentifier = dataElement;
            if (_changesForDeletion.Any(change => change.DataElementIdentifier == dataElementIdentifier))
            {
                // Deleted (and created) changes gets added bellow
                continue;
            }
            var dataType = this.GetDataType(dataElementIdentifier);

            if (!_formDataCache.TryGetCachedValue(dataElementIdentifier, out object? data))
            {
                // We don't support making updates to binary data elements (attachments) in IInstanceDataMutator
                continue;
            }

            // The object has form data
            if (dataType.AppLogic?.ClassRef is null)
                throw new InvalidOperationException(
                    $"Data element {dataElementIdentifier.Id} of type {dataType.Id} has cached form data, but no app logic"
                );
            var hasCachedBinary = _binaryCache.TryGetCachedValue(
                dataElementIdentifier,
                out ReadOnlyMemory<byte> cachedBinary
            );
            if (!hasCachedBinary)
            {
                throw new InvalidOperationException(
                    $"Data element {dataElementIdentifier.Id} of type {dataType.Id} has app logic and must be fetched before it is edited"
                );
            }

            if (initializeAltinnRowId)
            {
                ObjectUtils.InitializeAltinnRowId(data);
            }

            var (currentBinary, _) = _modelSerializationService.SerializeToStorage(data, dataType);

            if (!currentBinary.Span.SequenceEqual(cachedBinary.Span))
            {
                changes.Add(
                    new FormDataChange()
                    {
                        Type = ChangeType.Updated,
                        DataElement = dataElement,
                        ContentType = dataElement.ContentType,
                        DataType = dataType,
                        CurrentFormData = data,
                        // For patch requests we could get the previous data from the patch, but it's not available here
                        // and deserializing twice is not a big deal
                        PreviousFormData = _modelSerializationService.DeserializeFromStorage(
                            cachedBinary.Span,
                            dataType
                        ),
                        CurrentBinaryData = currentBinary,
                        PreviousBinaryData = cachedBinary,
                    }
                );
            }
        }

        // Include the change for data elements that have been added
        changes.AddRange(_changesForCreation);
        changes.AddRange(_changesForDeletion);

        return new DataElementChanges(changes);
    }

    private async Task CreateDataElement(
        ConcurrentDictionary<DataElementChange, DataElement> createdDataElements,
        DataElementChange change
    )
    {
        var bytes = change switch
        {
            BinaryDataChange bc => bc.CurrentBinaryData,
            FormDataChange fdc => fdc.CurrentBinaryData
                ?? throw new UnreachableException("FormDataChange must set CurrentBinaryData before saving"),
            _ => throw new UnreachableException("Change must be of type BinaryChange or FormDataChange"),
        };
        // Use the BinaryData because we serialize before saving.
        var dataElement = await _dataClient.InsertBinaryData(
            Instance.Id,
            change.DataType.Id,
            change.ContentType,
            (change as BinaryDataChange)?.FileName,
            new MemoryAsStream(bytes)
        );
        _binaryCache.Set(dataElement, bytes);
        if (change is FormDataChange formDataChange)
        {
            _formDataCache.Set(dataElement, formDataChange.CurrentFormData);
        }
        createdDataElements.TryAdd(change, dataElement);
    }

    private async Task UpdateDataElement(
        DataElementIdentifier dataElementIdentifier,
        string contentType,
        string? filename,
        ReadOnlyMemory<byte> bytes
    )
    {
        var newDataElement = await _dataClient.UpdateBinaryData(
            new InstanceIdentifier(Instance),
            contentType,
            filename,
            dataElementIdentifier.Guid,
            new MemoryAsStream(bytes)
        );
        _savedDataElements.Add(newDataElement);
    }

    internal async Task UpdateInstanceData(DataElementChanges changes)
    {
        if (HasAbandonIssues)
        {
            throw new InvalidOperationException("AbandonAllChanges has been called, and no changes should be saved");
        }
        if (_instanceOwnerPartyId == 0 || _instanceGuid == Guid.Empty)
        {
            throw new InvalidOperationException("Cannot access instance data before it has been created");
        }

        var tasks = new List<Task>();
        ConcurrentDictionary<DataElementChange, DataElement> createdDataElements = [];
        // We need to create data elements here, so that we can set them correctly on the instance
        // Updating is done in SaveChanges and happen in parallel with validation.

        // Upload added data elements
        foreach (var change in _changesForCreation)
        {
            tasks.Add(CreateDataElement(createdDataElements, change));
        }

        // Delete data elements
        foreach (var change in _changesForDeletion)
        {
            async Task DeleteData()
            {
                await _dataClient.DeleteData(
                    _appMetadata.AppIdentifier.Org,
                    _appMetadata.AppIdentifier.App,
                    _instanceOwnerPartyId,
                    _instanceGuid,
                    change.DataElementIdentifier.Guid,
                    false
                );
            }

            tasks.Add(DeleteData());
        }

        await Task.WhenAll(tasks);

        // Remove deleted data elements from instance.Data
        Instance.Data.RemoveAll(dataElement => _changesForDeletion.Any(d => d.DataElement?.Id == dataElement.Id));

        // Add Created data elements to instance
        Instance.Data.AddRange(createdDataElements.Values);

        // update data elements on new elements
        foreach (var change in changes.AllChanges)
        {
            if (change.DataElement is null)
            {
                change.DataElement = createdDataElements.TryGetValue(change, out var value)
                    ? value
                    : throw new InvalidOperationException(
                        "DataElementChange without DataElement must be a new data element"
                    );
            }
            if (change is FormDataChange formDataChange)
            {
                //Update DataValues and presentation texts
                // These can not run in parallel with creating the data elements, because they need the data element id
                await UpdateDataValuesOnInstance(Instance, formDataChange.DataType.Id, formDataChange.CurrentFormData);
                await UpdatePresentationTextsOnInstance(
                    Instance,
                    formDataChange.DataType.Id,
                    formDataChange.CurrentFormData
                );
            }
        }
    }

    internal async Task SaveChanges(DataElementChanges changes)
    {
        if (HasAbandonIssues)
        {
            throw new InvalidOperationException("AbandonAllChanges has been called, and no changes should be saved");
        }
        var tasks = new List<Task>();

        foreach (var change in changes.FormDataChanges)
        {
            if (change.Type != ChangeType.Updated)
                continue;
            if (change.CurrentBinaryData is null)
            {
                throw new InvalidOperationException(
                    "ChangeType.Updated sent to SaveChanges must have a CurrentBinaryData value"
                );
            }
            if (change.DataElement is null)
                throw new InvalidOperationException(
                    "ChangeType.Updated sent to SaveChanges must have a DataElement value"
                );

            tasks.Add(
                UpdateDataElement(
                    change.DataElement,
                    change.DataElement.ContentType,
                    change.DataElement.Filename,
                    change.CurrentBinaryData.Value
                )
            );
        }

        await Task.WhenAll(tasks);
    }

    /// <summary>
    /// Add or replace existing data element data in the cache
    /// </summary>
    internal void SetFormData(DataElementIdentifier dataElementIdentifier, object data)
    {
        var dataType = this.GetDataType(dataElementIdentifier);
        if (dataType.AppLogic?.ClassRef is not { } classRef)
        {
            throw new InvalidOperationException($"Data element {dataElementIdentifier.Id} don't have app logic");
        }
        if (data.GetType().FullName != classRef)
        {
            throw new InvalidOperationException(
                $"Data object registered for {dataElementIdentifier.Id} is not of type {classRef} as specified in application metadata for data type {dataType.Id}, but {data.GetType().FullName}"
            );
        }
        _formDataCache.Set(dataElementIdentifier, data);
    }

    private DataType GetDataTypeByString(string dataTypeString)
    {
        var dataType = _appMetadata.DataTypes.Find(d => d.Id == dataTypeString);
        if (dataType is null)
        {
            throw new InvalidOperationException($"Data type {dataTypeString} not found in app metadata");
        }

        return dataType;
    }

    internal void VerifyDataElementsUnchangedSincePreviousChanges(DataElementChanges previousChanges)
    {
        var changes = GetDataElementChanges(initializeAltinnRowId: false);
        if (changes.AllChanges.Count != previousChanges.AllChanges.Count)
        {
            throw new Exception("Number of data elements have changed by validators");
        }

        foreach (var previousChange in previousChanges.AllChanges)
        {
            var currentChange =
                changes.AllChanges.FirstOrDefault(c => c.DataElement?.Id == previousChange.DataElement?.Id)
                ?? throw new Exception("Number of data elements have changed by validators");

            var equal = (currentChange, previousChange) switch
            {
                (
                    FormDataChange { CurrentBinaryData.Span: var currentSpan },
                    FormDataChange { CurrentBinaryData.Span: var previousSpan }
                ) => currentSpan.SequenceEqual(previousSpan),
                (BinaryDataChange current, BinaryDataChange previous) => current.CurrentBinaryData.Span.SequenceEqual(
                    previous.CurrentBinaryData.Span
                ),
                _ => throw new Exception("Data element type has changed by validators"),
            };
            if (!equal)
            {
                throw new Exception(
                    $"Data element {previousChange.DataType.Id} with id {previousChange.DataElement?.Id} has been changed by validators"
                );
            }
        }
    }

    private async Task UpdatePresentationTextsOnInstance(Instance instance, string dataType, object serviceModel)
    {
        var updatedValues = DataHelper.GetUpdatedDataValues(
            _appMetadata.PresentationFields,
            instance.PresentationTexts,
            dataType,
            serviceModel
        );

        if (updatedValues.Count > 0)
        {
            await _instanceClient.UpdatePresentationTexts(
                int.Parse(instance.Id.Split("/")[0], CultureInfo.InvariantCulture),
                Guid.Parse(instance.Id.Split("/")[1]),
                new PresentationTexts { Texts = updatedValues }
            );
        }
    }

    private async Task UpdateDataValuesOnInstance(Instance instance, string dataType, object serviceModel)
    {
        var updatedValues = DataHelper.GetUpdatedDataValues(
            _appMetadata.DataFields,
            instance.DataValues,
            dataType,
            serviceModel
        );

        if (updatedValues.Count > 0)
        {
            await _instanceClient.UpdateDataValues(
                int.Parse(instance.Id.Split("/")[0], CultureInfo.InvariantCulture),
                Guid.Parse(instance.Id.Split("/")[1]),
                new DataValues { Values = updatedValues }
            );
        }
    }
}
