using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration;

internal static class NumericComparisonSafety
{
    // Expressions use decimal arithmetic, while legacy JavaScript uses binary doubles.
    // A tiny difference in a total is different from choosing a different branch at a boundary.
    // Keep coercion and sign changes, but do not move fractional arithmetic into a decision.
    public static bool MayChangeBoundary(JsonNode? expression, IReadOnlySet<string>? integerInputs = null)
    {
        if (expression is not JsonArray { Count: > 0 } call)
            return false;
        var operation = call[0]?.GetValue<string>();
        if (operation == "round")
            return false; // Explicit rounding keeps the app's rounding intent, including accepted tie differences.
        var arguments = call.Skip(1).ToArray();
        var arithmetic = operation is "plus" or "minus" or "multiply" or "divide";
        var identity = operation switch
        {
            "plus" => arguments.Count(argument => !IsConstant(argument, 0)) <= 1,
            "minus" => arguments.Length == 2 && (IsConstant(arguments[0], 0) || IsConstant(arguments[1], 0)),
            "multiply" => arguments.Count(argument => !IsConstant(argument, 1) && !IsConstant(argument, -1)) <= 1,
            "divide" => arguments.Length == 2 && (IsConstant(arguments[1], 1) || IsConstant(arguments[1], -1)),
            _ => false,
        };
        if (arithmetic && !identity && (operation == "divide" || !arguments.All(IsInteger)))
            return true;
        return arguments.Any(argument => MayChangeBoundary(argument, integerInputs));

        bool IsInteger(JsonNode? node)
        {
            if (node == null)
                return true; // Arithmetic coerces a bound null to zero.
            if (node is JsonValue literal)
                return literal.TryGetValue<double>(out var value) && value.CompareTo(Math.Truncate(value)) == 0;
            if (node is not JsonArray { Count: > 0 } nested)
                return false;
            return nested[0]?.GetValue<string>() switch
            {
                "dataModel" => nested.Count > 1
                    && nested[1] is JsonValue path
                    && path.TryGetValue<string>(out var field)
                    && integerInputs?.Contains(field) == true,
                "plus" or "minus" or "multiply" => nested.Skip(1).All(IsInteger),
                "if" => nested.Count >= 4 && IsInteger(nested[2]) && IsInteger(nested[^1]),
                _ => false,
            };
        }
    }

    private static bool IsConstant(JsonNode? node, double expected) =>
        node is JsonValue literal && literal.TryGetValue<double>(out var value) && value.CompareTo(expected) == 0;
}
