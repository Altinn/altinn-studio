using System.Text.Json;
using Altinn.App.Core.Models.Expressions;
using DevLab.JmesPath;

namespace Altinn.App.Core.Internal.Expressions.FunctionEvaluators;

internal static class JmespathFunctionEvaluator
{
    public static ExpressionValue Evaluate(ExpressionValue[] args)
    {
        if (args.Length != 2)
        {
            throw new ExpressionEvaluatorTypeErrorException(
                $"Expected 2 argument(s), got {args.Length}",
                ExpressionFunction.jmespath,
                args
            );
        }

        if (args[1].ValueKind != JsonValueKind.String)
        {
            throw new ExpressionEvaluatorTypeErrorException(
                $"Expected argument to be string, got {args[1]}",
                ExpressionFunction.jmespath,
                args
            );
        }

        return EvaluateWithValidArguments(args[0], args[1].String);
    }

    private static ExpressionValue EvaluateWithValidArguments(ExpressionValue data, string query)
    {
        JmesPath jmesPath = new();
        try
        {
            string resultAsString = jmesPath.Transform(data.ToString(), query);
            return ExpressionValue.FromJsonString(resultAsString);
        }
        catch (Exception exception)
        {
            throw new ExpressionEvaluatorTypeErrorException(
                $"Jmespath error: \"{exception.Message}\"",
                ExpressionFunction.jmespath,
                [data, query]
            );
        }
    }
}
