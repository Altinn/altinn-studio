using System.Text;
using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
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
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        AllowTrailingCommas = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private readonly ILayoutEvaluatorStateInitializer _layoutStateInit;

    private readonly IAppResources _resources;

    /// <summary>
    /// Constructor for <see cref="ExpressionsExclusiveGateway" />
    /// </summary>
    public ExpressionsExclusiveGateway(
        ILayoutEvaluatorStateInitializer layoutEvaluatorStateInitializer,
        IAppResources resources
    )
    {
        _layoutStateInit = layoutEvaluatorStateInitializer;
        _resources = resources;
    }

    /// <inheritdoc />
    public string GatewayId { get; } = "AltinnExpressionsExclusiveGateway";

    /// <inheritdoc />
    public async Task<List<SequenceFlow>> FilterAsync(
        List<SequenceFlow> outgoingFlows,
        Instance instance,
        IInstanceDataAccessor dataAccessor,
        ProcessGatewayInformation processGatewayInformation
    )
    {
        var state = await _layoutStateInit.Init(
            dataAccessor,
            taskId: null, // don't load layout for task
            processGatewayInformation.Action,
            language: null
        );

        var flows = new List<SequenceFlow>();
        foreach (var outgoingFlow in outgoingFlows)
        {
            if (await EvaluateSequenceFlow(instance, state, outgoingFlow, processGatewayInformation))
            {
                flows.Add(outgoingFlow);
            }
        }

        return flows;
    }

    private async Task<bool> EvaluateSequenceFlow(
        Instance instance,
        LayoutEvaluatorState state,
        SequenceFlow sequenceFlow,
        ProcessGatewayInformation processGatewayInformation
    )
    {
        if (sequenceFlow.ConditionExpression is not null)
        {
            var dataTypeId = processGatewayInformation.DataTypeId;
            if (dataTypeId is null)
            {
                // TODO: getting the data type from layout is kind of sketchy, because it depends on the previous task
                //       and in a future version we should probably require <altinn:connectedDataTypeId>
                var layoutSet = _resources.GetLayoutSetForTask(instance.Process.CurrentTask.ElementId);
                dataTypeId = layoutSet?.DataType;
            }
            var expression = GetExpressionFromCondition(sequenceFlow.ConditionExpression);
            DataElementIdentifier? dataElement = instance.Data.Find(d => d.DataType == dataTypeId);

            var componentContext = new ComponentContext(
                state,
                component: null,
                rowIndices: null,
                dataElementIdentifier: dataElement
            );
            var result = await ExpressionEvaluator.EvaluateExpression(state, expression, componentContext);
            if (result is true)
            {
                return true;
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
        var expressionFromCondition = ExpressionConverter.ReadStatic(ref reader, _jsonSerializerOptions);
        return expressionFromCondition;
    }

    /// <summary>
    /// Legacy method kept for backwards compatibility
    /// </summary>
    Task<List<SequenceFlow>> IProcessExclusiveGateway.FilterAsync(
        List<SequenceFlow> outgoingFlows,
        Instance instance,
        ProcessGatewayInformation processGatewayInformation
    )
    {
        //TODO: Remove when obsolete method is removed from interface in v9
        throw new NotImplementedException();
    }
}
