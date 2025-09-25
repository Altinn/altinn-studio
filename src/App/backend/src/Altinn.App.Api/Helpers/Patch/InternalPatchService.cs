using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using Altinn.App.Api.Extensions;
using Altinn.App.Api.Models;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Result;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Json.Patch;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Helpers.Patch;

/// <summary>
/// Service for applying patches to form data elements
/// </summary>
public class InternalPatchService
{
    private readonly IHostEnvironment _hostingEnvironment;
    private readonly InstanceDataUnitOfWorkInitializer _instanceDataUnitOfWorkInitializer;
    private readonly AppImplementationFactory _appImplementationFactory;
    private readonly Telemetry? _telemetry;
    private readonly IValidationService _validationService;

    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow,
        PropertyNameCaseInsensitive = true,
    };

    /// <summary>
    /// Creates a new instance of the <see cref="InternalPatchService"/> class
    /// </summary>
    public InternalPatchService(
        IValidationService validationService,
        IHostEnvironment hostingEnvironment,
        IServiceProvider serviceProvider,
        Telemetry? telemetry = null
    )
    {
        _validationService = validationService;
        _hostingEnvironment = hostingEnvironment;
        _instanceDataUnitOfWorkInitializer = serviceProvider.GetRequiredService<InstanceDataUnitOfWorkInitializer>();
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
        _telemetry = telemetry;
    }

    /// <summary>
    /// Applies a patch to a Form Data element
    /// </summary>
    public async Task<ServiceResult<DataPatchResult, ProblemDetails>> ApplyPatches(
        Instance instance,
        Dictionary<Guid, JsonPatch> patches,
        string? language,
        List<string>? ignoredValidators
    )
    {
        using var activity = _telemetry?.StartDataPatchActivity(instance);
        var taskId = instance.Process.CurrentTask.ElementId;

        var dataAccessor = await _instanceDataUnitOfWorkInitializer.Init(instance, taskId, language);

        List<FormDataChange> changesAfterPatch = [];

        foreach (var (dataElementGuid, jsonPatch) in patches)
        {
            var dataElement = instance.Data.Find(d => d.Id == dataElementGuid.ToString());

            if (dataElement is null)
            {
                return new ProblemDetails()
                {
                    Title = "Unknown data element to patch",
                    Detail = $"Data element with id {dataElementGuid} not found in instance",
                    Status = StatusCodes.Status404NotFound,
                };
            }

            DataElementIdentifier dataElementIdentifier = dataElement;

            var oldModel = await dataAccessor.GetFormData(dataElementIdentifier); // TODO: Fetch data in parallel
            var oldModelNode = JsonSerializer.SerializeToNode(oldModel);
            var patchResult = jsonPatch.Apply(oldModelNode);

            if (!patchResult.IsSuccess)
            {
                bool testOperationFailed = patchResult.Error.Contains("is not equal to the indicated value.");
                return new DataPatchError()
                {
                    Title = testOperationFailed ? "Precondition in patch failed" : "Patch Operation Failed",
                    Detail = patchResult.Error,
                    Type = "https://datatracker.ietf.org/doc/html/rfc6902/",
                    Status = testOperationFailed
                        ? StatusCodes.Status409Conflict
                        : StatusCodes.Status422UnprocessableEntity,
                    PreviousModel = oldModel,
                    DataElementId = dataElementGuid,
                    PatchOperationIndex = patchResult.Operation,
                };
            }

            var newModelResult = DeserializeModel(oldModel.GetType(), patchResult.Result);
            if (!newModelResult.Success)
            {
                return new ProblemDetails()
                {
                    Title = "Patch operation did not deserialize",
                    Type = "https://datatracker.ietf.org/doc/html/rfc6902/",
                    Detail = newModelResult.Error,
                    Status = StatusCodes.Status422UnprocessableEntity,
                };
            }

            var newModel = newModelResult.Ok;
            // Reset dataAccessor to provide the patched model.
            dataAccessor.SetFormData(dataElement, newModel);

            changesAfterPatch.Add(
                new FormDataChange
                {
                    Type = ChangeType.Updated,
                    DataElement = dataElement,
                    ContentType = dataElement.ContentType,
                    DataType = dataAccessor.GetDataType(dataElementIdentifier),
                    PreviousFormData = oldModel,
                    CurrentFormData = newModel,
                    PreviousBinaryData = await dataAccessor.GetBinaryData(dataElementIdentifier),
                    CurrentBinaryData = null, // Set this after DataProcessors have run
                }
            );
        }

        await RunDataProcessors(
            dataAccessor,
            new DataElementChanges(changesAfterPatch),
            taskId: instance.Process.CurrentTask.ElementId,
            language
        );

        if (dataAccessor.GetAbandonResponse() is { } abandonResponse)
        {
            return abandonResponse;
        }

        // Get all changes to data elements by comparing the serialized values
        var changes = dataAccessor.GetDataElementChanges(initializeAltinnRowId: true);
        // Start saving changes in parallel with validation
        Task saveChanges = dataAccessor.SaveChanges(changes);
        // Update instance data to reflect the changes and save created data elements
        await dataAccessor.UpdateInstanceData(changes);

        var validationIssues = await _validationService.ValidateIncrementalFormData(
            dataAccessor,
            instance.Process.CurrentTask.ElementId,
            changes,
            ignoredValidators,
            language
        );

        // don't await saving until validation is done, so that they run in parallel
        await saveChanges;

        if (_hostingEnvironment.IsDevelopment())
        {
            // Ensure that validation did not change the data elements
            dataAccessor.VerifyDataElementsUnchangedSincePreviousChanges(changes);
        }

        var formDataChanges = changes.FormDataChanges.ToList();

        // Ensure that all data elements that were patched are included in the updated data
        // (even if they were not changed or the change was reverted by dataProcessor)
        foreach (var patchedElementGuid in patches.Keys)
        {
            var patchedElementId = patchedElementGuid.ToString();
            if (formDataChanges.TrueForAll(c => c.DataElement?.Id != patchedElementId))
            {
                // The element from the patch was not included in the changes, so add it
                var dataElement = instance.Data.Find(d => d.Id == patchedElementId);
                if (dataElement is not null)
                {
                    // Create a change with the current data of the unchanged element
                    formDataChanges.Add(
                        new FormDataChange
                        {
                            Type = ChangeType.Updated,
                            DataElement = dataElement,
                            ContentType = dataElement.ContentType,
                            DataType = dataAccessor.GetDataType(dataElement),
                            PreviousFormData = await dataAccessor.GetFormData(dataElement),
                            CurrentFormData = await dataAccessor.GetFormData(dataElement),
                            PreviousBinaryData = await dataAccessor.GetBinaryData(dataElement),
                            CurrentBinaryData = await dataAccessor.GetBinaryData(dataElement),
                        }
                    );
                }
            }
        }

        return new DataPatchResult
        {
            Instance = instance,
            FormDataChanges = new DataElementChanges(formDataChanges),
            ValidationIssues = validationIssues,
        };
    }

    /// <summary>
    /// Runs incremental validation on the changes.
    /// </summary>
    public async Task<List<ValidationSourcePair>> RunIncrementalValidation(
        IInstanceDataAccessor dataAccessor,
        string taskId,
        DataElementChanges changes,
        List<string>? ignoredValidators,
        string? language
    )
    {
        return await _validationService.ValidateIncrementalFormData(
            dataAccessor,
            taskId,
            changes,
            ignoredValidators,
            language
        );
    }

    /// <summary>
    /// Runs <see cref="IDataProcessor.ProcessDataWrite"/> and <see cref="IDataWriteProcessor.ProcessDataWrite"/> on the changes.
    /// </summary>
    public async Task RunDataProcessors(
        IInstanceDataMutator dataMutator,
        DataElementChanges changes,
        string taskId,
        string? language
    )
    {
        var dataProcessors = _appImplementationFactory.GetAll<IDataProcessor>();
        foreach (var dataProcessor in dataProcessors)
        {
            foreach (var change in changes.FormDataChanges)
            {
                if (change.Type != ChangeType.Updated)
                {
                    // Don't run IDataProcessor on created or deleted data elements for backwards compatibility
                    continue;
                }
                using var processWriteActivity = _telemetry?.StartDataProcessWriteActivity(dataProcessor);
                try
                {
                    await dataProcessor.ProcessDataWrite(
                        dataMutator.Instance,
                        change.DataElementIdentifier.Guid,
                        change.CurrentFormData,
                        change.PreviousFormData,
                        language
                    );
                }
                catch (Exception e)
                {
                    processWriteActivity?.Errored(e);
                    throw;
                }
            }
        }

        var dataWriteProcessors = _appImplementationFactory.GetAll<IDataWriteProcessor>();
        foreach (var dataWriteProcessor in dataWriteProcessors)
        {
            using var processWriteActivity = _telemetry?.StartDataProcessWriteActivity(dataWriteProcessor);
            try
            {
                await dataWriteProcessor.ProcessDataWrite(dataMutator, taskId, changes, language);
            }
            catch (Exception e)
            {
                processWriteActivity?.Errored(e);
                throw;
            }
        }
    }

    private static ServiceResult<object, string> DeserializeModel(Type type, JsonNode? patchResult)
    {
        try
        {
            var model = patchResult.Deserialize(type, _jsonSerializerOptions);
            if (model is null)
            {
                return "Deserialize patched model returned null";
            }

            return model;
        }
        catch (JsonException e) when (e.Message.Contains("could not be mapped to any .NET member contained in type"))
        {
            // Give better feedback when the issue is that the patch contains a path that does not exist in the model
            return e.Message;
        }
    }
}
