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
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Options;
using KeyValueEntry = Altinn.Platform.Storage.Interface.Models.KeyValueEntry;

namespace Altinn.App.Core.Internal.Data;

internal enum WorkflowAggregateSaveOutcome
{
    Saved,
    NothingToSave,
}

/// <summary>
/// Class that caches form data to avoid multiple calls to the data service for a single validation
///
/// Do not add this to the DI container, as it should only be created explicitly because of data leak potential.
/// </summary>
internal sealed class InstanceDataUnitOfWork : IInstanceDataMutator, IDisposable
{
    /// <inheritdoc />
    public IReadOnlyDictionary<DataType, StorageAuthenticationMethod> AuthenticationMethodOverrides
    {
        get
        {
            ThrowIfDisposed();
            return _authenticationMethodOverrides.ToImmutableDictionary(DataTypeComparer.Instance);
        }
    }

    // DataClient needs a few arguments to fetch data
    private readonly Guid _instanceGuid;
    private readonly int _instanceOwnerPartyId;

    // Services from DI
    private readonly IStorageDataClient _dataClient;
    private readonly IStorageInstanceClient _instanceClient;
    private readonly IInstanceDataMutatorStorageAccessGuard _storageAccessGuard;
    private readonly Lock _lifecycleLock = new();
    private readonly List<StorageAccessGuardScopeRegistration> _storageAccessGuardScopes = [];
    private readonly Instance _instance;
    private readonly IReadOnlyCollection<DataType> _dataTypes;
    private readonly string? _taskId;
    private readonly string? _language;
    private readonly ApplicationMetadata _appMetadata;
    private readonly ModelSerializationService _modelSerializationService;

    private readonly IAppResources _appResources;
    private readonly IOptions<FrontEndSettings> _frontEndSettings;
    private readonly ITranslationService _translationService;
    private readonly Telemetry? _telemetry;

    // Cache for the most up-to-date form data (can be mutated or replaced with SetFormData(dataElementId, data))
    private readonly DataElementCache<IFormDataWrapper> _formDataCache = new();

    // Cache for the binary content of the file as currently in storage before changes in this unit of work.
    private readonly DataElementCache<ReadOnlyMemory<byte>> _binaryCache = new();

    // Data elements to delete (eg RemoveDataElement(dataElementId)), but not yet deleted from instance or storage
    private readonly ConcurrentBag<DataElementChange> _changesForDeletion = [];

    // Data elements staged for creation. Staged identifiers are internal and replaced after Storage commit.
    private readonly ConcurrentBag<DataElementChange> _changesForCreation = [];

    // Existing binary data elements with updated content that is not yet saved to storage.
    private readonly ConcurrentDictionary<DataElementIdentifier, BinaryDataChange> _changesForBinaryUpdate = [];

    // Previous binary state retained for the unit-of-work lifetime, independently of pending mutation state.
    private readonly ConcurrentDictionary<DataElementIdentifier, PreviousBinaryState> _previousBinaryUpdates = [];

    // Pending lock status changes, collapsed to the last requested value for each data element.
    private readonly ConcurrentDictionary<DataElementIdentifier, bool> _pendingDataElementLockStatuses = [];

    // Pending lock status changes by data type, used for creates staged after the data type was locked or unlocked.
    private readonly ConcurrentDictionary<string, bool> _pendingDataTypeLockStatuses = new(StringComparer.Ordinal);

    private ProcessStateChange? _stagedProcessStateChange;
    private bool _stagedInstanceDeletion;

    private readonly Lock _storageMetadataLock = new();

    private readonly ConcurrentDictionary<DataType, StorageAuthenticationMethod> _authenticationMethodOverrides = new(
        DataTypeComparer.Instance
    );
    private static readonly StorageAuthenticationMethod _defaultAuthenticationMethod =
        StorageAuthenticationMethod.CurrentUser();
    private bool _disposed;

    public InstanceDataUnitOfWork(
        Instance instance,
        IStorageDataClient dataClient,
        IStorageInstanceClient instanceClient,
        ApplicationMetadata appMetadata,
        ITranslationService translationService,
        ModelSerializationService modelSerializationService,
        IAppResources appResources,
        IOptions<FrontEndSettings> frontEndSettings,
        IInstanceDataMutatorStorageAccessGuard storageAccessGuard,
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

        _instance = instance;
        _storageVersionMetadata = InstanceStorageMetadataRegistry.Get(instance);
        _dataTypes = appMetadata.DataTypes;
        _dataClient = dataClient;
        _appMetadata = appMetadata;
        _translationService = translationService;
        _modelSerializationService = modelSerializationService;
        _taskId = taskId;
        _language = language;
        _frontEndSettings = frontEndSettings;
        _appResources = appResources;
        _instanceClient = instanceClient;
        _telemetry = telemetry;
        _storageAccessGuard = storageAccessGuard;
    }

    public Instance Instance
    {
        get
        {
            ThrowIfDisposed();
            return _instance;
        }
    }

    public IReadOnlyCollection<DataType> DataTypes
    {
        get
        {
            ThrowIfDisposed();
            return _dataTypes;
        }
    }

    public string? TaskId
    {
        get
        {
            ThrowIfDisposed();
            return _taskId;
        }
    }

    public string? Language
    {
        get
        {
            ThrowIfDisposed();
            return _language;
        }
    }

    private StorageVersionMetadata _storageVersionMetadata = StorageVersionMetadata.Empty;

    internal StorageDataMetadata StorageMetadata
    {
        get
        {
            ThrowIfDisposed();
            lock (_storageMetadataLock)
            {
                return new StorageDataMetadata(_storageVersionMetadata);
            }
        }
    }

    /// <summary>
    /// Replaces the storage version metadata tracked by this unit of work.
    /// </summary>
    /// <remarks>
    /// Also updates the <see cref="InstanceStorageMetadataRegistry"/> weak-table entry for <see cref="Instance"/>,
    /// so any later unit of work opened on the same restored instance object keeps the captured versions.
    /// </remarks>
    internal void RestoreStorageMetadata(StorageDataMetadata metadata)
    {
        ThrowIfCannotMutateOrSave();
        lock (_storageMetadataLock)
        {
            _storageVersionMetadata = metadata.Versions;
            InstanceStorageMetadataRegistry.Set(Instance, _storageVersionMetadata);
        }
    }

    /// <summary>
    /// Opens this unit of work by activating the direct Storage guard in the current async execution context.
    /// </summary>
    /// <remarks>
    /// The activation is visible through the current .NET <see cref="System.Threading.ExecutionContext"/>, where
    /// <see cref="AsyncLocal{T}"/> state flows through async continuations. It is not tied to C# lexical scope, and it
    /// does not automatically activate unrelated parent or child execution contexts that call this method elsewhere.
    /// The returned unit of work owns the activation until <see cref="Dispose"/>.
    /// </remarks>
    internal InstanceDataUnitOfWork Open()
    {
        IDisposable scope = _storageAccessGuard.EnterScope();
        try
        {
            OwnStorageAccessGuardScope(scope);
        }
        catch
        {
            scope.Dispose();
            throw;
        }

        return this;
    }

    /// <summary>
    /// Transfers ownership of a direct Storage guard activation that was entered in the caller's current async
    /// execution context (.NET <see cref="System.Threading.ExecutionContext"/>).
    /// </summary>
    internal void TakeOwnershipOfCurrentExecutionContextActivation(IDisposable scope)
    {
        OwnStorageAccessGuardScope(scope);
    }

    private void OwnStorageAccessGuardScope(IDisposable scope)
    {
        lock (_lifecycleLock)
        {
            if (_disposed)
            {
                throw CreateDisposedException();
            }

            var registration = new StorageAccessGuardScopeRegistration(scope);
            _storageAccessGuardScopes.Add(registration);
        }
    }

    /// <summary>
    /// Disposes this unit of work terminally and clears all owned direct Storage guard activations.
    /// </summary>
    /// <remarks>
    /// This ends the unit of work for every current async execution context (.NET
    /// <see cref="System.Threading.ExecutionContext"/>) where this object owns a guard activation. It is not tied to
    /// C# lexical scope. After this method returns, accessors, mutators, and save methods on this object throw.
    /// </remarks>
    public void Dispose()
    {
        List<StorageAccessGuardScopeRegistration> scopes;
        lock (_lifecycleLock)
        {
            if (_disposed)
            {
                return;
            }

            _disposed = true;
            scopes = [.. _storageAccessGuardScopes];
            _storageAccessGuardScopes.Clear();
        }

        foreach (StorageAccessGuardScopeRegistration scope in scopes)
        {
            scope.Dispose();
        }
    }

    /// <inheritdoc />
    public void OverrideAuthenticationMethod(DataType dataType, StorageAuthenticationMethod method)
    {
        ThrowIfCannotMutateOrSave();
        _authenticationMethodOverrides[dataType] = method;
    }

    /// <inheritdoc />
    public async Task<object> GetFormData(DataElementIdentifier dataElementIdentifier)
    {
        ThrowIfDisposed();
        return (await GetFormDataWrapper(dataElementIdentifier)).BackingData<object>();
    }

    /// <inheritdoc />
    public async Task<IFormDataWrapper> GetFormDataWrapper(DataElementIdentifier dataElementIdentifier)
    {
        ThrowIfDisposed();
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
                    _modelSerializationService.DeserializeFromStorage(binaryData.Span, dataType, dataElement),
                    dataType,
                    dataElement
                );
            }
        );
    }

    /// <inheritdoc />
    public IInstanceDataAccessor GetCleanAccessor(RowRemovalOption rowRemovalOption = RowRemovalOption.SetToNull)
    {
        ThrowIfDisposed();
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

    /// <inheritdoc />
    /// <remarks>
    /// For an updated binary data element, previous bytes are available only when the element was read before its
    /// first update. Unchanged elements retain lazy persisted reads.
    /// </remarks>
    public IInstanceDataAccessor GetPreviousDataAccessor()
    {
        ThrowIfDisposed();
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

    public LayoutEvaluatorState GetLayoutEvaluatorState()
    {
        ThrowIfDisposed();
        if (_layoutEvaluatorStateCache is not null)
        {
            return _layoutEvaluatorStateCache;
        }

        // Could use a double lock here, but a deadlock is more problematic than creating the state twice
        var layouts = TaskId is null ? null : _appResources.GetLayoutModelForFolder(TaskId);

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
        ThrowIfDisposed();
        // Verify that the data element exists on the instance
        GetDataElement(dataElementIdentifier);

        if (_changesForBinaryUpdate.TryGetValue(dataElementIdentifier, out var updatedBinary))
        {
            return updatedBinary.CurrentBinaryData;
        }

        return await GetPersistedBinaryData(dataElementIdentifier);
    }

    /// <inheritdoc />
    public DataElement GetDataElement(DataElementIdentifier dataElementIdentifier)
    {
        ThrowIfDisposed();
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
        ThrowIfCannotMutateOrSave();
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
            dataElement: CreateStagedDataElement(dataType, contentType),
            dataType: dataType,
            contentType: contentType,
            currentFormDataWrapper: FormDataWrapperFactory.Create(model, dataType, null),
            previousFormDataWrapper: FormDataWrapperFactory.Create(
                _modelSerializationService.GetEmpty(dataType),
                dataType,
                null
            ),
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
        ReadOnlyMemory<byte> bytes,
        string? generatedFromTask = null,
        List<KeyValueEntry>? metadata = null
    )
    {
        ThrowIfCannotMutateOrSave();
        var dataType = GetDataTypeByString(dataTypeId);
        if (dataType.AppLogic?.ClassRef is not null)
        {
            throw new InvalidOperationException(
                $"Data type {dataTypeId} has a AppLogic.ClassRef in app metadata, and is not a binary data element"
            );
        }

        ValidateBinaryData(dataType, contentType, bytes);

        BinaryDataChange change = new BinaryDataChange(
            type: ChangeType.Created,
            dataElement: CreateStagedDataElement(dataType, contentType, filename),
            dataType: dataType,
            fileName: filename,
            contentType: contentType,
            currentBinaryData: bytes,
            generatedFromTask: generatedFromTask,
            metadata: metadata
        );
        _changesForCreation.Add(change);
        return change;
    }

    /// <inheritdoc />
    public BinaryDataChange UpdateBinaryDataElement(
        DataElementIdentifier dataElementIdentifier,
        string contentType,
        ReadOnlyMemory<byte> bytes
    )
    {
        ThrowIfCannotMutateOrSave();
        var dataElement = GetDataElement(dataElementIdentifier);
        var dataType = this.GetDataType(dataElementIdentifier);
        if (dataType.AppLogic?.ClassRef is not null)
        {
            throw new InvalidOperationException(
                $"Data element {dataElementIdentifier.Id} of type {dataType.Id} is not a binary data element"
            );
        }
        if (_changesForDeletion.Any(c => c.DataElementIdentifier == dataElementIdentifier))
        {
            throw new InvalidOperationException(
                $"Data element with id {dataElementIdentifier.Id} is marked for deletion and cannot be updated"
            );
        }
        if (dataElement.ContentType != contentType)
        {
            throw new InvalidOperationException(
                $"Data element {dataElementIdentifier.Id} has Content-Type '{dataElement.ContentType}' and cannot be updated with '{contentType}'"
            );
        }

        ValidateBinaryData(dataType, contentType, bytes);

        PreviousBinaryState previousState = _previousBinaryUpdates.GetOrAdd(
            dataElementIdentifier,
            identifier =>
                _binaryCache.TryGetCachedValue(identifier, out var cachedBinaryData)
                    ? new PreviousBinaryState(IsAvailable: true, Data: cachedBinaryData)
                    : new PreviousBinaryState(IsAvailable: false, Data: default)
        );
        ReadOnlyMemory<byte>? previousBinaryData = null;
        if (previousState.IsAvailable)
        {
            previousBinaryData = previousState.Data;
        }

        BinaryDataChange change = new BinaryDataChange(
            type: ChangeType.Updated,
            dataElement: dataElement,
            dataType: dataType,
            fileName: dataElement.Filename,
            contentType: contentType,
            currentBinaryData: bytes,
            previousBinaryData: previousBinaryData
        );
        _changesForBinaryUpdate[dataElementIdentifier] = change;
        return change;
    }

    /// <inheritdoc />
    public void RemoveDataElement(DataElementIdentifier dataElementIdentifier)
    {
        ThrowIfCannotMutateOrSave();
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
            _changesForBinaryUpdate.TryRemove(dataElementIdentifier, out _);
            _pendingDataElementLockStatuses.TryRemove(dataElementIdentifier, out _);
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
            _pendingDataElementLockStatuses.TryRemove(dataElementIdentifier, out _);
            _changesForDeletion.Add(
                new FormDataChange(
                    type: ChangeType.Deleted,
                    dataElement: dataElement,
                    dataType: dataType,
                    contentType: dataElement.ContentType,
                    currentFormDataWrapper: _formDataCache.TryGetCachedValue(dataElementIdentifier, out var cfd)
                        ? cfd
                        : FormDataWrapperFactory.Create(
                            _modelSerializationService.GetEmpty(dataType),
                            dataType,
                            dataElement
                        ),
                    previousFormDataWrapper: FormDataWrapperFactory.Create(
                        _modelSerializationService.GetEmpty(dataType),
                        dataType,
                        dataElement
                    ),
                    currentBinaryData: ReadOnlyMemory<byte>.Empty,
                    previousBinaryData: _binaryCache.TryGetCachedValue(dataElementIdentifier, out var value)
                        ? value
                        : null
                )
            );
        }
    }

    /// <summary>
    /// Lock all current and pending data elements for a data type.
    ///
    /// Data-type lock mutation is owned by the workflow/process lifecycle and is deliberately not app-facing.
    /// Actual update in storage is not done until the instance is saved.
    /// </summary>
    public void LockDataElementsForDataType(string dataTypeId) => SetDataTypeLockStatus(dataTypeId, locked: true);

    /// <summary>
    /// Unlock all current and pending data elements for a data type.
    ///
    /// Data-type lock mutation is owned by the workflow/process lifecycle and is deliberately not app-facing.
    /// Actual update in storage is not done until the instance is saved.
    /// </summary>
    public void UnlockDataElementsForDataType(string dataTypeId) => SetDataTypeLockStatus(dataTypeId, locked: false);

    private void SetDataTypeLockStatus(string dataTypeId, bool locked)
    {
        ThrowIfCannotMutateOrSave();
        DataType dataType = GetDataTypeByString(dataTypeId);
        HashSet<DataElementIdentifier> deletedDataElementIdentifiers = _changesForDeletion
            .Select(change => change.DataElementIdentifier)
            .ToHashSet();

        _pendingDataTypeLockStatuses[dataType.Id] = locked;

        foreach (DataElement dataElement in Instance.Data.Where(dataElement => dataElement.DataType == dataType.Id))
        {
            if (!deletedDataElementIdentifiers.Contains(dataElement))
            {
                _pendingDataElementLockStatuses[dataElement] = locked;
            }
        }

        foreach (DataElementChange change in _changesForCreation.Where(change => change.DataType.Id == dataType.Id))
        {
            _pendingDataElementLockStatuses[change.DataElementIdentifier] = locked;
        }
    }

    private DataElement CreateStagedDataElement(DataType dataType, string contentType, string? filename = null) =>
        new()
        {
            Id = Guid.NewGuid().ToString(),
            InstanceGuid = _instanceGuid == Guid.Empty ? null : _instanceGuid.ToString(),
            DataType = dataType.Id,
            ContentType = contentType,
            Filename = filename,
        };

    /// <summary>
    /// Preload form data into the cache so that it doesn't need to be fetched from Storage.
    /// </summary>
    internal void PreloadFormData(DataElementIdentifier id, IFormDataWrapper wrapper)
    {
        ThrowIfCannotMutateOrSave();
        _formDataCache.Set(id, wrapper);
    }

    /// <summary>
    /// Preload binary data into the cache so that it doesn't need to be fetched from Storage.
    /// </summary>
    internal void PreloadBinaryData(DataElementIdentifier id, ReadOnlyMemory<byte> data)
    {
        ThrowIfCannotMutateOrSave();
        _binaryCache.Set(id, data);
    }

    internal void StageProcessStateChange(ProcessStateChange processStateChange)
    {
        ThrowIfCannotMutateOrSave();
        ArgumentNullException.ThrowIfNull(processStateChange);
        if (processStateChange.NewProcessState is null)
        {
            throw new InvalidOperationException("Cannot stage a process state change without a new process state.");
        }

        _stagedProcessStateChange = processStateChange;
    }

    internal void StageInstanceDeletion()
    {
        ThrowIfCannotMutateOrSave();
        _stagedInstanceDeletion = true;
    }

    /// <summary>
    /// Captures all form data from the cache for state transport.
    /// Iterates Instance.Data, finds form data elements (via DataTypes where AppLogic.ClassRef is set),
    /// ensures each is loaded, and serializes to JSON.
    /// </summary>
    internal async Task<List<(string Id, string DataType, System.Text.Json.JsonElement Data)>> CaptureFormData(
        ModelSerializationService modelSerializationService
    )
    {
        ThrowIfDisposed();
        var result = new List<(string Id, string DataType, System.Text.Json.JsonElement Data)>();

        foreach (var dataElement in Instance.Data)
        {
            var dataType = DataTypes.FirstOrDefault(dt => dt.Id == dataElement.DataType);
            if (dataType?.AppLogic?.ClassRef is null)
                continue;

            DataElementIdentifier identifier = dataElement;
            var wrapper = await GetFormDataWrapper(identifier);
            var jsonBytes = modelSerializationService.SerializeToJson(wrapper.BackingData<object>());
            var jsonElement = System.Text.Json.JsonDocument.Parse(jsonBytes).RootElement.Clone();
            result.Add((dataElement.Id, dataElement.DataType, jsonElement));
        }

        return result;
    }

    private readonly List<ValidationIssue> _abandonIssues = [];

    internal IReadOnlyList<ValidationIssue> AbandonIssues
    {
        get
        {
            ThrowIfDisposed();
            return _abandonIssues.AsReadOnly();
        }
    }

    public bool HasAbandonIssues
    {
        get
        {
            ThrowIfDisposed();
            return _abandonIssues.Count > 0;
        }
    }

    public void AbandonAllChanges(IEnumerable<ValidationIssue> validationIssues)
    {
        ThrowIfCannotMutateOrSave();
        _abandonIssues.AddRange(validationIssues);
        if (_abandonIssues.Count == 0)
        {
            throw new InvalidOperationException("AbandonAllChanges called without any validation issues");
        }
    }

    public DataElementChanges GetDataElementChanges(bool initializeAltinnRowId)
    {
        ThrowIfDisposed();
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

            if (_changesForBinaryUpdate.TryGetValue(dataElementIdentifier, out var binaryChange))
            {
                changes.Add(binaryChange);
                continue;
            }

            if (!_formDataCache.TryGetCachedValue(dataElementIdentifier, out IFormDataWrapper? dataWrapper))
            {
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
                            _modelSerializationService.DeserializeFromStorage(cachedBinary.Span, dataType, dataElement),
                            dataType,
                            dataElement
                        ),
                        currentBinaryData: currentBinary,
                        previousBinaryData: cachedBinary
                    )
                );
            }
        }

        foreach (var creationChange in _changesForCreation)
        {
            if (creationChange is FormDataChange formDataChange)
            {
                if (initializeAltinnRowId)
                {
                    formDataChange.CurrentFormDataWrapper.InitializeAltinnRowIds();
                }
                var (updatedBinary, _) = _modelSerializationService.SerializeToStorage(
                    formDataChange.CurrentFormDataWrapper.BackingData<object>(),
                    formDataChange.DataType,
                    null
                );
                formDataChange.CurrentBinaryData = updatedBinary;
                changes.Add(creationChange);
            }
            else
            {
                changes.Add(creationChange);
            }
        }
        changes.AddRange(_changesForDeletion);

        return new DataElementChanges(changes);
    }

    private static void ValidateBinaryData(DataType dataType, string contentType, ReadOnlyMemory<byte> bytes)
    {
        if (dataType.MaxSize.HasValue && bytes.Length > dataType.MaxSize.Value * 1024 * 1024)
        {
            throw new InvalidOperationException(
                $"Data element of type {dataType.Id} exceeds the size limit of {dataType.MaxSize} MB"
            );
        }

        if (dataType.AllowedContentTypes is { Count: > 0 } && !dataType.AllowedContentTypes.Contains(contentType))
        {
            throw new InvalidOperationException(
                $"Data element of type {dataType.Id} has a Content-Type '{contentType}' which is invalid for element type '{dataType.Id}'"
            );
        }
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
        var dataElementResult = await InsertBinaryDataWithStorageMetadata(
            change.DataType.Id,
            change.ContentType,
            (change as BinaryDataChange)?.FileName,
            new MemoryAsStream(bytes),
            generatedFromTask: (change as BinaryDataChange)?.GeneratedFromTask,
            authenticationMethod: GetAuthenticationMethod(change.DataType),
            preconditions: GetTaskBoundWritePreconditions()
        );
        var dataElement = dataElementResult.DataElement;
        StoreVersionMetadata(dataElementResult.Versions);

        // Apply metadata if specified
        if (change is BinaryDataChange { Metadata: { Count: > 0 } metadata })
        {
            dataElement.Metadata = metadata;
            var metadataUpdateResult = await UpdateDataElementMetadataWithStorageMetadata(
                dataElement,
                GetAuthenticationMethod(change.DataType),
                GetTaskBoundWritePreconditions()
            );
            dataElement = metadataUpdateResult.DataElement;
            StoreVersionMetadata(metadataUpdateResult.Versions);
        }

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
        var result = await UpdateBinaryDataWithStorageMetadata(
            change.DataElement.ContentType,
            change.DataElement.Filename,
            Guid.Parse(change.DataElement.Id),
            new MemoryAsStream(bytes),
            GetAuthenticationMethod(change.DataElementIdentifier),
            GetTaskBoundContentWritePreconditions(change.DataElementIdentifier)
        );
        change.DataElement.ContentEtag = result.DataElement.ContentEtag;
        StoreVersionMetadata(result.Versions);
    }

    private async Task UpdateDataElement(BinaryDataChange change)
    {
        if (change.DataElement is null)
            throw new InvalidOperationException("ChangeType.Updated sent to SaveChanges must have a DataElement value");

        var result = await UpdateBinaryDataWithStorageMetadata(
            change.ContentType,
            change.FileName,
            change.DataElementIdentifier.Guid,
            new MemoryAsStream(change.CurrentBinaryData),
            GetAuthenticationMethod(change.DataElementIdentifier),
            GetTaskBoundContentWritePreconditions(change.DataElementIdentifier)
        );
        change.DataElement.ContentEtag = result.DataElement.ContentEtag;
        StoreVersionMetadata(result.Versions);
    }

    internal async Task SaveChanges(DataElementChanges changes)
    {
        using var activity = _telemetry?.StartSaveChanges(changes);
        ValidateCanSaveChangesOrThrow();

        var mutationPlan = BuildAggregateMutationPlan(changes);
        if (!mutationPlan.HasMutations)
        {
            return;
        }

        if (mutationPlan.RequiresLegacyFanOut)
        {
            if (mutationPlan.HasLockStatusMutations)
            {
                throw new InvalidOperationException(
                    "Data element lock status changes require one aggregate Storage mutation client and one authentication method."
                );
            }

            await UpdateInstanceDataLegacy(changes);
            await SaveChangesLegacy(changes);
            return;
        }

        IInstanceMutationClient mutationClient = _dataClient;
        StorageAuthenticationMethod authenticationMethod =
            mutationPlan.AuthenticationMethods.SingleOrDefault() ?? _defaultAuthenticationMethod;
        InstanceMutationWithStorageMetadata result = await ExecuteTaskBoundStorageWrite(() =>
            mutationClient.CommitInstanceMutationWithStorageMetadata(
                _instanceOwnerPartyId,
                _instanceGuid,
                mutationPlan.Request,
                mutationPlan.ContentParts,
                authenticationMethod,
                GetTaskBoundWritePreconditions()
            )
        );

        ApplyAggregateMutationResult(changes, mutationPlan, result);
    }

    internal async Task<WorkflowAggregateSaveOutcome> SaveWorkflowOwnedAggregate(
        DataElementChanges changes,
        string idempotencyKey,
        CancellationToken cancellationToken
    )
    {
        ValidateCanSaveChangesOrThrow();

        if (string.IsNullOrWhiteSpace(idempotencyKey))
        {
            throw new InvalidOperationException("Workflow-owned aggregate save requires an idempotency key.");
        }

        var mutationPlan = BuildAggregateMutationPlan(changes);
        ApplyStagedProcessState(mutationPlan.Request);
        ApplyStagedInstanceDeletion(mutationPlan.Request);
        if (!mutationPlan.HasMutations)
        {
            return WorkflowAggregateSaveOutcome.NothingToSave;
        }

        if (_storageVersionMetadata.InstanceVersion is null)
        {
            throw new InvalidOperationException("Workflow-owned aggregate save requires a captured instance version.");
        }

        if (mutationPlan.RequiresLegacyFanOut)
        {
            throw new InvalidOperationException(
                "Workflow-owned aggregate save requires one aggregate Storage mutation client and one authentication method."
            );
        }

        IInstanceMutationClient mutationClient = _dataClient;
        StorageAuthenticationMethod authenticationMethod =
            mutationPlan.AuthenticationMethods.SingleOrDefault() ?? StorageAuthenticationMethod.ServiceOwner();
        InstanceMutationWithStorageMetadata result = await mutationClient.CommitInstanceMutationWithStorageMetadata(
            _instanceOwnerPartyId,
            _instanceGuid,
            mutationPlan.Request,
            mutationPlan.ContentParts,
            authenticationMethod,
            GetWorkflowOwnedWritePreconditions(idempotencyKey),
            cancellationToken
        );

        if (result.Replayed)
        {
            await RebuildFromStorageAfterReplay(cancellationToken);
            throw new InstanceMutationReplayedException(
                "Storage replayed the workflow-owned instance mutation. The unit of work has been rebuilt from Storage state."
            );
        }

        ApplyAggregateMutationResult(changes, mutationPlan, result);
        ClearCommittedAggregateState();
        return WorkflowAggregateSaveOutcome.Saved;
    }

    private sealed class StorageAccessGuardScopeRegistration(IDisposable scope) : IDisposable
    {
        private int _disposed;

        public void Dispose()
        {
            if (System.Threading.Interlocked.Exchange(ref _disposed, 1) == 0)
            {
                scope.Dispose();
            }
        }
    }

    private void ValidateCanSaveChangesOrThrow()
    {
        ThrowIfCannotMutateOrSave();
        if (_abandonIssues.Count > 0)
        {
            throw new InvalidOperationException("AbandonAllChanges has been called, and no changes should be saved");
        }
        if (_instanceOwnerPartyId == 0 || _instanceGuid == Guid.Empty)
        {
            throw new InvalidOperationException("Cannot access instance data before it has been created");
        }
    }

    private void ThrowIfDisposed()
    {
        lock (_lifecycleLock)
        {
            if (_disposed)
            {
                throw CreateDisposedException();
            }
        }
    }

    private void ThrowIfCannotMutateOrSave()
    {
        ThrowIfDisposed();
    }

    private static ObjectDisposedException CreateDisposedException() =>
        new(nameof(InstanceDataUnitOfWork), "The InstanceDataUnitOfWork has been disposed and can no longer be used.");

    private async Task UpdateInstanceDataLegacy(DataElementChanges changes)
    {
        var tasks = new List<Task>();
        ConcurrentDictionary<DataElementChange, DataElement> createdDataElements = [];
        // We need to create data elements here, so that we can set them correctly on the instance
        // Updating is done in SaveChanges and happen in parallel with validation.

        // Upload added data elements
        foreach (var change in changes.AllChanges.Where(c => c.Type == ChangeType.Created))
        {
            tasks.Add(CreateDataElement(createdDataElements, change));
        }

        // Delete data elements
        foreach (var change in changes.AllChanges.Where(c => c.Type == ChangeType.Deleted))
        {
            async Task DeleteData()
            {
                DeleteDataWithStorageMetadata result = await DeleteDataWithStorageMetadata(
                    _instanceOwnerPartyId,
                    _instanceGuid,
                    change.DataElementIdentifier.Guid,
                    false,
                    authenticationMethod: GetAuthenticationMethod(change.DataElementIdentifier),
                    preconditions: GetTaskBoundWritePreconditions()
                );
                StoreVersionMetadata(result.Metadata);
            }

            tasks.Add(DeleteData());
        }

        await Task.WhenAll(tasks);

        // Remove deleted data elements from instance.Data
        Instance.Data.RemoveAll(dataElement =>
            changes.AllChanges.Where(c => c.Type == ChangeType.Deleted).Any(d => d.DataElement?.Id == dataElement.Id)
        );

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

    private async Task SaveChangesLegacy(DataElementChanges changes)
    {
        var tasks = new List<Task>();

        foreach (var change in changes.AllChanges.Where(change => change.Type == ChangeType.Updated))
        {
            tasks.Add(
                change switch
                {
                    FormDataChange formDataChange => UpdateDataElement(formDataChange),
                    BinaryDataChange binaryDataChange => UpdateDataElement(binaryDataChange),
                    _ => throw new UnreachableException("ChangeType.Updated must be a form or binary data change"),
                }
            );
        }

        await Task.WhenAll(tasks);
    }

    private AggregateMutationPlan BuildAggregateMutationPlan(DataElementChanges changes)
    {
        var request = new StorageInstanceMutationRequest();
        var contentParts = new Dictionary<string, StorageInstanceMutationContent>(StringComparer.Ordinal);
        var createdChanges = new List<DataElementChange>();
        var pendingLockStatuses = _pendingDataElementLockStatuses.ToDictionary();
        var pendingDataTypeLockStatuses = new Dictionary<string, bool>(
            _pendingDataTypeLockStatuses,
            StringComparer.Ordinal
        );
        var plannedDataElementIdentifiers = new HashSet<DataElementIdentifier>();
        var lockStatusDataElementIdentifiers = new HashSet<DataElementIdentifier>();
        var lockStatusDataTypeIds = new HashSet<string>(StringComparer.Ordinal);
        var authenticationMethods = new HashSet<StorageAuthenticationMethod>();

        foreach (var change in changes.AllChanges)
        {
            switch (change.Type)
            {
                case ChangeType.Created:
                {
                    string contentPartName = $"create-{createdChanges.Count}";
                    createdChanges.Add(change);
                    AddContentPart(contentParts, contentPartName, change);
                    bool hasLocked = TryGetPendingLockStatus(
                        change,
                        pendingLockStatuses,
                        pendingDataTypeLockStatuses,
                        out bool locked
                    );
                    if (hasLocked)
                    {
                        lockStatusDataElementIdentifiers.Add(change.DataElementIdentifier);
                        lockStatusDataTypeIds.Add(change.DataType.Id);
                    }
                    plannedDataElementIdentifiers.Add(change.DataElementIdentifier);

                    request.CreateDataElements.Add(
                        new StorageInstanceMutationCreateDataElement
                        {
                            DataType = change.DataType.Id,
                            ContentPartName = contentPartName,
                            ContentType = change.ContentType,
                            Filename = (change as BinaryDataChange)?.FileName,
                            GeneratedFromTask = (change as BinaryDataChange)?.GeneratedFromTask,
                            Metadata = (change as BinaryDataChange)?.Metadata,
                            Locked = hasLocked ? locked : null,
                        }
                    );
                    authenticationMethods.Add(GetAuthenticationMethod(change.DataType));
                    break;
                }
                case ChangeType.Updated:
                {
                    if (change.DataElement is null)
                    {
                        throw new InvalidOperationException(
                            "ChangeType.Updated sent to SaveChanges must have a DataElement value"
                        );
                    }

                    string contentPartName = $"update-{change.DataElementIdentifier.Guid:N}";
                    AddContentPart(contentParts, contentPartName, change);
                    bool hasLocked = TryGetPendingLockStatus(
                        change,
                        pendingLockStatuses,
                        pendingDataTypeLockStatuses,
                        out bool locked
                    );
                    if (hasLocked)
                    {
                        lockStatusDataElementIdentifiers.Add(change.DataElementIdentifier);
                        lockStatusDataTypeIds.Add(change.DataType.Id);
                    }
                    plannedDataElementIdentifiers.Add(change.DataElementIdentifier);

                    request.UpdateDataElements.Add(
                        new StorageInstanceMutationUpdateDataElement
                        {
                            DataElementId = change.DataElementIdentifier.Guid,
                            ContentPartName = contentPartName,
                            ExpectedCurrentBlobVersion = GetDataElementContentETag(change.DataElementIdentifier),
                            ContentType = change.ContentType,
                            Filename = change switch
                            {
                                BinaryDataChange binaryDataChange => binaryDataChange.FileName,
                                FormDataChange => change.DataElement.Filename,
                                _ => throw new UnreachableException(
                                    "ChangeType.Updated must be a form or binary data change"
                                ),
                            },
                            Locked = hasLocked ? locked : null,
                        }
                    );
                    authenticationMethods.Add(GetAuthenticationMethod(change.DataType));
                    break;
                }
                case ChangeType.Deleted:
                    bool ignoreLock =
                        TryGetPendingLockStatus(
                            change,
                            pendingLockStatuses,
                            pendingDataTypeLockStatuses,
                            out bool deletedElementPendingLocked
                        ) && !deletedElementPendingLocked;
                    request.DeleteDataElements.Add(
                        new StorageInstanceMutationDeleteDataElement
                        {
                            DataElementId = change.DataElementIdentifier.Guid,
                            IgnoreLock = ignoreLock,
                        }
                    );
                    plannedDataElementIdentifiers.Add(change.DataElementIdentifier);
                    authenticationMethods.Add(GetAuthenticationMethod(change.DataType));
                    break;
                default:
                    throw new UnreachableException($"Unknown data element change type {change.Type}");
            }
        }

        foreach (var (dataElementIdentifier, locked) in pendingLockStatuses)
        {
            if (plannedDataElementIdentifiers.Contains(dataElementIdentifier))
            {
                continue;
            }

            request.UpdateDataElements.Add(
                new StorageInstanceMutationUpdateDataElement
                {
                    DataElementId = dataElementIdentifier.Guid,
                    Locked = locked,
                }
            );
            plannedDataElementIdentifiers.Add(dataElementIdentifier);
            lockStatusDataElementIdentifiers.Add(dataElementIdentifier);
            lockStatusDataTypeIds.Add(this.GetDataType(dataElementIdentifier).Id);
            authenticationMethods.Add(GetAuthenticationMethod(dataElementIdentifier));
        }

        AddDerivedInstanceFieldUpdates(request, changes, authenticationMethods);

        return new AggregateMutationPlan(
            request,
            contentParts,
            createdChanges,
            lockStatusDataElementIdentifiers,
            lockStatusDataTypeIds,
            authenticationMethods
        );
    }

    private void ApplyStagedProcessState(StorageInstanceMutationRequest request)
    {
        if (_stagedProcessStateChange is not { } processStateChange)
        {
            return;
        }

        request.ProcessState = new StorageInstanceMutationProcessStateUpdate
        {
            State = processStateChange.NewProcessState,
            Events = processStateChange.Events ?? [],
        };
    }

    private void ApplyStagedInstanceDeletion(StorageInstanceMutationRequest request)
    {
        if (!_stagedInstanceDeletion)
        {
            return;
        }

        request.DeleteInstance = new StorageInstanceMutationDeleteInstance { Hard = true };
    }

    private async Task RebuildFromStorageAfterReplay(CancellationToken cancellationToken)
    {
        var appIdentifier = GetAppIdentifierForStorageLookup();
        InstanceWithStorageMetadata freshInstance = await _instanceClient.GetInstanceWithStorageMetadata(
            appIdentifier.App,
            appIdentifier.Org,
            _instanceOwnerPartyId,
            _instanceGuid,
            StorageAuthenticationMethod.ServiceOwner(),
            cancellationToken
        );

        ApplyInstanceSnapshot(freshInstance.Instance);
        RestoreStorageMetadata(new StorageDataMetadata(freshInstance.Metadata));
        ClearAttemptLocalState();
    }

    private AppIdentifier GetAppIdentifierForStorageLookup()
    {
        string appId = !string.IsNullOrWhiteSpace(_instance.AppId) ? _instance.AppId : _appMetadata.Id;
        return new AppIdentifier(appId);
    }

    private void ClearCommittedAggregateState()
    {
        ClearTrackedChanges();
        _stagedProcessStateChange = null;
        _stagedInstanceDeletion = false;
    }

    private void ClearAttemptLocalState()
    {
        _formDataCache.Clear();
        _binaryCache.Clear();
        ClearCommittedAggregateState();
    }

    private void ClearTrackedChanges()
    {
        _changesForCreation.Clear();
        _changesForDeletion.Clear();
        _changesForBinaryUpdate.Clear();
        _pendingDataElementLockStatuses.Clear();
        _pendingDataTypeLockStatuses.Clear();
    }

    private static bool TryGetPendingLockStatus(
        DataElementChange change,
        IReadOnlyDictionary<DataElementIdentifier, bool> pendingLockStatuses,
        IReadOnlyDictionary<string, bool> pendingDataTypeLockStatuses,
        out bool locked
    )
    {
        if (pendingLockStatuses.TryGetValue(change.DataElementIdentifier, out locked))
        {
            return true;
        }

        return pendingDataTypeLockStatuses.TryGetValue(change.DataType.Id, out locked);
    }

    private static void AddContentPart(
        Dictionary<string, StorageInstanceMutationContent> contentParts,
        string contentPartName,
        DataElementChange change
    )
    {
        var bytes = change switch
        {
            BinaryDataChange binaryDataChange => binaryDataChange.CurrentBinaryData,
            FormDataChange { CurrentBinaryData: { } currentBinaryData } => currentBinaryData,
            FormDataChange => throw new InvalidOperationException(
                "Form data changes sent to SaveChanges must have a CurrentBinaryData value"
            ),
            _ => throw new UnreachableException("Change must be of type BinaryDataChange or FormDataChange"),
        };

        contentParts.Add(
            contentPartName,
            new StorageInstanceMutationContent(bytes, change.ContentType, (change as BinaryDataChange)?.FileName)
        );
    }

    private void AddDerivedInstanceFieldUpdates(
        StorageInstanceMutationRequest request,
        DataElementChanges changes,
        ISet<StorageAuthenticationMethod> authenticationMethods
    )
    {
        var currentPresentationTexts = CopyStringDictionary(Instance.PresentationTexts);
        var currentDataValues = CopyStringDictionary(Instance.DataValues);
        var processedFormDataElements = new HashSet<DataElementIdentifier>();

        foreach (var (dataElementIdentifier, formData) in _formDataCache.GetCachedEntries())
        {
            if (dataElementIdentifier.DataTypeId is null)
            {
                continue;
            }

            var dataType = GetDataTypeByString(dataElementIdentifier.DataTypeId);
            AppendDerivedInstanceFieldUpdates(
                request,
                dataType,
                formData,
                currentPresentationTexts,
                currentDataValues,
                authenticationMethods
            );
            processedFormDataElements.Add(dataElementIdentifier);
        }

        foreach (var formDataChange in changes.FormDataChanges)
        {
            if (
                formDataChange.DataElement is not null
                && processedFormDataElements.Contains(formDataChange.DataElementIdentifier)
            )
            {
                continue;
            }

            AppendDerivedInstanceFieldUpdates(
                request,
                formDataChange.DataType,
                formDataChange.CurrentFormDataWrapper,
                currentPresentationTexts,
                currentDataValues,
                authenticationMethods
            );
        }
    }

    private void AppendDerivedInstanceFieldUpdates(
        StorageInstanceMutationRequest request,
        DataType dataType,
        IFormDataWrapper dataWrapper,
        Dictionary<string, string?> currentPresentationTexts,
        Dictionary<string, string?> currentDataValues,
        ISet<StorageAuthenticationMethod> authenticationMethods
    )
    {
        var updatedTexts = DataHelper.GetUpdatedDataValues(
            _appMetadata.PresentationFields,
            currentPresentationTexts,
            dataType.Id,
            dataWrapper.BackingData<object>()
        );
        if (updatedTexts.Count > 0)
        {
            MergeInstanceFieldUpdates(request.PresentationTexts, currentPresentationTexts, updatedTexts);
            authenticationMethods.Add(GetAuthenticationMethod(dataType));
        }

        var updatedValues = DataHelper.GetUpdatedDataValues(
            _appMetadata.DataFields,
            currentDataValues,
            dataType.Id,
            dataWrapper.BackingData<object>()
        );
        if (updatedValues.Count > 0)
        {
            MergeInstanceFieldUpdates(request.DataValues, currentDataValues, updatedValues);
            authenticationMethods.Add(GetAuthenticationMethod(dataType));
        }
    }

    private static void MergeInstanceFieldUpdates(
        Dictionary<string, string?> aggregateUpdates,
        Dictionary<string, string?> currentValues,
        Dictionary<string, string?> updates
    )
    {
        foreach (var (key, value) in updates)
        {
            aggregateUpdates[key] = value;
            if (string.IsNullOrEmpty(value))
            {
                currentValues.Remove(key);
            }
            else
            {
                currentValues[key] = value;
            }
        }
    }

    private static Dictionary<string, string?> CopyStringDictionary(Dictionary<string, string?>? source) =>
        source is null ? [] : new Dictionary<string, string?>(source, StringComparer.Ordinal);

    private string? GetDataElementContentETag(DataElementIdentifier dataElementIdentifier)
    {
        string? contentEtag = GetDataElement(dataElementIdentifier).ContentEtag;
        return string.IsNullOrEmpty(contentEtag) ? null : contentEtag;
    }

    private void ApplyAggregateMutationResult(
        DataElementChanges changes,
        AggregateMutationPlan mutationPlan,
        InstanceMutationWithStorageMetadata result
    )
    {
        ApplyInstanceSnapshot(result.Instance);

        if (result.CreatedDataElementIds.Count != mutationPlan.CreatedChanges.Count)
        {
            throw new InvalidOperationException(
                $"Storage mutation response contained {result.CreatedDataElementIds.Count} created data element ids, but {mutationPlan.CreatedChanges.Count} creates were requested"
            );
        }

        if (result.CreatedDataElementIds.Distinct().Count() != result.CreatedDataElementIds.Count)
        {
            throw new InvalidOperationException(
                "Storage mutation response contained duplicate created data element ids"
            );
        }

        for (int i = 0; i < mutationPlan.CreatedChanges.Count; i++)
        {
            DataElementChange change = mutationPlan.CreatedChanges[i];
            Guid dataElementId = result.CreatedDataElementIds[i];
            DataElement dataElement =
                Instance.Data.FirstOrDefault(dataElement => dataElement.Id == dataElementId.ToString())
                ?? throw new InvalidOperationException(
                    $"Storage mutation response did not contain created data element {dataElementId}"
                );
            change.DataElement = dataElement;
            StoreCurrentDataElementContent(change, dataElement);
        }

        foreach (var change in changes.AllChanges.Where(change => change.Type == ChangeType.Updated))
        {
            DataElement dataElement =
                Instance.Data.FirstOrDefault(dataElement => dataElement.Id == change.DataElementIdentifier.Id)
                ?? throw new InvalidOperationException(
                    $"Storage mutation response did not contain updated data element {change.DataElementIdentifier.Id}"
                );
            change.DataElement = dataElement;
        }

        foreach (DataElementIdentifier dataElementIdentifier in mutationPlan.LockStatusDataElementIdentifiers)
        {
            _pendingDataElementLockStatuses.TryRemove(dataElementIdentifier, out _);
        }

        foreach (string dataTypeId in mutationPlan.LockStatusDataTypeIds)
        {
            _pendingDataTypeLockStatuses.TryRemove(dataTypeId, out _);
        }

        StoreVersionMetadata(result.Metadata);
    }

    private void StoreCurrentDataElementContent(DataElementChange change, DataElement dataElement)
    {
        var bytes = change switch
        {
            BinaryDataChange binaryDataChange => binaryDataChange.CurrentBinaryData,
            FormDataChange { CurrentBinaryData: { } currentBinaryData } => currentBinaryData,
            _ => throw new UnreachableException("Created change must be a form or binary data change"),
        };

        _binaryCache.Set(dataElement, bytes);
        if (change is FormDataChange formDataChange)
        {
            _formDataCache.Set(dataElement, formDataChange.CurrentFormDataWrapper);
        }
    }

    private void ApplyInstanceSnapshot(Instance updatedInstance)
    {
        foreach (var property in typeof(Instance).GetProperties())
        {
            if (property.CanRead && property.CanWrite)
            {
                property.SetValue(Instance, property.GetValue(updatedInstance));
            }
        }

        InstanceStorageMetadataRegistry.Set(Instance, InstanceStorageMetadataRegistry.Get(updatedInstance));
    }

    private sealed record AggregateMutationPlan(
        StorageInstanceMutationRequest Request,
        IReadOnlyDictionary<string, StorageInstanceMutationContent> ContentParts,
        IReadOnlyList<DataElementChange> CreatedChanges,
        IReadOnlySet<DataElementIdentifier> LockStatusDataElementIdentifiers,
        IReadOnlySet<string> LockStatusDataTypeIds,
        IReadOnlySet<StorageAuthenticationMethod> AuthenticationMethods
    )
    {
        public bool HasMutations =>
            Request.CreateDataElements.Count > 0
            || Request.UpdateDataElements.Count > 0
            || Request.DeleteDataElements.Count > 0
            || Request.DeleteInstance is not null
            || Request.DataValues.Count > 0
            || Request.PresentationTexts.Count > 0
            || Request.ProcessState?.State is not null
            || Request.ProcessState?.Events?.Count > 0;

        public bool HasLockStatusMutations => LockStatusDataElementIdentifiers.Count > 0;

        public bool RequiresLegacyFanOut => AuthenticationMethods.Count > 1;
    }

    internal async Task<ReadOnlyMemory<byte>> GetPersistedBinaryData(DataElementIdentifier dataElementIdentifier)
    {
        ThrowIfDisposed();
        // Verify that the data element exists on the instance
        GetDataElement(dataElementIdentifier);

        return await _binaryCache.GetOrCreate(
            dataElementIdentifier,
            async () => await GetDataBytes(dataElementIdentifier)
        );
    }

    internal async Task<ReadOnlyMemory<byte>> GetPreviousBinaryData(DataElementIdentifier dataElementIdentifier)
    {
        ThrowIfDisposed();
        GetDataElement(dataElementIdentifier);

        if (_previousBinaryUpdates.TryGetValue(dataElementIdentifier, out PreviousBinaryState previousState))
        {
            if (previousState.IsAvailable)
            {
                return previousState.Data;
            }

            throw new InvalidOperationException(
                $"Previous binary data for data element {dataElementIdentifier.Id} is unavailable because the element was not read before it was updated. Read the element before calling UpdateBinaryDataElement when previous data is required."
            );
        }

        return await GetPersistedBinaryData(dataElementIdentifier);
    }

    private readonly record struct PreviousBinaryState(bool IsAvailable, ReadOnlyMemory<byte> Data);

    private async Task<byte[]> GetDataBytes(DataElementIdentifier dataElementIdentifier)
    {
        string? expectedContentETag = GetDataElementContentETag(dataElementIdentifier);
        try
        {
            return await _dataClient.GetDataBytesWithExpectedContentETag(
                _instanceOwnerPartyId,
                _instanceGuid,
                dataElementIdentifier.Guid,
                authenticationMethod: GetAuthenticationMethod(dataElementIdentifier),
                expectedContentETag: expectedContentETag
            );
        }
        catch (PlatformHttpException exception)
            when (!string.IsNullOrEmpty(expectedContentETag)
                && exception.Response.StatusCode == System.Net.HttpStatusCode.PreconditionFailed
            )
        {
            throw new DataElementContentConflictException(Instance.Id, dataElementIdentifier.Guid, exception);
        }
    }

    private async Task<DataElementWithStorageMetadata> InsertBinaryDataWithStorageMetadata(
        string dataType,
        string contentType,
        string? filename,
        Stream stream,
        string? generatedFromTask,
        StorageAuthenticationMethod authenticationMethod,
        StorageWritePreconditions? preconditions
    )
    {
        return await ExecuteTaskBoundStorageWrite(() =>
            _dataClient.InsertBinaryDataWithStorageMetadata(
                Instance.Id,
                dataType,
                contentType,
                filename,
                stream,
                generatedFromTask: generatedFromTask,
                authenticationMethod: authenticationMethod,
                preconditions: preconditions
            )
        );
    }

    private async Task<DataElementWithStorageMetadata> UpdateBinaryDataWithStorageMetadata(
        string? contentType,
        string? filename,
        Guid dataGuid,
        Stream stream,
        StorageAuthenticationMethod authenticationMethod,
        StorageWritePreconditions? preconditions
    )
    {
        return await ExecuteTaskBoundStorageWrite(() =>
            _dataClient.UpdateBinaryDataWithStorageMetadata(
                new InstanceIdentifier(Instance),
                contentType,
                filename,
                dataGuid,
                stream,
                authenticationMethod: authenticationMethod,
                preconditions: preconditions
            )
        );
    }

    private async Task<DataElementWithStorageMetadata> UpdateDataElementMetadataWithStorageMetadata(
        DataElement dataElement,
        StorageAuthenticationMethod authenticationMethod,
        StorageWritePreconditions? preconditions
    )
    {
        return await ExecuteTaskBoundStorageWrite(() =>
            _dataClient.UpdateDataElementWithStorageMetadata(
                Instance,
                dataElement,
                authenticationMethod: authenticationMethod,
                preconditions: preconditions
            )
        );
    }

    private async Task<DeleteDataWithStorageMetadata> DeleteDataWithStorageMetadata(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataGuid,
        bool delay,
        StorageAuthenticationMethod authenticationMethod,
        StorageWritePreconditions? preconditions
    )
    {
        return await ExecuteTaskBoundStorageWrite(() =>
            _dataClient.DeleteDataWithStorageMetadata(
                instanceOwnerPartyId,
                instanceGuid,
                dataGuid,
                delay,
                authenticationMethod: authenticationMethod,
                preconditions: preconditions
            )
        );
    }

    private static async Task<T> ExecuteTaskBoundStorageWrite<T>(Func<Task<T>> write)
    {
        try
        {
            return await write();
        }
        catch (PlatformHttpException exception)
            when (exception.Response.StatusCode == System.Net.HttpStatusCode.PreconditionFailed)
        {
            throw new InstanceDataStaleException(exception);
        }
    }

    private StorageWritePreconditions GetTaskBoundWritePreconditions()
    {
        lock (_storageMetadataLock)
        {
            return new StorageWritePreconditions(ProcessStateVersion: _storageVersionMetadata.ProcessStateVersion);
        }
    }

    private StorageWritePreconditions GetTaskBoundContentWritePreconditions(DataElementIdentifier dataElementIdentifier)
    {
        string? contentETag = GetDataElementContentETag(dataElementIdentifier);
        lock (_storageMetadataLock)
        {
            return new StorageWritePreconditions(
                ProcessStateVersion: _storageVersionMetadata.ProcessStateVersion,
                ContentETag: contentETag
            );
        }
    }

    private StorageWritePreconditions GetWorkflowOwnedWritePreconditions(string idempotencyKey)
    {
        lock (_storageMetadataLock)
        {
            return new StorageWritePreconditions(
                ProcessStateVersion: _storageVersionMetadata.ProcessStateVersion,
                InstanceVersion: _storageVersionMetadata.InstanceVersion,
                IdempotencyKey: idempotencyKey
            );
        }
    }

    /// <summary>
    /// Add or replace existing data element data in the cache
    /// </summary>
    internal void SetFormData(DataElementIdentifier dataElementIdentifier, IFormDataWrapper formDataWrapper)
    {
        ThrowIfCannotMutateOrSave();
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
        ThrowIfDisposed();
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
            InstanceWithStorageMetadata result = await UpdatePresentationTextsWithStorageMetadata(
                new PresentationTexts { Texts = updatedTexts },
                GetAuthenticationMethod(dataType),
                GetTaskBoundWritePreconditions()
            );
            StoreVersionMetadata(result.Metadata);

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
            InstanceWithStorageMetadata result = await UpdateDataValuesWithStorageMetadata(
                new DataValues { Values = updatedValues },
                GetAuthenticationMethod(dataType),
                GetTaskBoundWritePreconditions()
            );
            StoreVersionMetadata(result.Metadata);

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

    private async Task<InstanceWithStorageMetadata> UpdatePresentationTextsWithStorageMetadata(
        PresentationTexts presentationTexts,
        StorageAuthenticationMethod authenticationMethod,
        StorageWritePreconditions? preconditions
    )
    {
        int instanceOwnerPartyId = int.Parse(Instance.Id.Split("/")[0], CultureInfo.InvariantCulture);
        Guid instanceGuid = Guid.Parse(Instance.Id.Split("/")[1]);

        return await ExecuteTaskBoundStorageWrite(() =>
            _instanceClient.UpdatePresentationTextsWithStorageMetadata(
                instanceOwnerPartyId,
                instanceGuid,
                presentationTexts,
                authenticationMethod,
                preconditions: preconditions,
                ct: CancellationToken.None
            )
        );
    }

    private async Task<InstanceWithStorageMetadata> UpdateDataValuesWithStorageMetadata(
        DataValues dataValues,
        StorageAuthenticationMethod authenticationMethod,
        StorageWritePreconditions? preconditions
    )
    {
        int instanceOwnerPartyId = int.Parse(Instance.Id.Split("/")[0], CultureInfo.InvariantCulture);
        Guid instanceGuid = Guid.Parse(Instance.Id.Split("/")[1]);

        return await ExecuteTaskBoundStorageWrite(() =>
            _instanceClient.UpdateDataValuesWithStorageMetadata(
                instanceOwnerPartyId,
                instanceGuid,
                dataValues,
                authenticationMethod,
                preconditions: preconditions,
                ct: CancellationToken.None
            )
        );
    }

    private void StoreVersionMetadata(StorageVersionMetadata metadata)
    {
        lock (_storageMetadataLock)
        {
            _storageVersionMetadata = _storageVersionMetadata.Merge(metadata);
            InstanceStorageMetadataRegistry.Set(Instance, _storageVersionMetadata);
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
