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

    public WorkflowCallbackStateService(
        InstanceDataUnitOfWorkInitializer unitOfWorkInitializer,
        ModelSerializationService modelSerializationService,
        IAppMetadata appMetadata,
        IAppModel appModel
    )
    {
        _unitOfWorkInitializer = unitOfWorkInitializer;
        _modelSerializationService = modelSerializationService;
        _appMetadata = appMetadata;
        _appModel = appModel;
    }

    /// <summary>
    /// Captures the current state of the unit of work into an opaque string for transport.
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
        return JsonSerializer.Serialize(callbackState);
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
        WorkflowCallbackState callbackState =
            JsonSerializer.Deserialize<WorkflowCallbackState>(state)
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

        return unitOfWork;
    }
}
