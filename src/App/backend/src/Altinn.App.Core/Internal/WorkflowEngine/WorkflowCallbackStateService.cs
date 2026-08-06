using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// Service for capturing and restoring workflow callback state for transport between app and workflow engine.
/// </summary>
internal sealed class WorkflowCallbackStateService
{
    private readonly InstanceDataUnitOfWorkInitializer _unitOfWorkInitializer;
    private readonly ModelSerializationService _modelSerializationService;
    private readonly IAppMetadata _appMetadata;
    private readonly IAppModel _appModel;
    private readonly WorkflowStateSigner _stateSigner;

    public WorkflowCallbackStateService(
        InstanceDataUnitOfWorkInitializer unitOfWorkInitializer,
        ModelSerializationService modelSerializationService,
        IAppMetadata appMetadata,
        IAppModel appModel,
        WorkflowStateSigner stateSigner
    )
    {
        _unitOfWorkInitializer = unitOfWorkInitializer;
        _modelSerializationService = modelSerializationService;
        _appMetadata = appMetadata;
        _appModel = appModel;
        _stateSigner = stateSigner;
    }

    /// <summary>
    /// Captures the current state of the unit of work into an opaque, signed string for transport.
    /// </summary>
    public async Task<string> CaptureState(InstanceDataUnitOfWork unitOfWork)
    {
        StorageVersionMetadata storageVersions = unitOfWork.StorageVersions;
        if (
            storageVersions.InstanceVersion is not { } instanceVersion
            || storageVersions.ProcessStateVersion is not { } processStateVersion
        )
        {
            throw new InvalidOperationException(
                $"Cannot capture workflow callback state for instance '{unitOfWork.Instance.Id}' without complete Storage versions (instanceVersion: {(storageVersions.InstanceVersion is null ? "missing" : "present")}, processStateVersion: {(storageVersions.ProcessStateVersion is null ? "missing" : "present")})."
            );
        }

        var rawFormData = await unitOfWork.CaptureFormData(_modelSerializationService);
        var formData = rawFormData
            .Select(x => new FormDataEntry
            {
                Id = x.Id,
                DataType = x.DataType,
                Data = x.Data,
            })
            .ToList();
        var callbackState = new WorkflowCallbackState
        {
            Instance = unitOfWork.Instance,
            InstanceVersion = instanceVersion,
            ProcessStateVersion = processStateVersion,
            FormData = formData,
        };

        string payload = JsonSerializer.Serialize(callbackState);
        return _stateSigner.Sign(payload);
    }

    /// <summary>
    /// Restores workflow callback state from a previously captured state string.
    /// </summary>
    /// <param name="expectedInstance">
    /// The instance the caller is authorized to act on (from the callback route). The restored state blob
    /// must target this same instance.
    /// </param>
    /// <param name="state">The opaque state blob captured at enqueue time.</param>
    /// <param name="language">The actor language to initialize the unit of work with.</param>
    public async Task<InstanceDataUnitOfWork> RestoreState(
        InstanceIdentifier expectedInstance,
        string state,
        string? language
    )
    {
        // Verify the detached HMAC signature and unwrap the inner payload before trusting any of it. A leaked
        // callback token cannot be combined with a forged/tampered blob: the inner payload is bound to a
        // secret only the app holds. Any failure (tampering, unknown/expired secret) throws and maps to 422.
        string payload = _stateSigner.Verify(state);

        WorkflowCallbackState callbackState;
        try
        {
            callbackState =
                JsonSerializer.Deserialize<WorkflowCallbackState>(payload)
                ?? throw new WorkflowCallbackStateException(
                    "Workflow callback state deserialized to null from callback payload."
                );
        }
        catch (JsonException exception)
        {
            throw new WorkflowCallbackStateException(
                "Failed to deserialize complete workflow callback state from callback payload.",
                exception
            );
        }

        Instance instance = callbackState.Instance;

        ValidateInstanceIdentity(instance, expectedInstance, "Workflow callback state");

        var versions = new StorageVersionMetadata(callbackState.InstanceVersion, callbackState.ProcessStateVersion);

        string? taskId = instance.Process?.CurrentTask?.ElementId;

        InstanceDataUnitOfWork unitOfWork = await _unitOfWorkInitializer.Init(
            instance,
            versions,
            taskId,
            language,
            StorageAuthenticationMethod.ServiceOwner()
        );

        ApplicationMetadata applicationMetadata = await _appMetadata.GetApplicationMetadata();

        foreach (FormDataEntry entry in callbackState.FormData)
        {
            DataElement? dataElement = instance.Data.Find(d => d.Id == entry.Id);
            if (dataElement is null)
                continue;

            DataType? dataType = applicationMetadata.DataTypes.Find(dt => dt.Id == dataElement.DataType);
            if (dataType?.AppLogic?.ClassRef is not { } classRef)
                continue;

            Type modelType = _appModel.GetModelType(classRef);
            byte[] jsonBytes = JsonSerializer.SerializeToUtf8Bytes(entry.Data);
            object model = _modelSerializationService.DeserializeJson(jsonBytes, modelType);
            IFormDataWrapper wrapper = FormDataWrapperFactory.Create(model, dataType, dataElement);

            (ReadOnlyMemory<byte> storageBytes, _) = _modelSerializationService.SerializeToStorage(
                model,
                dataType,
                dataElement
            );

            DataElementIdentifier identifier = dataElement;
            unitOfWork.PreloadFormData(identifier, wrapper);
            unitOfWork.PreloadBinaryData(identifier, storageBytes);
        }

        return unitOfWork;
    }

    private static void ValidateInstanceIdentity(Instance instance, InstanceIdentifier expectedInstance, string source)
    {
        if (!string.Equals(instance.Id, expectedInstance.ToString(), StringComparison.OrdinalIgnoreCase))
        {
            throw new WorkflowCallbackStateException(
                $"{source} instance '{instance.Id}' does not match expected route instance '{expectedInstance}'."
            );
        }
    }
}
