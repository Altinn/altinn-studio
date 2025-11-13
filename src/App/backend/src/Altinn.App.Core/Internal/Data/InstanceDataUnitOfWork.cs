using System.Collections.Concurrent;
using System.Collections.Immutable;
using System.Diagnostics;
using System.Globalization;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Texts;
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
    /// <inheritdoc />
    public IReadOnlyDictionary<DataType, StorageAuthenticationMethod> AuthenticationMethodOverrides =>
        _authenticationMethodOverrides.ToImmutableDictionary(DataTypeComparer.Instance);

    // DataClient needs a few arguments to fetch data
    private readonly Guid _instanceGuid;
    private readonly int _instanceOwnerPartyId;

    // Services from DI
    private readonly IDataClient _dataClient;
    private readonly IInstanceClient _instanceClient;
    private readonly ApplicationMetadata _appMetadata;
    private readonly ModelSerializationService _modelSerializationService;

    private readonly IAppResources _appResources;
    private readonly IOptions<FrontEndSettings> _frontEndSettings;
    private readonly ITranslationService _translationService;
    private readonly Telemetry? _telemetry;

    // Cache for the most up-to-date form data (can be mutated or replaced with SetFormData(dataElementId, data))
    private readonly DataElementCache<IFormDataWrapper> _formDataCache = new();

    // Cache for the binary content of the file as currently in storage (updated on save)
    private readonly DataElementCache<ReadOnlyMemory<byte>> _binaryCache = new();

    // Data elements to delete (eg RemoveDataElement(dataElementId)), but not yet deleted from instance or storage
    private readonly ConcurrentBag<DataElementChange> _changesForDeletion = [];

    // Form data not yet saved to storage (thus no dataElementId)
    private readonly ConcurrentBag<DataElementChange> _changesForCreation = [];

    private readonly ConcurrentDictionary<DataType, StorageAuthenticationMethod> _authenticationMethodOverrides = new(
        DataTypeComparer.Instance
    );
    private static readonly StorageAuthenticationMethod _defaultAuthenticationMethod =
        StorageAuthenticationMethod.CurrentUser();

    public InstanceDataUnitOfWork(
        Instance instance,
        IDataClient dataClient,
        IInstanceClient instanceClient,
        ApplicationMetadata appMetadata,
        ITranslationService translationService,
        ModelSerializationService modelSerializationService,
        IAppResources appResources,
        IOptions<FrontEndSettings> frontEndSettings,
        string? taskId,
        string? language,
        Telemetry? telemetry = null
    )
    {
        if (instance.Id is not null)
        {
            var splitId = instance.Id.Split("/");
            _instanceOwnerPartyId = int.Parse(splitId[0], CultureInfo.InvariantCulture);
            _instanceGuid = Guid.Parse(splitId[1]);
        }

        Instance = instance;
        DataTypes = appMetadata.DataTypes;
        _dataClient = dataClient;
        _appMetadata = appMetadata;
        _translationService = translationService;
        _modelSerializationService = modelSerializationService;
        TaskId = taskId;
        Language = language;
        _frontEndSettings = frontEndSettings;
        _appResources = appResources;
        _instanceClient = instanceClient;
        _telemetry = telemetry;
    }

    public Instance Instance { get; }

    public IReadOnlyCollection<DataType> DataTypes { get; }

    public string? TaskId { get; }

    public string? Language { get; }

    /// <inheritdoc />
    public void OverrideAuthenticationMethod(DataType dataType, StorageAuthenticationMethod method)
    {
        _authenticationMethodOverrides[dataType] = method;
    }

    /// <inheritdoc />
    public async Task<object> GetFormData(DataElementIdentifier dataElementIdentifier)
    {
        return (await GetFormDataWrapper(dataElementIdentifier)).BackingData<object>();
    }

    /// <inheritdoc />
    public async Task<IFormDataWrapper> GetFormDataWrapper(DataElementIdentifier dataElementIdentifier)
    {
        return await _formDataCache.GetOrCreate(
            dataElementIdentifier,
            async () =>
            {
                var dataType = this.GetDataType(dataElementIdentifier);
                if (dataType.AppLogic?.ClassRef is null)
                {
                    throw new InvalidOperationException(
                        $"Data element {dataElementIdentifier.Id} is of data type {dataType.Id} which doesn't have app logic in application metadata and cant be used as form data"
                    );
                }
                var binaryData = await GetBinaryData(dataElementIdentifier);
                var dataElement = GetDataElement(dataElementIdentifier);

                return FormDataWrapperFactory.Create(
                    _modelSerializationService.DeserializeFromStorage(binaryData.Span, dataType, dataElement)
                );
            }
        );
    }

    /// <inheritdoc />
    public IInstanceDataAccessor GetCleanAccessor(RowRemovalOption rowRemovalOption = RowRemovalOption.SetToNull)
    {
        return new CleanInstanceDataAccessor(
            this,
            _appResources,
            _translationService,
            _frontEndSettings.Value,
            rowRemovalOption,
            _telemetry
        );
    }

    // Non thread safe cache, because the previous data is always the same.
    private PreviousDataAccessor? _previousDataAccessorCache;

    public IInstanceDataAccessor GetPreviousDataAccessor()
    {
        if (_previousDataAccessorCache is not null)
        {
            return _previousDataAccessorCache;
        }

        _previousDataAccessorCache = new PreviousDataAccessor(
            this,
            _appResources,
            _translationService,
            _modelSerializationService,
            _frontEndSettings.Value,
            _telemetry
        );
        return _previousDataAccessorCache;
    }

    private LayoutEvaluatorState? _layoutEvaluatorStateCache;

    public LayoutEvaluatorState? GetLayoutEvaluatorState()
    {
        if (TaskId is null)
        {
            return null;
        }
        if (_layoutEvaluatorStateCache is not null)
        {
            return _layoutEvaluatorStateCache;
        }

        // Could use a double lock here, but a deadlock is more problematic than creating the state twice
        var layouts = _appResources.GetLayoutModelForTask(TaskId);
        if (layouts is null)
        {
            return null;
        }

        _layoutEvaluatorStateCache = new LayoutEvaluatorState(
            this,
            layouts,
            _translationService,
            _frontEndSettings.Value,
            gatewayAction: null,
            Language
        );
        return _layoutEvaluatorStateCache;
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
                    _instanceOwnerPartyId,
                    _instanceGuid,
                    dataElementIdentifier.Guid,
                    authenticationMethod: GetAuthenticationMethod(dataElementIdentifier)
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
        var (bytes, contentType) = _modelSerializationService.SerializeToStorage(model, dataType, null);

        FormDataChange change = new FormDataChange(
            type: ChangeType.Created,
            dataElement: null,
            dataType: dataType,
            contentType: contentType,
            currentFormDataWrapper: FormDataWrapperFactory.Create(model),
            previousFormDataWrapper: FormDataWrapperFactory.Create(_modelSerializationService.GetEmpty(dataType)),
            currentBinaryData: bytes,
            previousBinaryData: default // empty memory reference
        );
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

        BinaryDataChange change = new BinaryDataChange(
            type: ChangeType.Created,
            dataElement: null, // Not yet saved to storage
            dataType: dataType,
            fileName: filename,
            contentType: contentType,
            currentBinaryData: bytes
        );
        _changesForCreation.Add(change);
        return change;
    }

    /// <inheritdoc />
    public void RemoveDataElement(DataElementIdentifier dataElementIdentifier)
    {
        var dataElement = GetDataElement(dataElementIdentifier);
        var dataType = this.GetDataType(dataElement.DataType);

        if (_changesForDeletion.Any(c => c.DataElementIdentifier == dataElementIdentifier))
        {
            throw new InvalidOperationException(
                $"Data element with id {dataElementIdentifier.Id} is already marked for deletion"
            );
        }
        if (dataType.AppLogic?.ClassRef is null)
        {
            _changesForDeletion.Add(
                new BinaryDataChange(
                    type: ChangeType.Deleted,
                    dataElement: dataElement,
                    dataType: dataType,
                    fileName: dataElement.Filename,
                    contentType: dataElement.ContentType,
                    currentBinaryData: ReadOnlyMemory<byte>.Empty
                )
            );
        }
        else
        {
            _changesForDeletion.Add(
                new FormDataChange(
                    type: ChangeType.Deleted,
                    dataElement: dataElement,
                    dataType: dataType,
                    contentType: dataElement.ContentType,
                    currentFormDataWrapper: _formDataCache.TryGetCachedValue(dataElementIdentifier, out var cfd)
                        ? cfd
                        : FormDataWrapperFactory.Create(_modelSerializationService.GetEmpty(dataType)),
                    previousFormDataWrapper: FormDataWrapperFactory.Create(
                        _modelSerializationService.GetEmpty(dataType)
                    ),
                    currentBinaryData: ReadOnlyMemory<byte>.Empty,
                    previousBinaryData: _binaryCache.TryGetCachedValue(dataElementIdentifier, out var value)
                        ? value
                        : null
                )
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

            if (!_formDataCache.TryGetCachedValue(dataElementIdentifier, out IFormDataWrapper? dataWrapper))
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
                dataWrapper.InitializeAltinnRowIds();
            }

            var (currentBinary, _) = _modelSerializationService.SerializeToStorage(
                dataWrapper.BackingData<object>(),
                dataType,
                dataElement
            );

            if (!currentBinary.Span.SequenceEqual(cachedBinary.Span))
            {
                changes.Add(
                    new FormDataChange(
                        type: ChangeType.Updated,
                        dataElement: dataElement,
                        contentType: dataElement.ContentType,
                        dataType: dataType,
                        currentFormDataWrapper: dataWrapper,
                        // For patch requests we could get the previous data from the patch, but it's not available here
                        // and deserializing twice is not a big deal
                        previousFormDataWrapper: FormDataWrapperFactory.Create(
                            _modelSerializationService.DeserializeFromStorage(cachedBinary.Span, dataType, dataElement)
                        ),
                        currentBinaryData: currentBinary,
                        previousBinaryData: cachedBinary
                    )
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
            new MemoryAsStream(bytes),
            authenticationMethod: GetAuthenticationMethod(change.DataType)
        );
        // Update caches
        _binaryCache.Set(dataElement, bytes);
        change.DataElement = dataElement; // Set the data element so that it can be referenced later in the save process
        if (change is FormDataChange formDataChange)
        {
            _formDataCache.Set(dataElement, formDataChange.CurrentFormDataWrapper);
        }
        createdDataElements.TryAdd(change, dataElement);
    }

    private async Task UpdateDataElement(FormDataChange change)
    {
        if (change.CurrentBinaryData is null)
        {
            throw new InvalidOperationException(
                "ChangeType.Updated sent to SaveChanges must have a CurrentBinaryData value"
            );
        }
        if (change.DataElement is null)
            throw new InvalidOperationException("ChangeType.Updated sent to SaveChanges must have a DataElement value");
        ReadOnlyMemory<byte> bytes = change.CurrentBinaryData.Value;
        await _dataClient.UpdateBinaryData(
            new InstanceIdentifier(Instance),
            change.DataElement.ContentType,
            change.DataElement.Filename,
            Guid.Parse(change.DataElement.Id),
            new MemoryAsStream(bytes),
            authenticationMethod: GetAuthenticationMethod(change.DataElementIdentifier)
        );
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
                    _instanceOwnerPartyId,
                    _instanceGuid,
                    change.DataElementIdentifier.Guid,
                    false,
                    authenticationMethod: GetAuthenticationMethod(change.DataElementIdentifier)
                );
            }

            tasks.Add(DeleteData());
        }

        await Task.WhenAll(tasks);

        // Remove deleted data elements from instance.Data
        Instance.Data.RemoveAll(dataElement => _changesForDeletion.Any(d => d.DataElement?.Id == dataElement.Id));

        // Add Created data elements to instance
        Instance.Data.AddRange(createdDataElements.Values);

        // Update DataValues and presentation texts
        // These cannot run in parallel with creating the data elements, because they need the data element id

        foreach (var (dataElementIdentifier, formData) in _formDataCache.GetCachedEntries())
        {
            if (dataElementIdentifier.DataTypeId is not null)
            {
                var dataType = GetDataTypeByString(dataElementIdentifier.DataTypeId);
                await UpdatePresentationTextsAndDataValues(dataType, formData);
            }
        }
    }

    internal async Task SaveChanges(DataElementChanges changes)
    {
        using var activity = _telemetry?.StartSaveChanges(changes);
        if (HasAbandonIssues)
        {
            throw new InvalidOperationException("AbandonAllChanges has been called, and no changes should be saved");
        }
        var tasks = new List<Task>();

        foreach (var change in changes.FormDataChanges)
        {
            if (change.Type != ChangeType.Updated)
                continue; // New and deleted form data is handled separately

            tasks.Add(UpdateDataElement(change));
        }

        await Task.WhenAll(tasks);
    }

    /// <summary>
    /// Add or replace existing data element data in the cache
    /// </summary>
    internal void SetFormData(DataElementIdentifier dataElementIdentifier, IFormDataWrapper formDataWrapper)
    {
        ArgumentNullException.ThrowIfNull(formDataWrapper);
        var dataType = this.GetDataType(dataElementIdentifier);
        if (dataType.AppLogic?.ClassRef is not { } classRef)
        {
            throw new InvalidOperationException($"Data element {dataElementIdentifier.Id} don't have app logic");
        }
        if (formDataWrapper.BackingDataType.FullName != classRef)
        {
            throw new InvalidOperationException(
                $"Data object registered for {dataElementIdentifier.Id} is not of type {classRef} as specified in application metadata for data type {dataType.Id}, but {formDataWrapper.BackingDataType.FullName}"
            );
        }
        _formDataCache.Set(dataElementIdentifier, formDataWrapper);
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

    private StorageAuthenticationMethod GetAuthenticationMethod(DataElementIdentifier dataElementIdentifier)
    {
        DataType dataType = this.GetDataType(dataElementIdentifier);

        return GetAuthenticationMethod(dataType);
    }

    private StorageAuthenticationMethod GetAuthenticationMethod(DataType dataType) =>
        _authenticationMethodOverrides.GetValueOrDefault(dataType, _defaultAuthenticationMethod);

    internal void VerifyDataElementsUnchangedSincePreviousChanges(DataElementChanges previousChanges)
    {
        using var activity = _telemetry?.StartVerifyDataElementsUnchangedSincePreviousChanges();
        var changes = GetDataElementChanges(initializeAltinnRowId: false);
        if (changes.AllChanges.Count != previousChanges.AllChanges.Count)
        {
            throw new InvalidOperationException("Number of data elements have changed by validators");
        }

        foreach (var previousChange in previousChanges.AllChanges)
        {
            var currentChange =
                changes.AllChanges.FirstOrDefault(c => c.DataElement?.Id == previousChange.DataElement?.Id)
                ?? throw new InvalidOperationException("Number of data elements have changed by validators");

            var equal = (currentChange, previousChange) switch
            {
                (
                    FormDataChange { CurrentBinaryData.Span: var currentSpan },
                    FormDataChange { CurrentBinaryData.Span: var previousSpan }
                ) => currentSpan.SequenceEqual(previousSpan),
                (BinaryDataChange current, BinaryDataChange previous) => current.CurrentBinaryData.Span.SequenceEqual(
                    previous.CurrentBinaryData.Span
                ),
                _ => throw new InvalidOperationException("Data element type has changed by validators"),
            };
            if (!equal)
            {
                throw new InvalidOperationException(
                    $"Data element {previousChange.DataType.Id} with id {previousChange.DataElement?.Id} has been changed by validators"
                );
            }
        }
    }

    private async Task UpdatePresentationTextsAndDataValues(DataType dataType, IFormDataWrapper dataWrapper)
    {
        var updatedTexts = DataHelper.GetUpdatedDataValues(
            _appMetadata.PresentationFields,
            Instance.PresentationTexts,
            dataType.Id,
            dataWrapper.BackingData<object>()
        );

        if (updatedTexts.Count > 0)
        {
            await _instanceClient.UpdatePresentationTexts(
                int.Parse(Instance.Id.Split("/")[0], CultureInfo.InvariantCulture),
                Guid.Parse(Instance.Id.Split("/")[1]),
                new PresentationTexts { Texts = updatedTexts }
            );

            // Maintain local copy of presentation texts
            Instance.PresentationTexts ??= [];
            foreach (var (key, value) in updatedTexts)
            {
                if (value is null)
                {
                    Instance.PresentationTexts.Remove(key); // Remove key if value is null
                }
                else
                {
                    Instance.PresentationTexts[key] = value; // Update local copy of presentation texts
                }
            }
        }
        var updatedValues = DataHelper.GetUpdatedDataValues(
            _appMetadata.DataFields,
            Instance.DataValues,
            dataType.Id,
            dataWrapper.BackingData<object>()
        );

        if (updatedValues.Count > 0)
        {
            await _instanceClient.UpdateDataValues(
                int.Parse(Instance.Id.Split("/")[0], CultureInfo.InvariantCulture),
                Guid.Parse(Instance.Id.Split("/")[1]),
                new DataValues { Values = updatedValues }
            );

            // Maintain local copy of data values
            Instance.DataValues ??= [];
            foreach (var (key, value) in updatedValues)
            {
                if (value is null)
                {
                    Instance.DataValues.Remove(key); // Remove key if value is null
                }
                else
                {
                    Instance.DataValues[key] = value; // Update local copy of data values
                }
            }
        }
    }
}

/// <summary>
/// Equality comparer for DataType that compares by <c>Id</c>.
/// </summary>
internal class DataTypeComparer : IEqualityComparer<DataType>
{
    public static DataTypeComparer Instance { get; } = new();

    public bool Equals(DataType? x, DataType? y)
    {
        if (ReferenceEquals(x, y))
            return true;

        if (x is null || y is null)
            return false;

        if (x.GetType() != y.GetType())
            return false;

        return x.Id == y.Id;
    }

    public int GetHashCode(DataType obj) => obj.Id != null ? obj.Id.GetHashCode() : 0;
}
