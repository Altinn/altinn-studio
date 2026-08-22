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
    /// <param name="unitOfWork">The instance data this callback (or enqueue) is publishing.</param>
    /// <param name="carry">
    /// The callback's non-data bookkeeping, as restored and possibly added to by the command that just ran. Omitting
    /// it is what <em>drops</em> the carry, so every capture that continues a workflow must pass it along.
    /// </param>
    public async Task<string> CaptureState(InstanceDataUnitOfWork unitOfWork, WorkflowCallbackStateCarry? carry = null)
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
        var callbackState = new WorkflowCallbackState
        {
            Instance = unitOfWork.Instance,
            FormData = formData,
            // A concluded exchange stops traveling: the workflow this blob starts may itself open a mailbox, and a
            // blob still naming the finished one would make that mint refuse. The carry has already dropped it.
            Mailboxes = carry?.Mailboxes,
        };
        string payload = JsonSerializer.Serialize(callbackState);
        return _stateSigner.Sign(payload, SigningDomain.CallbackState);
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
    /// <returns>
    /// The instance data this callback acts on, and the non-data bookkeeping it must hand back to
    /// <see cref="CaptureState"/> so the steps after it still see it.
    /// </returns>
    public async Task<RestoredWorkflowCallbackState> RestoreState(
        InstanceIdentifier expectedInstance,
        string state,
        string? language
    )
    {
        // Verify the detached HMAC signature and unwrap the inner payload before trusting any of it. A leaked
        // callback token cannot be combined with a forged/tampered blob: the inner payload is bound to a
        // secret only the app holds. Any failure (tampering, unknown/expired secret) throws and maps to 422.
        string payload = _stateSigner.Verify(state, SigningDomain.CallbackState);

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

        return new RestoredWorkflowCallbackState(unitOfWork, new WorkflowCallbackStateCarry(callbackState));
    }
}

/// <summary>
/// What a callback's state blob restores into: the instance data as a unit of work, plus the non-data
/// bookkeeping the blob was carrying. Both halves must reach
/// <see cref="WorkflowCallbackStateService.CaptureState"/> for the next step to see them.
/// </summary>
internal sealed record RestoredWorkflowCallbackState(
    InstanceDataUnitOfWork UnitOfWork,
    WorkflowCallbackStateCarry Carry
);
