using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
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
        var rawFormData = await unitOfWork.CaptureFormData(_modelSerializationService);
        var formData = rawFormData
            .Select(x => new FormDataEntry
            {
                Id = x.Id,
                DataType = x.DataType,
                Data = x.Data,
            })
            .ToList();
        var callbackState = new WorkflowCallbackState { Instance = unitOfWork.Instance, FormData = formData };
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
    /// <param name="idempotencyKey">
    /// Optional retry-stable key for the current callback (the engine's step idempotency key). When provided, data
    /// elements created during the callback are tagged so Storage dedupes inserts, making the at-least-once callback
    /// safe to replay. Null disables idempotent creates (behaves as a normal data write).
    /// </param>
    public async Task<InstanceDataUnitOfWork> RestoreState(
        InstanceIdentifier expectedInstance,
        string state,
        string? language,
        string? idempotencyKey = null
    )
    {
        // Verify the detached HMAC signature and unwrap the inner payload before trusting any of it. A leaked
        // callback token cannot be combined with a forged/tampered blob: the inner payload is bound to a
        // secret only the app holds. Any failure (tampering, unknown/expired secret) throws and maps to 422.
        string payload = _stateSigner.Verify(state);

        WorkflowCallbackState callbackState =
            JsonSerializer.Deserialize<WorkflowCallbackState>(payload)
            ?? throw new WorkflowCallbackStateException(
                "Failed to deserialize workflow callback state from callback payload"
            );

        Instance instance = callbackState.Instance;

        // Assert that the decoded instance object has the expected id
        if (!string.Equals(instance.Id, expectedInstance.ToString(), StringComparison.OrdinalIgnoreCase))
        {
            throw new WorkflowCallbackStateException(
                $"Workflow callback state instance '{instance.Id}' does not match the expected route instance '{expectedInstance}'."
            );
        }

        string? taskId = instance.Process?.CurrentTask?.ElementId;

        InstanceDataUnitOfWork unitOfWork = await _unitOfWorkInitializer.Init(
            instance,
            taskId,
            language,
            StorageAuthenticationMethod.ServiceOwner()
        );

        // Enable idempotent data element creation so a replayed callback (the engine delivers at-least-once) cannot
        // create duplicate form data. The key is stable across retries of the same step.
        if (!string.IsNullOrEmpty(idempotencyKey))
        {
            unitOfWork.UseIdempotentCreates(idempotencyKey);
        }

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
}
