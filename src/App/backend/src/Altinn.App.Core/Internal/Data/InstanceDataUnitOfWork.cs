using System.Collections.Concurrent;
using System.Collections.Immutable;
using System.Diagnostics;
using System.Globalization;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process;
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
internal sealed class InstanceDataUnitOfWork : IInstanceDataMutator
{
    /// <inheritdoc />
    public IReadOnlyDictionary<DataType, StorageAuthenticationMethod> AuthenticationMethodOverrides
    {
        get => _authenticationMethodOverrides.ToImmutableDictionary(DataTypeComparer.Instance);
    }

    // DataClient needs a few arguments to fetch data
    private readonly Guid _instanceGuid;
    private readonly int _instanceOwnerPartyId;

    // Services from DI
    private readonly IDataClientWithStorageMetadata _dataClient;
    private readonly IInstanceMutationClient _mutationClient;
    private readonly IInstanceClientWithStorageMetadata _instanceClient;
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
    private ProcessStatusTransition? _stagedProcessStatusTransition;
    private bool _stagedInstanceDeletion;
    private readonly Dictionary<string, string?> _stagedInstanceDataValues = new(StringComparer.Ordinal);

    private readonly ConcurrentDictionary<DataType, StorageAuthenticationMethod> _authenticationMethodOverrides = new(
        DataTypeComparer.Instance
    );
    private static readonly StorageAuthenticationMethod _defaultAuthenticationMethod =
        StorageAuthenticationMethod.CurrentUser();

    public InstanceDataUnitOfWork(
        Instance instance,
        StorageVersionMetadata storageVersionMetadata,
        IDataClientWithStorageMetadata dataClient,
        IInstanceMutationClient mutationClient,
        IInstanceClientWithStorageMetadata instanceClient,
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

        _instance = instance;
        _storageVersions = storageVersionMetadata;
        _dataTypes = appMetadata.DataTypes;
        _dataClient = dataClient;
        _mutationClient = mutationClient;
        _appMetadata = appMetadata;
        _translationService = translationService;
        _modelSerializationService = modelSerializationService;
        _taskId = taskId;
        _language = language;
        _frontEndSettings = frontEndSettings;
        _appResources = appResources;
        _instanceClient = instanceClient;
        _telemetry = telemetry;
    }

    public Instance Instance => _instance;

    public IReadOnlyCollection<DataType> DataTypes => _dataTypes;

    public string? TaskId => _taskId;

    public string? Language => _language;

    private StorageVersionMetadata _storageVersions = StorageVersionMetadata.Empty;

    internal StorageVersionMetadata StorageVersions => _storageVersions;

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
        _formDataCache.Set(id, wrapper);
    }

    /// <summary>
    /// Preload binary data into the cache so that it doesn't need to be fetched from Storage.
    /// </summary>
    internal void PreloadBinaryData(DataElementIdentifier id, ReadOnlyMemory<byte> data)
    {
        _binaryCache.Set(id, data);
    }

    internal void UpdateProcessState(ProcessStateChange processStateChange)
    {
        ArgumentNullException.ThrowIfNull(processStateChange);
        if (processStateChange.NewProcessState is null)
        {
            throw new InvalidOperationException("Cannot stage a process state change without a new process state.");
        }

        _stagedProcessStateChange = processStateChange;
    }

    internal void TransitionProcessStatus(string expectedProcessStatus, string newProcessStatus)
    {
        if (expectedProcessStatus is not (ProcessStatus.Idle or ProcessStatus.Processing))
        {
            throw new ArgumentOutOfRangeException(
                nameof(expectedProcessStatus),
                expectedProcessStatus,
                "Expected process status must be a Storage process status."
            );
        }
        if (newProcessStatus is not (ProcessStatus.Idle or ProcessStatus.Processing))
        {
            throw new ArgumentOutOfRangeException(
                nameof(newProcessStatus),
                newProcessStatus,
                "New process status must be a Storage process status."
            );
        }

        if (_stagedProcessStatusTransition is not null)
        {
            throw new InvalidOperationException("A process status transition is already staged.");
        }

        if (_instance.Process is null)
        {
            throw new InvalidOperationException(
                "Cannot stage a process status transition before the process state is initialized."
            );
        }

        _stagedProcessStatusTransition = new ProcessStatusTransition(expectedProcessStatus, newProcessStatus);
    }

    internal void HardDeleteInstance()
    {
        _stagedInstanceDeletion = true;
    }

    internal void UpdateInstanceDataValue(string key, string? value)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(key);
        _stagedInstanceDataValues[key] = value;
    }

    internal IReadOnlyDictionary<string, string?> StagedInstanceDataValues => _stagedInstanceDataValues;

    /// <summary>
    /// Captures all form data from the cache for state transport.
    /// Iterates Instance.Data, finds form data elements (via DataTypes where AppLogic.ClassRef is set),
    /// ensures each is loaded, and serializes to JSON.
    /// </summary>
    internal async Task<List<(string Id, string DataType, System.Text.Json.JsonElement Data)>> CaptureFormData(
        ModelSerializationService modelSerializationService
    )
    {
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
        get { return _abandonIssues.AsReadOnly(); }
    }

    public bool HasAbandonIssues
    {
        get { return _abandonIssues.Count > 0; }
    }

    public void AbandonAllChanges(IEnumerable<ValidationIssue> validationIssues)
    {
        _abandonIssues.AddRange(validationIssues);
        if (_abandonIssues.Count == 0)
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

    internal async Task SaveChanges(DataElementChanges changes)
    {
        using var activity = _telemetry?.StartSaveChanges(changes);
        await SaveAggregate(
            changes,
            workflowOwned: false,
            _defaultAuthenticationMethod,
            GetTaskBoundWritePreconditions(),
            expectedProcessStatus: null,
            CancellationToken.None
        );
    }

    internal async Task<WorkflowAggregateSaveOutcome> SaveWorkflowOwnedAggregate(
        DataElementChanges changes,
        string idempotencyKey,
        CancellationToken cancellationToken
    )
    {
        if (string.IsNullOrWhiteSpace(idempotencyKey))
        {
            throw new InvalidOperationException("Workflow-owned aggregate save requires an idempotency key.");
        }

        WorkflowAggregateSaveOutcome outcome = await SaveAggregate(
            changes,
            workflowOwned: true,
            StorageAuthenticationMethod.ServiceOwner(),
            GetWorkflowOwnedWritePreconditions(_storageVersions, idempotencyKey),
            expectedProcessStatus: _stagedProcessStatusTransition?.ExpectedProcessStatus ?? ProcessStatus.Processing,
            cancellationToken
        );

        if (outcome == WorkflowAggregateSaveOutcome.Saved)
        {
            // The updated state blob is captured from this unit of work after the save; committed
            // changes must not linger as pending or the next callback would recommit them. User
            // saves deliberately do NOT clear: the validation flow re-derives the changes after
            // SaveChanges to verify validators did not mutate data.
            ClearTrackedChanges();
        }
        return outcome;
    }

    private async Task<WorkflowAggregateSaveOutcome> SaveAggregate(
        DataElementChanges changes,
        bool workflowOwned,
        StorageAuthenticationMethod defaultAuthenticationMethod,
        StorageWritePreconditions preconditions,
        string? expectedProcessStatus,
        CancellationToken cancellationToken
    )
    {
        ValidateCanSaveChangesOrThrow(workflowOwned);

        var mutationPlan = BuildAggregateMutationPlan(changes);
        mutationPlan.Request.ExpectedProcessStatus = expectedProcessStatus;
        ApplyStagedProcessState(mutationPlan.Request);
        ApplyStagedInstanceDeletion(mutationPlan.Request);
        ApplyStagedInstanceDataValues(mutationPlan.Request);
        if (!mutationPlan.HasMutations)
        {
            return WorkflowAggregateSaveOutcome.NothingToSave;
        }

        if (preconditions.IdempotencyKey is not null && preconditions.InstanceVersion is null)
        {
            throw new InvalidOperationException("Workflow-owned aggregate save requires a captured instance version.");
        }

        // MutateProcessState can move the callback snapshot ahead of Storage before CommitProcessState.
        // Data-only callback saves must retain that in-memory process state for the next signed callback
        // instead of replacing it with Storage's still-durable source task. For user-facing saves the
        // in-memory process state matches Storage, so the preserved snapshot is content-equal.
        ProcessState? processSnapshot = mutationPlan.Request.ProcessState?.State is null ? Instance.Process : null;

        StorageAuthenticationMethod authenticationMethod = ResolveAggregateAuthenticationMethod(
            mutationPlan.AuthenticationMethods,
            defaultAuthenticationMethod
        );

        InstanceMutationWithStorageMetadata result;
        try
        {
            result = await _mutationClient.CommitInstanceMutationWithStorageMetadata(
                _instanceOwnerPartyId,
                _instanceGuid,
                mutationPlan.Request,
                mutationPlan.ContentParts,
                authenticationMethod,
                preconditions,
                cancellationToken
            );
        }
        catch (PlatformHttpException exception)
            when (exception.Response.StatusCode == System.Net.HttpStatusCode.PreconditionFailed)
        {
            throw new InstanceDataStaleException(exception);
        }

        // Replay can only occur for preconditions carrying an idempotency key (workflow-owned saves).
        if (result.Replayed)
        {
            await RebuildFromStorageAfterReplay(cancellationToken);
            if (processSnapshot is not null)
            {
                processSnapshot.Status = Instance.Process?.Status;
                Instance.Process = processSnapshot;
            }
            throw new InstanceMutationReplayedException(
                "Storage replayed the workflow-owned instance mutation. The unit of work has been rebuilt from Storage state."
            );
        }

        ApplyAggregateMutationResult(changes, mutationPlan, result);
        if (processSnapshot is not null)
        {
            processSnapshot.Status = Instance.Process?.Status;
            Instance.Process = processSnapshot;
        }
        ClearStagedInstanceMutations();
        return WorkflowAggregateSaveOutcome.Saved;
    }

    private void ValidateCanSaveChangesOrThrow(bool workflowOwned)
    {
        if (_abandonIssues.Count > 0)
        {
            throw new InvalidOperationException("AbandonAllChanges has been called, and no changes should be saved");
        }
        if (_instanceOwnerPartyId == 0 || _instanceGuid == Guid.Empty)
        {
            throw new InvalidOperationException("Cannot access instance data before it has been created");
        }
        if (workflowOwned)
        {
            return;
        }
        if (!ProcessStatusHelper.IsIdle(_instance))
        {
            throw new InvalidOperationException(
                $"Cannot save user-facing instance changes while process status is '{_instance.Process?.Status}'."
            );
        }
        if (
            _stagedProcessStateChange is not null
            || _stagedProcessStatusTransition is not null
            || _stagedInstanceDeletion
        )
        {
            throw new InvalidOperationException(
                "Staged workflow-owned instance mutations can only be committed through SaveWorkflowOwnedAggregate."
            );
        }
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
        var authenticationMethods = new List<StorageAuthenticationMethod>();

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
                            ExpectedCurrentBlobVersion = GetDataElementBlobVersionId(change.DataElementIdentifier),
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
        // Storage carries the status inside the process payload, and a process update replaces the whole
        // process object, so a status-only transition rides an update synthesized from the in-memory
        // process. Every workflow-owned process update is therefore authoritative for the entire process
        // shape, which the instance and process state version preconditions make safe.
        ProcessState? state =
            _stagedProcessStateChange?.NewProcessState?.Copy()
            ?? (_stagedProcessStatusTransition is null ? null : _instance.Process?.Copy());
        if (state is null)
        {
            return;
        }

        state.Status = _stagedProcessStatusTransition?.NewProcessStatus ?? ProcessStatus.Processing;
        request.ProcessState = new StorageInstanceMutationProcessStateUpdate
        {
            State = state,
            Events = _stagedProcessStateChange?.Events ?? [],
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

    private void ApplyStagedInstanceDataValues(StorageInstanceMutationRequest request)
    {
        foreach (var (key, value) in _stagedInstanceDataValues)
        {
            request.DataValues[key] = value;
        }
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
        _storageVersions = freshInstance.Metadata;
        ClearAttemptLocalState();
    }

    private AppIdentifier GetAppIdentifierForStorageLookup()
    {
        string appId = !string.IsNullOrWhiteSpace(_instance.AppId) ? _instance.AppId : _appMetadata.Id;
        return new AppIdentifier(appId);
    }

    private void ClearStagedInstanceMutations()
    {
        _stagedProcessStateChange = null;
        _stagedProcessStatusTransition = null;
        _stagedInstanceDeletion = false;
        _stagedInstanceDataValues.Clear();
    }

    private void ClearCommittedAggregateState()
    {
        ClearTrackedChanges();
        ClearStagedInstanceMutations();
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
        ICollection<StorageAuthenticationMethod> authenticationMethods
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
        ICollection<StorageAuthenticationMethod> authenticationMethods
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

    private string? GetDataElementBlobVersionId(DataElementIdentifier dataElementIdentifier)
    {
        string? blobVersionId = GetDataElement(dataElementIdentifier).BlobVersionId;
        return string.IsNullOrEmpty(blobVersionId) ? null : blobVersionId;
    }

    private void ApplyAggregateMutationResult(
        DataElementChanges changes,
        AggregateMutationPlan mutationPlan,
        InstanceMutationWithStorageMetadata result
    )
    {
        var previousBlobVersionIds = Instance.Data.ToDictionary(
            dataElement => Guid.Parse(dataElement.Id),
            dataElement => dataElement.BlobVersionId
        );
        var contentWrittenDataElementIds = result.CreatedDataElementIds.ToHashSet();
        foreach (
            StorageInstanceMutationUpdateDataElement update in mutationPlan.Request.UpdateDataElements.Where(update =>
                update.ContentPartName is not null
            )
        )
        {
            contentWrittenDataElementIds.Add(update.DataElementId);
        }

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

        foreach (DataElement dataElement in Instance.Data)
        {
            DataElementIdentifier dataElementIdentifier = dataElement;
            if (
                previousBlobVersionIds.Remove(dataElementIdentifier.Guid, out string? previousBlobVersionId)
                && !contentWrittenDataElementIds.Contains(dataElementIdentifier.Guid)
                && !StringComparer.Ordinal.Equals(previousBlobVersionId, dataElement.BlobVersionId)
            )
            {
                _formDataCache.Remove(dataElementIdentifier);
                _binaryCache.Remove(dataElementIdentifier);
            }
        }

        foreach (Guid dataElementId in previousBlobVersionIds.Keys)
        {
            var dataElementIdentifier = new DataElementIdentifier(dataElementId);
            _formDataCache.Remove(dataElementIdentifier);
            _binaryCache.Remove(dataElementIdentifier);
        }

        foreach (DataElementIdentifier dataElementIdentifier in mutationPlan.LockStatusDataElementIdentifiers)
        {
            _pendingDataElementLockStatuses.TryRemove(dataElementIdentifier, out _);
        }

        foreach (string dataTypeId in mutationPlan.LockStatusDataTypeIds)
        {
            _pendingDataTypeLockStatuses.TryRemove(dataTypeId, out _);
        }

        _storageVersions = result.Metadata;
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
    }

    private static StorageAuthenticationMethod ResolveAggregateAuthenticationMethod(
        IReadOnlyCollection<StorageAuthenticationMethod> methods,
        StorageAuthenticationMethod defaultMethod
    )
    {
        StorageAuthenticationMethod? currentUserMethod = null;
        StorageAuthenticationMethod? serviceOwnerMethod = null;
        StorageAuthenticationMethod? customMethod = null;
        string[]? firstServiceOwnerScopes = null;
        Func<Task<JwtToken>>? customTokenProvider = null;
        bool hasServiceOwnerVariants = false;
        bool hasDifferentCustomProviders = false;
        var additionalServiceOwnerScopes = new SortedSet<string>(StringComparer.Ordinal);
        var defaultServiceOwnerScopes = new HashSet<string>(
            ((AuthenticationMethod.AltinnToken)AuthenticationMethod.ServiceOwner()).Scopes,
            StringComparer.Ordinal
        );

        foreach (StorageAuthenticationMethod method in methods)
        {
            switch (method.Request)
            {
                case AuthenticationMethod.UserToken:
                    currentUserMethod ??= method;
                    break;
                case AuthenticationMethod.AltinnToken serviceOwner:
                    serviceOwnerMethod ??= method;
                    if (firstServiceOwnerScopes is null)
                    {
                        firstServiceOwnerScopes = serviceOwner.Scopes;
                    }
                    else if (!firstServiceOwnerScopes.SequenceEqual(serviceOwner.Scopes, StringComparer.Ordinal))
                    {
                        hasServiceOwnerVariants = true;
                    }

                    foreach (string scope in serviceOwner.Scopes)
                    {
                        if (!defaultServiceOwnerScopes.Contains(scope))
                        {
                            additionalServiceOwnerScopes.Add(scope);
                        }
                    }
                    break;
                case AuthenticationMethod.CustomToken custom:
                    customMethod ??= method;
                    if (customTokenProvider is null)
                    {
                        customTokenProvider = custom.TokenProvider;
                    }
                    else if (!customTokenProvider.Equals(custom.TokenProvider))
                    {
                        hasDifferentCustomProviders = true;
                    }
                    break;
                default:
                    throw new InvalidOperationException(
                        $"Unsupported aggregate Storage authentication method {method.Request.GetType().Name}."
                    );
            }
        }

        if (
            customMethod is not null
            && (currentUserMethod is not null || serviceOwnerMethod is not null || hasDifferentCustomProviders)
        )
        {
            throw new InvalidOperationException(
                "Aggregate Storage mutations cannot combine Custom authentication with another authentication method or provider."
            );
        }

        if (currentUserMethod is not null && serviceOwnerMethod is not null)
        {
            throw new InvalidOperationException(
                "Aggregate Storage mutations cannot combine CurrentUser and ServiceOwner authentication methods."
            );
        }

        if (customMethod is not null)
        {
            return customMethod;
        }

        if (serviceOwnerMethod is not null)
        {
            return hasServiceOwnerVariants
                ? StorageAuthenticationMethod.ServiceOwner([.. additionalServiceOwnerScopes])
                : serviceOwnerMethod;
        }

        return currentUserMethod ?? defaultMethod;
    }

    private sealed record AggregateMutationPlan(
        StorageInstanceMutationRequest Request,
        IReadOnlyDictionary<string, StorageInstanceMutationContent> ContentParts,
        IReadOnlyList<DataElementChange> CreatedChanges,
        IReadOnlySet<DataElementIdentifier> LockStatusDataElementIdentifiers,
        IReadOnlySet<string> LockStatusDataTypeIds,
        IReadOnlyList<StorageAuthenticationMethod> AuthenticationMethods
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
    }

    private sealed record ProcessStatusTransition(string ExpectedProcessStatus, string NewProcessStatus);

    internal async Task<ReadOnlyMemory<byte>> GetPersistedBinaryData(DataElementIdentifier dataElementIdentifier)
    {
        // Verify that the data element exists on the instance
        GetDataElement(dataElementIdentifier);

        return await _binaryCache.GetOrCreate(
            dataElementIdentifier,
            async () => await GetDataBytes(dataElementIdentifier)
        );
    }

    internal async Task<ReadOnlyMemory<byte>> GetPreviousBinaryData(DataElementIdentifier dataElementIdentifier)
    {
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
        string? expectedBlobVersionId = GetDataElementBlobVersionId(dataElementIdentifier);
        try
        {
            return await _dataClient.GetDataBytesWithExpectedBlobVersionId(
                _instanceOwnerPartyId,
                _instanceGuid,
                dataElementIdentifier.Guid,
                authenticationMethod: GetAuthenticationMethod(dataElementIdentifier),
                expectedBlobVersionId: expectedBlobVersionId
            );
        }
        catch (PlatformHttpException exception)
            when (!string.IsNullOrEmpty(expectedBlobVersionId)
                && exception.Response.StatusCode == System.Net.HttpStatusCode.PreconditionFailed
            )
        {
            throw new DataElementContentConflictException(Instance.Id, dataElementIdentifier.Guid, exception);
        }
    }

    private StorageWritePreconditions GetTaskBoundWritePreconditions()
    {
        StorageVersionMetadata storageVersions = _storageVersions;
        return new StorageWritePreconditions(ProcessStateVersion: storageVersions.ProcessStateVersion);
    }

    private static StorageWritePreconditions GetWorkflowOwnedWritePreconditions(
        StorageVersionMetadata storageVersions,
        string idempotencyKey
    ) =>
        new(
            ProcessStateVersion: storageVersions.ProcessStateVersion,
            InstanceVersion: storageVersions.InstanceVersion,
            IdempotencyKey: idempotencyKey
        );

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
