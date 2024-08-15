using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Result;
using Altinn.Platform.Storage.Interface.Models;
using Json.Patch;
using static Altinn.App.Core.Features.Telemetry;

namespace Altinn.App.Core.Internal.Patch;

/// <summary>
/// Service for applying patches to form data elements
/// </summary>
internal class PatchService : IPatchService
{
    private readonly IAppMetadata _appMetadata;
    private readonly IDataClient _dataClient;
    private readonly IAppModel _appModel;
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
        IAppModel appModel,
        Telemetry? telemetry = null
    )
    {
        _appMetadata = appMetadata;
        _dataClient = dataClient;
        _validationService = validationService;
        _dataProcessors = dataProcessors;
        _appModel = appModel;
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

        var dataAccessor = new CachedInstanceDataAccessor(instance, _dataClient, _appMetadata, _appModel);
        var changes = new List<DataElementChange>();

        foreach (var (dataElementId, jsonPatch) in patches)
        {
            var dataElement = instance.Data.Find(d => d.Id == dataElementId.ToString());
            if (dataElement is null)
            {
                return new DataPatchError()
                {
                    Title = "Unknown data element to patch",
                    Detail = $"Data element with id {dataElementId} not found in instance",
                };
            }

            var oldModel = await dataAccessor.Get(dataElement);
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

            foreach (var dataProcessor in _dataProcessors)
            {
                using var processWriteActivity = _telemetry?.StartDataProcessWriteActivity(dataProcessor);
                try
                {
                    // TODO: Create new dataProcessor interface that takes multiple models at the same time.
                    await dataProcessor.ProcessDataWrite(instance, dataElementId, newModel, oldModel, language);
                }
                catch (Exception e)
                {
                    processWriteActivity?.Errored(e);
                    throw;
                }
            }
            ObjectUtils.InitializeAltinnRowId(newModel);
            ObjectUtils.PrepareModelForXmlStorage(newModel);
            changes.Add(
                new DataElementChange
                {
                    DataElement = dataElement,
                    PreviousValue = oldModel,
                    CurrentValue = newModel,
                }
            );

            // save form data to storage
            await _dataClient.UpdateData(
                newModel,
                instanceIdentifier.InstanceGuid,
                newModel.GetType(),
                appIdentifier.Org,
                appIdentifier.App,
                instanceIdentifier.InstanceOwnerPartyId,
                dataElementId
            );

            // Ensure that validation runs on the modified model.
            dataAccessor.Set(dataElement, newModel);
        }

        var validationIssues = await _validationService.ValidateIncrementalFormData(
            instance,
            instance.Process.CurrentTask.ElementId,
            changes,
            dataAccessor,
            ignoredValidators,
            language
        );

        return new DataPatchResult
        {
            NewDataModels = changes.ToDictionary(c => Guid.Parse(c.DataElement.Id), c => c.CurrentValue),
            ValidationIssues = validationIssues
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
