using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration;

// These rewrites preserve evaluation order. In particular, arithmetic on the right of
// another operation is not regrouped: floating point addition is not associative.
internal static class ExpressionSimplifier
{
    public static JsonNode? Simplify(JsonNode? expression)
    {
        if (expression is not JsonArray call || call.Count == 0)
            return expression?.DeepClone();
        var arguments = call.Select(Simplify).ToArray();
        var name = Text(arguments[0]);
        if (name == "not" && arguments.Length == 2)
        {
            if (Boolean(arguments[1]) is { } boolean)
                return JsonValue.Create(!boolean);
            if (
                arguments[1] is JsonArray nested
                && Text(nested[0]) == "not"
                && nested.Count == 2
                && IsBoolean(nested[1])
            )
                return nested[1]?.DeepClone();
        }
        if (name is "and" or "or")
        {
            var terms = new List<JsonNode?>();
            foreach (var argument in arguments.Skip(1))
            {
                if (Boolean(argument) is { } boolean)
                {
                    if (boolean == (name == "or"))
                        return JsonValue.Create(boolean);
                    continue;
                }
                var children =
                    argument is JsonArray nested && Text(nested[0]) == name ? nested.Skip(1) : new[] { argument };
                foreach (var child in children)
                    if (!terms.Any(term => JsonNode.DeepEquals(term, child)))
                        terms.Add(child?.DeepClone());
            }
            if (terms.Count == 0)
                return JsonValue.Create(name == "and");
            if (terms.Count == 1 && IsBoolean(terms[0]))
                return terms[0];
            return Call(name, terms.ToArray());
        }
        if (name == "if" && arguments.Length == 5 && Text(arguments[3]) == "else")
        {
            var condition = arguments[1];
            var yes = WithCondition(arguments[2], condition, true);
            var no = WithCondition(arguments[4], condition, false);
            if (Boolean(condition) is { } boolean)
                return (boolean ? yes : no)?.DeepClone();
            if (JsonNode.DeepEquals(yes, no))
                return yes?.DeepClone();
            if (Boolean(yes) == true && Boolean(no) == false && IsBoolean(condition))
                return condition?.DeepClone();
            if (Boolean(yes) == false && Boolean(no) == true)
                return Simplify(Call("not", condition));
            if (condition is JsonArray negation && Text(negation[0]) == "not" && negation.Count == 2)
                return Simplify(Call("if", negation[1], no, JsonValue.Create("else"), yes));
            return Call("if", condition, yes, JsonValue.Create("else"), no);
        }
        if (name == "plus")
        {
            var terms = arguments.Skip(1).ToList();
            // The outer sum already gives a missing numeric operand the same zero default.
            for (var index = 0; index < terms.Count; index++)
                if (
                    terms[index] is JsonArray inner
                    && Text(inner[0]) == "plus"
                    && (inner.Count == 2 || (inner.Count == 3 && IsZero(inner[2])))
                )
                    terms[index] = inner[1]?.DeepClone();
            // Flatten only the leftmost sum, preserving the order of all additions.
            while (terms.FirstOrDefault() is JsonArray first && Text(first[0]) == "plus")
            {
                terms.RemoveAt(0);
                terms.InsertRange(0, first.Skip(1).Select(term => term?.DeepClone()));
            }
            // Keep one explicit numeric operation, including its missing-value default.
            if (terms.Count > 1)
                terms.RemoveAll(IsZero);
            if (terms.Count == 0)
                return JsonValue.Create(0);
            if (
                terms.All(term =>
                    Number(term) is { } number
                    && number.CompareTo(Math.Truncate(number)) == 0
                    && Math.Abs(number) <= 1000000
                )
            )
                return JsonValue.Create(terms.Sum(term => Number(term) ?? 0));
            return Call("plus", terms.ToArray());
        }
        if (
            name is "greaterThan" or "greaterThanEq" or "lessThan" or "lessThanEq"
            && arguments.Length == 3
            && Number(arguments[1]) is { } left
            && Number(arguments[2]) is { } right
        )
        {
            return JsonValue.Create(
                name switch
                {
                    "greaterThan" => left > right,
                    "greaterThanEq" => left >= right,
                    "lessThan" => left < right,
                    _ => left <= right,
                }
            );
        }
        return new JsonArray(arguments);
    }

    private static JsonNode? WithCondition(JsonNode? expression, JsonNode? condition, bool truthy)
    {
        if (expression is not JsonArray call || call.Count == 0)
            return expression?.DeepClone();
        // Both branches are evaluated eagerly. Keep explicit safe divisors even
        // inside a branch whose source JavaScript would not have evaluated them.
        if (Text(call[0]) == "divide")
            return expression.DeepClone();
        if (IsBoolean(call) && JsonNode.DeepEquals(call, condition))
            return JsonValue.Create(truthy);
        if (
            NumericDiscriminator(call) is { } discriminator
            && truthy
            && NumericDiscriminator(condition) is { } known
            && JsonNode.DeepEquals(discriminator.Subject, known.Subject)
        )
            return JsonValue.Create(discriminator.Value.CompareTo(known.Value) == 0);
        return Simplify(new JsonArray(call.Select(argument => WithCondition(argument, condition, truthy)).ToArray()));
    }

    private static (JsonNode? Subject, double Value)? NumericDiscriminator(JsonNode? expression)
    {
        if (
            expression is JsonArray { Count: 3 } call
            && Text(call[0]) == "and"
            && call[1] is JsonArray { Count: 3 } lower
            && call[2] is JsonArray { Count: 3 } upper
            && Text(lower[0]) == "greaterThanEq"
            && Text(upper[0]) == "lessThanEq"
            && JsonNode.DeepEquals(lower[1], upper[1])
            && JsonNode.DeepEquals(lower[2], upper[2])
            && Number(lower[2]) is { } value
        )
            return (lower[1], value);
        return null;
    }

    private static JsonArray Call(string name, params JsonNode?[] arguments) =>
        new(new[] { JsonValue.Create(name) }.Concat(arguments.Select(argument => argument?.DeepClone())).ToArray());

    private static string? Text(JsonNode? node) =>
        node is JsonValue value && value.TryGetValue<string>(out var text) ? text : null;

    private static bool? Boolean(JsonNode? node) =>
        node is JsonValue value && value.TryGetValue<bool>(out var boolean) ? boolean : null;

    // Raw data-model reads can be null, strings or numbers. Removing their boolean
    // conversion would change the value returned by the expression.
    private static bool IsBoolean(JsonNode? node) =>
        Boolean(node).HasValue
        || node is JsonArray { Count: > 0 } call
            && Text(call[0])
                is "not"
                    or "and"
                    or "or"
                    or "equals"
                    or "notEquals"
                    or "greaterThan"
                    or "greaterThanEq"
                    or "lessThan"
                    or "lessThanEq"
                    or "contains"
                    or "notContains"
                    or "startsWith"
                    or "endsWith";

    private static double? Number(JsonNode? node) =>
        node is JsonValue value
        && value.GetValueKind() == System.Text.Json.JsonValueKind.Number
        && double.TryParse(
            value.ToJsonString(),
            System.Globalization.NumberStyles.Float,
            System.Globalization.CultureInfo.InvariantCulture,
            out var number
        )
            ? number
            : null;

    private static bool IsZero(JsonNode? node) => Number(node) == 0;
}
