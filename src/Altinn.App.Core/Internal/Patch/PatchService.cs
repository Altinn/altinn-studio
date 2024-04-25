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

namespace Altinn.App.Core.Internal.Patch;

/// <summary>
/// Service for applying patches to form data elements
/// </summary>
public class PatchService : IPatchService
{
    private readonly IAppMetadata _appMetadata;
    private readonly IDataClient _dataClient;
    private readonly IAppModel _appModel;
    private readonly IValidationService _validationService;
    private readonly IEnumerable<IDataProcessor> _dataProcessors;

    private static readonly JsonSerializerOptions _jsonSerializerOptions =
        new() { UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow, PropertyNameCaseInsensitive = true, };

    /// <summary>
    /// Creates a new instance of the <see cref="PatchService"/> class
    /// </summary>
    /// <param name="appMetadata"></param>
    /// <param name="dataClient"></param>
    /// <param name="validationService"></param>
    /// <param name="dataProcessors"></param>
    /// <param name="appModel"></param>
    public PatchService(
        IAppMetadata appMetadata,
        IDataClient dataClient,
        IValidationService validationService,
        IEnumerable<IDataProcessor> dataProcessors,
        IAppModel appModel
    )
    {
        _appMetadata = appMetadata;
        _dataClient = dataClient;
        _validationService = validationService;
        _dataProcessors = dataProcessors;
        _appModel = appModel;
    }

    /// <inheritdoc />
    public async Task<ServiceResult<DataPatchResult, DataPatchError>> ApplyPatch(
        Instance instance,
        DataType dataType,
        DataElement dataElement,
        JsonPatch jsonPatch,
        string? language,
        List<string>? ignoredValidators = null
    )
    {
        InstanceIdentifier instanceIdentifier = new InstanceIdentifier(instance);
        AppIdentifier appIdentifier = (await _appMetadata.GetApplicationMetadata()).AppIdentifier;
        var modelType = _appModel.GetModelType(dataType.AppLogic.ClassRef);
        var oldModel = await _dataClient.GetFormData(
            instanceIdentifier.InstanceGuid,
            modelType,
            appIdentifier.Org,
            appIdentifier.App,
            instanceIdentifier.InstanceOwnerPartyId,
            Guid.Parse(dataElement.Id)
        );
        var oldModelNode = JsonSerializer.SerializeToNode(oldModel);
        var patchResult = jsonPatch.Apply(oldModelNode);
        if (!patchResult.IsSuccess)
        {
            bool testOperationFailed = patchResult.Error!.Contains("is not equal to the indicated value.");
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

        var result = DeserializeModel(oldModel.GetType(), patchResult.Result!);
        if (!result.Success)
        {
            return new DataPatchError()
            {
                Title = "Patch operation did not deserialize",
                Detail = result.Error,
                ErrorType = DataPatchErrorType.DeserializationFailed
            };
        }
        Guid dataElementId = Guid.Parse(dataElement.Id);
        foreach (var dataProcessor in _dataProcessors)
        {
            await dataProcessor.ProcessDataWrite(instance, dataElementId, result.Ok, oldModel, language);
        }

        // Ensure that all lists are changed from null to empty list.
        ObjectUtils.InitializeAltinnRowId(result.Ok);

        var validationIssues = await _validationService.ValidateFormData(
            instance,
            dataElement,
            dataType,
            result.Ok,
            oldModel,
            ignoredValidators,
            language
        );

        // Save Formdata to database
        await _dataClient.UpdateData(
            result.Ok,
            instanceIdentifier.InstanceGuid,
            modelType,
            appIdentifier.Org,
            appIdentifier.App,
            instanceIdentifier.InstanceOwnerPartyId,
            dataElementId
        );

        return new DataPatchResult { NewDataModel = result.Ok, ValidationIssues = validationIssues };
    }

    private static ServiceResult<object, string> DeserializeModel(Type type, JsonNode patchResult)
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
