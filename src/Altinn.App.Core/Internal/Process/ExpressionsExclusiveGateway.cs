using System.Text;
using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Internal.Process.Elements;
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

    private readonly ILayoutEvaluatorStateInitializer _layoutStateInit;

    /// <summary>
    /// Constructor for <see cref="ExpressionsExclusiveGateway" />
    /// </summary>
    public ExpressionsExclusiveGateway(ILayoutEvaluatorStateInitializer layoutEvaluatorStateInitializer)
    {
        _layoutStateInit = layoutEvaluatorStateInitializer;
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
        var taskId = instance.Process.CurrentTask.ElementId;
        var state = await _layoutStateInit.Init(
            instance,
            dataAccessor,
            taskId,
            processGatewayInformation.Action,
            language: null
        );

        var flows = new List<SequenceFlow>();
        foreach (var outgoingFlow in outgoingFlows)
        {
            if (await EvaluateSequenceFlow(state, outgoingFlow, processGatewayInformation))
            {
                flows.Add(outgoingFlow);
            }
        }

        return flows;
    }

    private static async Task<bool> EvaluateSequenceFlow(LayoutEvaluatorState state, SequenceFlow sequenceFlow, ProcessGatewayInformation processGatewayInformation)
    {
        if (sequenceFlow.ConditionExpression != null)
        {
            var expression = GetExpressionFromCondition(sequenceFlow.ConditionExpression);

            // If there is no component context in the state, evaluate the expression once without a component context
            var stateComponentContexts = (await state.GetComponentContexts()).ToList();
            if (stateComponentContexts.Count == 0)
            {
                stateComponentContexts.Add(
                    new ComponentContext(
                        component: null,
                        rowIndices: null,
                        rowLength: null,
                        dataElementId: processGatewayInformation.DataTypeId,
                        childContexts: null
                    )
                );
            }
            foreach (ComponentContext? componentContext in stateComponentContexts)
            {
                var result = await ExpressionEvaluator.EvaluateExpression(state, expression, componentContext);
                if (result is true)
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
        var expressionFromCondition = ExpressionConverter.ReadStatic(ref reader, _jsonSerializerOptions);
        return expressionFromCondition;
    }
}
