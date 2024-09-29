using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Result;
using Altinn.Platform.Storage.Interface.Models;
using Json.Patch;

namespace Altinn.App.Core.Internal.Patch;

/// <summary>
/// Service for applying patches to form data elements
/// </summary>
internal class PatchService : IPatchService
{
    private readonly IAppMetadata _appMetadata;
    private readonly IDataClient _dataClient;
    private readonly ModelSerializationService _modelSerializationService;
    private readonly Telemetry? _telemetry;
    private readonly IValidationService _validationService;
    private readonly IEnumerable<IDataProcessor> _dataProcessors;

    private static readonly JsonSerializerOptions _jsonSerializerOptions =
        new() { UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow, PropertyNameCaseInsensitive = true, };

    /// <summary>
    /// Creates a new instance of the <see cref="PatchService"/> class
    /// </summary>
    public PatchService(
        IAppMetadata appMetadata,
        IDataClient dataClient,
        IValidationService validationService,
        IEnumerable<IDataProcessor> dataProcessors,
        ModelSerializationService modelSerializationService,
        Telemetry? telemetry = null
    )
    {
        _appMetadata = appMetadata;
        _dataClient = dataClient;
        _validationService = validationService;
        _dataProcessors = dataProcessors;
        _modelSerializationService = modelSerializationService;
        _telemetry = telemetry;
    }

    /// <inheritdoc />
    public async Task<ServiceResult<DataPatchResult, DataPatchError>> ApplyPatches(
        Instance instance,
        Dictionary<Guid, JsonPatch> patches,
        string? language,
        List<string>? ignoredValidators
    )
    {
        using var activity = _telemetry?.StartDataPatchActivity(instance);

        InstanceIdentifier instanceIdentifier = new(instance);
        AppIdentifier appIdentifier = (await _appMetadata.GetApplicationMetadata()).AppIdentifier;

        var dataAccessor = new CachedInstanceDataAccessor(
            instance,
            _dataClient,
            _appMetadata,
            _modelSerializationService
        );

        List<DataElementChange> changesAfterPatch = new();

        foreach (var (dataElementGuid, jsonPatch) in patches)
        {
            var dataElement = instance.Data.Find(d => d.Id == dataElementGuid.ToString());

            if (dataElement is null)
            {
                return new DataPatchError()
                {
                    Title = "Unknown data element to patch",
                    Detail = $"Data element with id {dataElementGuid} not found in instance",
                };
            }
            DataElementId dataElementId = dataElement;

            var oldModel = await dataAccessor.GetFormData(dataElementId); // TODO: Fetch data in parallel
            var oldModelNode = JsonSerializer.SerializeToNode(oldModel);
            var patchResult = jsonPatch.Apply(oldModelNode);

            if (!patchResult.IsSuccess)
            {
                bool testOperationFailed = patchResult.Error.Contains("is not equal to the indicated value.");
                return new DataPatchError()
                {
                    Title = testOperationFailed ? "Precondition in patch failed" : "Patch Operation Failed",
                    Detail = patchResult.Error,
                    ErrorType = testOperationFailed
                        ? DataPatchErrorType.PatchTestFailed
                        : DataPatchErrorType.DeserializationFailed,
                    Extensions = new Dictionary<string, object?>()
                    {
                        { "previousModel", oldModel },
                        { "patchOperationIndex", patchResult.Operation },
                    }
                };
            }

            var newModelResult = DeserializeModel(oldModel.GetType(), patchResult.Result);
            if (!newModelResult.Success)
            {
                return new DataPatchError()
                {
                    Title = "Patch operation did not deserialize",
                    Detail = newModelResult.Error,
                    ErrorType = DataPatchErrorType.DeserializationFailed
                };
            }
            var newModel = newModelResult.Ok;
            // Reset dataAccessor to provide the patched model.
            dataAccessor.SetFormData(dataElement, newModel);

            changesAfterPatch.Add(
                new DataElementChange
                {
                    DataElement = dataElementId,
                    PreviousFormData = oldModel,
                    CurrentFormData = newModel
                }
            );
        }

        foreach (var dataProcessor in _dataProcessors)
        {
            foreach (var change in changesAfterPatch)
            {
                using var processWriteActivity = _telemetry?.StartDataProcessWriteActivity(dataProcessor);
                try
                {
                    // TODO: Create new dataProcessor interface that takes multiple models at the same time.
                    await dataProcessor.ProcessDataWrite(
                        instance,
                        change.DataElement.Guid,
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

        // Get all changes to data elements by comparing the serialized values
        var changes = dataAccessor.GetDataElementChanges();
        // Start saving changes in parallel with validation
        Task saveChanges = dataAccessor.SaveChanges(changes, initializeRowId: true);
        // Update instance data to reflect the changes and save created data elements
        await dataAccessor.UpdateInstanceData();

        var validationIssues = await _validationService.ValidateIncrementalFormData(
            instance,
            dataAccessor,
            instance.Process.CurrentTask.ElementId,
            changes,
            ignoredValidators,
            language
        );

        // don't await saving until validation is done, so that they run in parallel
        await saveChanges;

        if (true) // TODO: only run in development mode
        {
            // Ensure that validation did not change the data elements
            dataAccessor.VerifyDataElementsUnchanged();
        }

        var updatedData = changes.ToDictionary(
            d => d.DataElement.Guid,
            d =>
                d.CurrentFormData
                ?? throw new InvalidOperationException("Data element has app logic but no current value")
        );
        // Ensure that all data elements that were patched are included in the updated data
        // (even if they were not changed or the change was reverted by dataProcessor)
        foreach (var patchedElementGuid in patches.Keys.Where(g => !updatedData.ContainsKey(g)))
        {
            var dataElement =
                instance.Data.Find(d => d.Id == patchedElementGuid.ToString())
                ?? throw new InvalidOperationException("Data element not found in instance");
            updatedData.Add(patchedElementGuid, dataAccessor.GetFormData(dataElement));
        }

        return new DataPatchResult
        {
            ChangedDataElements = changes,
            UpdatedData = updatedData,
            ValidationIssues = validationIssues,
        };
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
