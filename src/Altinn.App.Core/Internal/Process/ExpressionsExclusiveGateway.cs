using System.Text;
using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Expressions;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process;

/// <summary>
/// Class implementing <see cref="IProcessExclusiveGateway" /> for evaluating expressions on flows connected to a gateway
/// </summary>
public class ExpressionsExclusiveGateway : IProcessExclusiveGateway
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions =
        new()
        {
            AllowTrailingCommas = true,
            ReadCommentHandling = JsonCommentHandling.Skip,
            PropertyNameCaseInsensitive = true,
        };

    private static readonly JsonSerializerOptions _jsonSerializerOptionsCamelCase =
        new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    private readonly LayoutEvaluatorStateInitializer _layoutStateInit;
    private readonly IAppResources _resources;
    private readonly IAppMetadata _appMetadata;
    private readonly IDataClient _dataClient;
    private readonly IAppModel _appModel;

    /// <summary>
    /// Constructor for <see cref="ExpressionsExclusiveGateway" />
    /// </summary>
    /// <param name="layoutEvaluatorStateInitializer">Expressions state initalizer used to create context for expression evaluation</param>
    /// <param name="resources">Service for fetching app resources</param>
    /// <param name="appModel">Service for fetching app model</param>
    /// <param name="appMetadata">Service for fetching app metadata</param>
    /// <param name="dataClient">Service for interacting with Platform Storage</param>
    public ExpressionsExclusiveGateway(
        LayoutEvaluatorStateInitializer layoutEvaluatorStateInitializer,
        IAppResources resources,
        IAppModel appModel,
        IAppMetadata appMetadata,
        IDataClient dataClient
    )
    {
        _layoutStateInit = layoutEvaluatorStateInitializer;
        _resources = resources;
        _appMetadata = appMetadata;
        _dataClient = dataClient;
        _appModel = appModel;
    }

    /// <inheritdoc />
    public string GatewayId { get; } = "AltinnExpressionsExclusiveGateway";

    /// <inheritdoc />
    public async Task<List<SequenceFlow>> FilterAsync(
        List<SequenceFlow> outgoingFlows,
        Instance instance,
        ProcessGatewayInformation processGatewayInformation
    )
    {
        var state = await GetLayoutEvaluatorState(
            instance,
            processGatewayInformation.Action,
            processGatewayInformation.DataTypeId
        );

        return outgoingFlows.Where(outgoingFlow => EvaluateSequenceFlow(state, outgoingFlow)).ToList();
    }

    private async Task<LayoutEvaluatorState> GetLayoutEvaluatorState(
        Instance instance,
        string? action,
        string? dataTypeId
    )
    {
        var layoutSet = GetLayoutSet(instance);
        var (checkedDataTypeId, dataType) = await GetDataType(instance, layoutSet, dataTypeId);
        object data = new object();
        if (checkedDataTypeId != null && dataType != null)
        {
            InstanceIdentifier instanceIdentifier = new InstanceIdentifier(instance);
            var dataGuid = GetDataId(instance, checkedDataTypeId);
            Type dataElementType = dataType;
            if (dataGuid != null)
            {
                data = await _dataClient.GetFormData(
                    instanceIdentifier.InstanceGuid,
                    dataElementType,
                    instance.Org,
                    instance.AppId.Split("/")[1],
                    int.Parse(instance.InstanceOwner.PartyId),
                    dataGuid.Value
                );
            }
        }

        var state = await _layoutStateInit.Init(instance, data, layoutSetId: layoutSet?.Id, gatewayAction: action);
        return state;
    }

    private static bool EvaluateSequenceFlow(LayoutEvaluatorState state, SequenceFlow sequenceFlow)
    {
        if (sequenceFlow.ConditionExpression != null)
        {
            var expression = GetExpressionFromCondition(sequenceFlow.ConditionExpression);
            // If there is no component context in the state, evaluate the expression once without a component context
            var stateComponentContexts = state.GetComponentContexts().Any()
                ? state.GetComponentContexts().ToList()
                : [null];
            foreach (ComponentContext? componentContext in stateComponentContexts)
            {
                var result = ExpressionEvaluator.EvaluateExpression(state, expression, componentContext);
                if (result is bool boolResult && boolResult)
                {
                    return true;
                }
            }
        }
        else
        {
            return true;
        }

        return false;
    }

    private static Expression GetExpressionFromCondition(string condition)
    {
        Utf8JsonReader reader = new Utf8JsonReader(Encoding.UTF8.GetBytes(condition));
        reader.Read();
        var expressionFromCondition = ExpressionConverter.ReadNotNull(ref reader, _jsonSerializerOptions);
        return expressionFromCondition;
    }

    private LayoutSet? GetLayoutSet(Instance instance)
    {
        string taskId = instance.Process.CurrentTask.ElementId;

        string layoutSetsString = _resources.GetLayoutSets();
        LayoutSet? layoutSet = null;
        if (!string.IsNullOrEmpty(layoutSetsString))
        {
            LayoutSets? layoutSets = JsonSerializer.Deserialize<LayoutSets>(
                layoutSetsString,
                _jsonSerializerOptionsCamelCase
            );
            layoutSet = layoutSets?.Sets?.Find(t => t.Tasks.Contains(taskId));
        }

        return layoutSet;
    }

    //TODO: Find a better home for this method
    private async Task<(string? DataTypeId, Type? DataTypeClassType)> GetDataType(
        Instance instance,
        LayoutSet? layoutSet,
        string? dataTypeId
    )
    {
        DataType? dataType;
        if (dataTypeId != null)
        {
            dataType = (await _appMetadata.GetApplicationMetadata()).DataTypes.Find(d =>
                d.Id == dataTypeId && d.AppLogic != null
            );
        }
        else if (layoutSet != null)
        {
            dataType = (await _appMetadata.GetApplicationMetadata()).DataTypes.Find(d =>
                d.Id == layoutSet.DataType && d.AppLogic != null
            );
        }
        else
        {
            dataType = (await _appMetadata.GetApplicationMetadata()).DataTypes.Find(d =>
                d.TaskId == instance.Process.CurrentTask.ElementId && d.AppLogic != null
            );
        }

        if (dataType != null)
        {
            return (dataType.Id, _appModel.GetModelType(dataType.AppLogic.ClassRef));
        }

        return (null, null);
    }

    private static Guid? GetDataId(Instance instance, string dataType)
    {
        string? dataId = instance.Data.Find(d => d.DataType == dataType)?.Id;
        if (dataId != null)
        {
            return new Guid(dataId);
        }

        return null;
    }
}
