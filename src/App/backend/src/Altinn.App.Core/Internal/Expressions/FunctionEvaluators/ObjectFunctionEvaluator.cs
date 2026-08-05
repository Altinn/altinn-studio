using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.App.Core.Models.Expressions;

namespace Altinn.App.Core.Internal.Expressions.FunctionEvaluators;

internal static class ObjectFunctionEvaluator
{
    public static JsonObject Evaluate(ExpressionValue[] args)
    {
        AssertEvenNumberOfArguments(args);
        string[] keys = ExtractKeys(args);
        AssertKeysAreUnique(keys, args);
        JsonNode?[] values = ExtractValues(args);
        Dictionary<string, JsonNode?> keyValuePairs = DictionaryFromKeysAndValues(keys, values);
        return new JsonObject(keyValuePairs);
    }

    private static void AssertEvenNumberOfArguments(ExpressionValue[] args)
    {
        if (args.Length % 2 == 1)
        {
            throw new ExpressionEvaluatorTypeErrorException(
                "The object function must have an even number of arguments.",
                ExpressionFunction.@object,
                args
            );
        }
    }

    private static string[] ExtractKeys(ExpressionValue[] args)
    {
        try
        {
            return ExtractEvenIndexedArguments(args).Select(v => v.String).ToArray();
        }
        catch (InvalidCastException)
        {
            throw new ExpressionEvaluatorTypeErrorException(
                "Object keys must be strings.",
                ExpressionFunction.@object,
                args
            );
        }
    }

    private static ExpressionValue[] ExtractEvenIndexedArguments(ExpressionValue[] args) =>
        args.Where((_, index) => index % 2 == 0).ToArray();

    private static void AssertKeysAreUnique(string[] keys, ExpressionValue[] args)
    {
        if (keys.Length != keys.Distinct().Count())
        {
            throw new ExpressionEvaluatorTypeErrorException(
                "Object keys must be unique.",
                ExpressionFunction.@object,
                args
            );
        }
    }

    private static JsonNode?[] ExtractValues(ExpressionValue[] args) =>
        ExtractOddIndexedArguments(args).Select(v => JsonSerializer.SerializeToNode(v)).ToArray();

    private static ExpressionValue[] ExtractOddIndexedArguments(ExpressionValue[] args) =>
        args.Where((_, index) => index % 2 == 1).ToArray();

    private static Dictionary<string, JsonNode?> DictionaryFromKeysAndValues(string[] keys, JsonNode?[] values) =>
        keys.Zip(values, (k, v) => new { k, v }).ToDictionary(x => x.k, x => x.v);
}
