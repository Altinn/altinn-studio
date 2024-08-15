using System.Globalization;
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
    /// <param name="layoutEvaluatorStateInitializer">Expressions state initalizer used to create context for expression evaluation</param>
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
        ProcessGatewayInformation processGatewayInformation
    )
    {
        var state = await GetLayoutEvaluatorState(
            instance,
            instance.Process.CurrentTask.ElementId,
            processGatewayInformation.Action,
            language: null
        );

        return outgoingFlows.Where(outgoingFlow => EvaluateSequenceFlow(state, outgoingFlow)).ToList();
    }

    private async Task<LayoutEvaluatorState> GetLayoutEvaluatorState(
        Instance instance,
        string taskId,
        string? gatewayAction,
        string? language
    )
    {
        var state = await _layoutStateInit.Init(instance, taskId, gatewayAction, language);
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
