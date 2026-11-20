using System.Text.Json.Nodes;
using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.CalculationExpressions;

internal sealed partial class CalculationExpressionConverter
{
    private void Assign(AssignmentExpression assignment, Dictionary<string, Value> values)
    {
        var key = assignment.Left is Expression target ? Key(target) : null;
        if (key == null || _constants.Contains(key) || _helpers.ContainsKey(key) || IsBuiltin(key))
            throw new NotSupportedException("Assignment changes an unsupported target or constant.");
        var right = Read(assignment.Right, values);
        var op = assignment.Operator.ToString();
        if (op == "Assignment")
        {
            // An implicit local is safe only after assignment on this invocation. Branches
            // merge their common names, so a read depending on an earlier call is rejected.
            values[key] = right;
            return;
        }
        if (!values.TryGetValue(key, out var left))
            throw new NotSupportedException("Compound assignment reads a value before it is assigned.");
        var function = op switch
        {
            "AdditionAssignment" => "plus",
            "SubtractionAssignment" => "minus",
            "MultiplicationAssignment" => "multiply",
            _ => throw new NotSupportedException("Unsupported compound assignment."),
        };
        if (op == "AdditionAssignment" && (left.Kind == Kind.String || right.Kind == Kind.String))
            throw new NotSupportedException("String addition concatenates values instead of adding numbers.");
        var a = Numeric(left).Expression;
        var b = Numeric(right).Expression;
        values[key] = new(Call(function, a, b), Kind.Number);
    }

    private static bool IsBuiltin(string name) =>
        name
            is "undefined"
                or "NaN"
                or "Infinity"
                or "Math"
                or "Number"
                or "String"
                or "Boolean"
                or "Object"
                or "Array"
                or "parseInt"
                or "parseFloat"
                or "isNaN";

    private static bool ContainsReturn(Statement? statement) =>
        statement switch
        {
            ReturnStatement => true,
            BlockStatement block => block.Body.Any(ContainsReturn),
            IfStatement branch => ContainsReturn(branch.Consequent) || ContainsReturn(branch.Alternate),
            _ => false,
        };

    private JsonNode? ReadTruthy(Expression expression, Dictionary<string, Value> values)
    {
        if (expression is UnaryExpression unary && unary.Operator.ToString() == "UnaryPlus")
        {
            var argument = Read(unary.Argument, values);
            if (argument.Kind == Kind.Number)
                return Truthy(argument);
        }
        return ExpressionSimplifier.Simplify(Truthy(Read(expression, values)));
    }

    private bool TryNumericDefault(
        ConditionalExpression conditional,
        Dictionary<string, Value> values,
        out Value result
    )
    {
        result = new(null, Kind.Undefined);
        var key = Key(conditional.Test);
        if (key == null || !values.TryGetValue(key, out var input) || input.Kind != Kind.Number)
            return false;
        var consequent = conditional.Consequent;
        if (consequent is UnaryExpression unary && unary.Operator.ToString() == "UnaryPlus")
            consequent = unary.Argument;
        if (Key(consequent) != key || conditional.Alternate is not Literal { Value: 0 or 0d })
            return false;
        result = NumberOrZero(input);
        return true;
    }

    private static Value NumberOrZero(Value value) =>
        value.Kind switch
        {
            Kind.Number => value.MayBeMissing ? new(Call("plus", value.Expression, 0), Kind.Number) : value,
            Kind.Null => new(JsonValue.Create(0), Kind.Number),
            _ => throw new NotSupportedException("Expected a numeric value or null."),
        };

    private static bool IsZero(Value value) =>
        value.Kind == Kind.Number
        && value.Expression is JsonValue number
        && double.TryParse(
            number.ToJsonString(),
            System.Globalization.NumberStyles.Float,
            System.Globalization.CultureInfo.InvariantCulture,
            out var result
        )
        && result == 0;

    private bool TryConstantMember(Expression expression, Dictionary<string, Value> values, out Value result)
    {
        result = new(null, Kind.Undefined);
        if (
            expression
                is MemberExpression
                {
                    Object: Identifier { Name: "Number" },
                    Property: Identifier { Name: "MAX_SAFE_INTEGER" },
                    Computed: false
                }
            && !values.ContainsKey("Number")
            && _parameter != "Number"
        )
        {
            result = new(JsonValue.Create(9007199254740991d), Kind.Number, NonZero: true);
            return true;
        }
        if (
            expression is MemberExpression { Object: Identifier obj, Computed: true, Property: Expression property }
            && obj.Name == _parameter
        )
        {
            var field = Read(property, values);
            if (field.Expression is not JsonValue literal || !literal.TryGetValue<string>(out var name))
                throw new NotSupportedException("Computed input name is not a finite known field.");
            if (!values.TryGetValue("input:" + name, out var configured))
                throw new NotSupportedException($"Computed calculation input '{name}' is not configured.");
            result = configured;
            return true;
        }
        return false;
    }

    private Value ReadCall(CallExpression call, Dictionary<string, Value> values)
    {
        if (TryReadSelectionEvery(call, values, out var every))
            return every;
        if (
            call.Callee is Identifier helperName
            && !values.ContainsKey(helperName.Name)
            && _parameter != helperName.Name
            && _helpers.TryGetValue(helperName.Name, out var helper)
        )
            return ReadHelper(helperName.Name, helper, call, values);
        if (call.Callee is Identifier builtin && !values.ContainsKey(builtin.Name) && _parameter != builtin.Name)
        {
            if (call.Arguments.Count != 1 || call.Arguments[0] is not Expression argument)
                throw new NotSupportedException("Unsupported numeric conversion arguments.");
            var value = Read(argument, values);
            if (
                builtin.Name == "parseInt"
                && value.Expression is JsonValue literal
                && literal.TryGetValue<string>(out var digits)
                && int.TryParse(
                    digits,
                    System.Globalization.NumberStyles.Integer,
                    System.Globalization.CultureInfo.InvariantCulture,
                    out var integer
                )
            )
                return new(JsonValue.Create(integer), Kind.Number, NonZero: integer != 0);
            return builtin.Name switch
            {
                "String" when value.Kind == Kind.Number && !value.MayBeMissing => NumericText(value),
                "Number" when value.Kind == Kind.Number => Numeric(value),
                "parseFloat" when value.Kind == Kind.Number && !value.MayBeMissing => value,
                "isNaN" when value.Kind == Kind.Number && !value.MayBeMissing => new(
                    JsonValue.Create(false),
                    Kind.Boolean
                ),
                _ => throw new NotSupportedException("Numeric conversion requires a proven finite numeric input."),
            };
        }
        if (call.Callee is not MemberExpression { Computed: false, Property: Identifier method } member)
            throw new NotSupportedException("Unsupported calculation call.");
        if (member.Object is Identifier owner && !values.ContainsKey(owner.Name) && owner.Name != _parameter)
        {
            if (
                owner.Name == "Math"
                && method.Name == "round"
                && call.Arguments.Count == 1
                && call.Arguments[0] is Expression argument
            )
            {
                var number = ExpressionSimplifier.Simplify(Numeric(Read(argument, values)).Expression);
                if (number is JsonValue literal && literal.TryGetValue<double>(out var constant))
                {
                    var floor = Math.Floor(constant);
                    return new(JsonValue.Create(constant - floor < 0.5 ? floor : floor + 1), Kind.Number);
                }
                throw new NotSupportedException(
                    "Rounding requires C# conversion: the frontend and backend round function disagree at ties."
                );
            }
            if (
                owner.Name == "Number"
                && method.Name == "isFinite"
                && call.Arguments.Count == 1
                && call.Arguments[0] is Expression finite
            )
            {
                var value = Read(finite, values);
                if (value.Kind == Kind.Number && !value.MayBeMissing)
                    return new(JsonValue.Create(true), Kind.Boolean);
            }
        }
        var receiver = Read(member.Object, values);
        if (
            method.Name == "toString"
            && call.Arguments.Count == 0
            && receiver.Kind == Kind.Number
            && !receiver.MayBeMissing
        )
            return NumericText(receiver);
        if (method.Name == "toFixed")
            throw new NotSupportedException(
                "Rounding requires C# conversion: the frontend and backend round function disagree at ties."
            );
        if (
            method.Name == "includes"
            && call.Arguments.Count == 1
            && call.Arguments[0] is Expression searched
            && receiver.Kind == Kind.String
            && (receiver.SelectionString || receiver.NumericString)
        )
        {
            var needle = Read(searched, values);
            if (needle.Kind != Kind.String || needle.MayBeMissing)
                throw new NotSupportedException("String membership requires a known string argument.");
            var contains = Call("contains", receiver.Expression, needle.Expression);
            if (receiver.MayBeMissing && !member.Optional && !call.Optional)
                throw new NotSupportedException("String membership can execute on a missing input.");
            return new(
                receiver.MayBeMissing
                    ? Call("if", Call("equals", receiver.Expression, null), null, contains)
                    : contains,
                Kind.Boolean,
                MayBeMissing: receiver.MayBeMissing,
                MayBeUndefined: receiver.MayBeMissing
            );
        }
        throw new NotSupportedException($"Method '{method.Name}' requires C# conversion.");
    }

    private Dictionary<string, Value>? _helperScope;

    private Value ReadHelper(string name, IFunction helper, CallExpression call, Dictionary<string, Value> values)
    {
        // Arguments run in the caller before entering the helper. f(f(value)) is not
        // recursion, and both argument evaluation and parameter binding must follow JS order.
        var arguments = call.Arguments.Select(argument => Read(argument, values)).ToList();
        if (_activeHelpers.Count == 0)
            _helperScope = new(values, StringComparer.Ordinal);
        if (
            helper.Async
            || helper.Generator
            || helper.Params.Count != call.Arguments.Count
            || !_activeHelpers.Add(name)
        )
            throw new NotSupportedException("Recursive, asynchronous, or mismatched helper call.");
        try
        {
            var locals = new Dictionary<string, Value>(
                _helperScope ?? throw new InvalidOperationException(),
                StringComparer.Ordinal
            );
            for (var index = 0; index < helper.Params.Count; index++)
            {
                if (helper.Params[index] is not Identifier parameter || parameter.Name == _parameter)
                    throw new NotSupportedException("Unsupported helper parameter.");
                locals[parameter.Name] = arguments[index];
            }
            if (
                arguments.Count == 1
                && !locals.ContainsKey("Number")
                && !locals.ContainsKey("isNaN")
                && _parameter is not ("Number" or "isNaN")
                && IsNumericDefaultHelper(helper)
            )
                return NumberOrZero(arguments[0]);
            // General helpers may calculate and return values, but cannot assign captured
            // variables or model fields. This keeps inlining independent of invocation order.
            if (helper.Body is BlockStatement body)
            {
                if (!PureHelperBody(body))
                    throw new NotSupportedException("Helper has side effects or unsupported statements.");
                ReserveBuiltinBindings(body.Body.ToArray(), locals);
                return Execute(body.Body.ToArray(), locals);
            }
            if (helper.Body is Expression expression)
                return Read(expression, locals);
            throw new NotSupportedException("Unsupported helper body.");
        }
        finally
        {
            _activeHelpers.Remove(name);
            if (_activeHelpers.Count == 0)
                _helperScope = null;
        }
    }

    private static bool PureHelperBody(BlockStatement block) =>
        block.Body.All(statement =>
            statement switch
            {
                VariableDeclaration declaration => declaration.Declarations.All(variable =>
                    variable.Id is Identifier && variable.Init is not IFunction
                ),
                ReturnStatement or EmptyStatement => true,
                _ => false,
            }
        );

    private static bool IsNumericDefaultHelper(IFunction helper)
    {
        if (
            helper.Params.Count != 1
            || helper.Params[0] is not Identifier parameter
            || helper.Body is not BlockStatement { Body.Count: 2 } body
            || body.Body[0] is not VariableDeclaration { Declarations.Count: 1 } declaration
            || declaration.Declarations[0].Id is not Identifier local
            || declaration.Declarations[0].Init
                is not CallExpression { Callee: Identifier { Name: "Number" }, Arguments.Count: 1 } cast
            || cast.Arguments[0] is not Identifier input
            || input.Name != parameter.Name
            || body.Body[1] is not ReturnStatement { Argument: ConditionalExpression conditional }
            || conditional.Test is not CallExpression { Callee: Identifier { Name: "isNaN" }, Arguments.Count: 1 } check
            || check.Arguments[0] is not Identifier checkedName
            || checkedName.Name != local.Name
            || conditional.Consequent is not Literal { Value: 0 or 0d }
            || conditional.Alternate is not Identifier returned
            || returned.Name != local.Name
        )
            return false;
        return parameter.Name is not ("Number" or "isNaN") && local.Name is not ("Number" or "isNaN");
    }

    private Value ReadTemplate(TemplateLiteral template, Dictionary<string, Value> values)
    {
        var terms = new List<JsonNode?>();
        var hasSafeLiteral = false;
        for (var index = 0; index < template.Quasis.Count; index++)
        {
            var text =
                template.Quasis[index].Value.Cooked ?? throw new NotSupportedException("Invalid template literal.");
            if (text.Length > 0)
            {
                terms.Add(JsonValue.Create(text));
                hasSafeLiteral |= text.Any(character => !"nulltruefalse".Contains(char.ToLowerInvariant(character)));
            }
            if (index < template.Expressions.Count)
            {
                var value = Read(template.Expressions[index], values);
                if (value.MayBeMissing || value.Kind is not (Kind.Number or Kind.Boolean or Kind.String))
                    throw new NotSupportedException(
                        "Template requires string conversion of a missing or unsupported value."
                    );
                terms.Add(value.Kind == Kind.Number ? NumericText(value).Expression : value.Expression);
            }
        }
        if (terms.All(term => term is JsonValue scalar && scalar.TryGetValue<string>(out _)))
        {
            var text = string.Concat(terms.Select(term => term?.GetValue<string>()));
            if (text.ToLowerInvariant() is "null" or "true" or "false")
                throw new NotSupportedException("Template produces a reserved expression string.");
            return new(JsonValue.Create(text), Kind.String);
        }
        if (!hasSafeLiteral)
            throw new NotSupportedException("Template may produce a reserved expression string.");
        return new(Call("concat", terms.ToArray()), Kind.String);
    }

    private Value NumericText(Value value)
    {
        var simplified = ExpressionSimplifier.Simplify(value.Expression);
        if (
            simplified is JsonValue scalar
            && scalar.GetValueKind() == System.Text.Json.JsonValueKind.Number
            && double.TryParse(
                scalar.ToJsonString(),
                System.Globalization.NumberStyles.Float,
                System.Globalization.CultureInfo.InvariantCulture,
                out var constant
            )
        )
            return new(
                JsonValue.Create(
                    constant == 0 ? "0" : constant.ToString(System.Globalization.CultureInfo.InvariantCulture)
                ),
                Kind.String
            );
        return new(Call("concat", "", Call("plus", value.Expression, 0)), Kind.String);
    }

    private static JsonNode? NumericEquals(JsonNode? left, JsonNode? right) =>
        System.Text.Json.JsonSerializer.SerializeToNode(ExpressionConverter.NumericEquals(left, right));
}
