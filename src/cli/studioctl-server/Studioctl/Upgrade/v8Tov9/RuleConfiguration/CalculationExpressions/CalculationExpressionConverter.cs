using System.Text.Json.Nodes;
using Acornima.Ast;
using Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.DataProcessingRules;
using Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.Models;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.CalculationExpressions;

// Unlike conditional rendering, calculations need the value returned by the whole function,
// including assignments and branch-local returns. Unsupported JS semantics stay in C#.
internal sealed partial class CalculationExpressionConverter
{
    private enum Kind
    {
        Number,
        String,
        Boolean,
        Null,
        Undefined,
        Object,
    }

    private sealed record Value(
        JsonNode? Expression,
        Kind Kind,
        bool MayBeMissing = false,
        bool NonZero = false,
        bool NumericString = false,
        bool SelectionString = false,
        bool MayBeUndefined = false
    );

    private int _steps;
    private string _parameter = "";
    private readonly HashSet<string> _constants = new(StringComparer.Ordinal);
    private readonly Dictionary<string, IFunction> _helpers = new(StringComparer.Ordinal);
    private readonly HashSet<string> _activeHelpers = new(StringComparer.Ordinal);
    private IReadOnlyDictionary<string, IReadOnlyList<string>> _selectionOptions =
        new Dictionary<string, IReadOnlyList<string>>();
    private readonly Dictionary<string, Value> _selections = new(StringComparer.Ordinal);
    private readonly HashSet<string> _integerInputs = new(StringComparer.Ordinal);
    private readonly Dictionary<string, double> _integerBounds = new(StringComparer.Ordinal);
    public bool MayReturnNull { get; private set; }

    public JsonNode? Convert(
        JavaScriptFunction function,
        DataProcessingRule rule,
        DataModelTypeResolver types,
        string model,
        IReadOnlySet<string>? numericOptionInputs = null,
        IReadOnlyDictionary<string, IReadOnlyList<string>>? selectionOptions = null
    )
    {
        _parameter = function.ParameterName;
        _steps = 0;
        if (function.FunctionAst?.Body is not BlockStatement body)
            throw new NotSupportedException("Only block-bodied calculations are supported.");
        if (function.FunctionAst.Async || function.FunctionAst.Generator)
            throw new NotSupportedException("Async and generator functions do not return calculation values directly.");
        _constants.Clear();
        _helpers.Clear();
        _activeHelpers.Clear();
        _selections.Clear();
        _integerInputs.Clear();
        _integerBounds.Clear();
        _selectionOptions = selectionOptions ?? new Dictionary<string, IReadOnlyList<string>>();
        foreach (var statement in body.Body)
            ValidateDeclarations(statement, 0);
        var values = new Dictionary<string, Value>(StringComparer.Ordinal);
        foreach (var (name, path) in rule.InputParams ?? [])
        {
            if (string.IsNullOrEmpty(path))
                continue;
            var type = types.ResolveType(path);
            if (type?.TrimEnd('?') is "int" or "long")
            {
                _integerInputs.Add(path);
                _integerBounds[path] = type.TrimEnd('?') == "int" ? 2147483648d : 9223372036854775808d;
            }
            var kind = type?.TrimEnd('?') switch
            {
                "int" or "long" or "decimal" or "double" or "float" => Kind.Number,
                "string" => Kind.String,
                "bool" => Kind.Boolean,
                _ => throw new NotSupportedException($"Input '{path}' has an unsupported or unresolved model type."),
            };
            values["input:" + name] = new(
                Call("dataModel", path, model),
                kind,
                MayBeMissing: true,
                NumericString: kind == Kind.String
                    && numericOptionInputs?.Contains(NumericOptionInputs.Normalize(path)) == true,
                SelectionString: kind == Kind.String
                    && _selectionOptions.ContainsKey(NumericOptionInputs.Normalize(path))
            );
        }
        var result = Execute(body.Body.ToArray(), values);
        MayReturnNull = result.Kind is Kind.Null or Kind.Undefined || result.MayBeMissing;
        var outputType = types.ResolveType(rule.OutParams?.GetValueOrDefault("outParam0") ?? "")?.TrimEnd('?');
        var compatible = result.Kind switch
        {
            Kind.Number => outputType is "int" or "long" or "decimal" or "double" or "float",
            Kind.String => outputType == "string",
            Kind.Boolean => outputType == "bool",
            Kind.Null or Kind.Undefined => true,
            _ => false,
        };
        if (!compatible)
            throw new NotSupportedException("Result requires conversion to a different model value type.");
        return ExpressionSimplifier.Simplify(result.Expression);
    }

    private Value Execute(IReadOnlyList<Statement> statements, Dictionary<string, Value> values)
    {
        if (++_steps > 4096)
            throw new NotSupportedException("Calculation would produce an excessively large expression.");
        if (statements.Count == 0)
            return new(null, Kind.Undefined);
        var statement = statements[0];
        var remaining = statements.Skip(1).ToArray();
        switch (statement)
        {
            case ReturnStatement result:
                return Read(result.Argument, values);
            case BlockStatement block:
                if (!ContainsReturn(block))
                {
                    Execute(block.Body.ToArray(), values);
                    foreach (var declaration in block.Body.OfType<VariableDeclaration>())
                        if (declaration.Kind.ToString() != "Var")
                            foreach (var variable in declaration.Declarations)
                                if (variable.Id is Identifier local)
                                    values.Remove(local.Name);
                    return Execute(remaining, values);
                }
                return Execute(block.Body.Concat(remaining).ToArray(), values);
            case VariableDeclaration declaration:
                foreach (var variable in declaration.Declarations)
                {
                    if (
                        variable.Id is not Identifier id
                        || id.Name == _parameter
                        || values.ContainsKey(id.Name)
                        || _helpers.ContainsKey(id.Name)
                    )
                        throw new NotSupportedException("Destructured, shadowed, or repeated local declaration.");
                    if (variable.Init is IFunction helper)
                    {
                        if (!_helpers.TryAdd(id.Name, helper))
                            throw new NotSupportedException("Repeated helper declaration.");
                    }
                    else if (TrySelectionList(variable.Init, values, out var selection))
                    {
                        _selections[id.Name] = selection;
                        values[id.Name] = selection;
                    }
                    else
                        values[id.Name] = Read(variable.Init, values);
                }
                break;
            case ExpressionStatement { Expression: AssignmentExpression assignment }:
                Assign(assignment, values);
                break;
            case ExpressionStatement { Expression: CallExpression iteration }
                when TryIterateSelection(iteration, values):
                break;
            case ExpressionStatement { Expression: ConditionalExpression discarded }:
                // Read and validate a discarded pure expression. In particular, x ? x : 0
                // does not assign a default and must not change later reads of x.
                Read(discarded, values);
                break;
            case IfStatement conditional:
                var condition = ReadTruthy(conditional.Test, values);
                var yes = new Dictionary<string, Value>(values, StringComparer.Ordinal);
                Refine(conditional.Test, yes);
                var no = new Dictionary<string, Value>(values, StringComparer.Ordinal);
                Refine(conditional.Test, no, false);
                if (condition is JsonValue literalCondition && literalCondition.TryGetValue<bool>(out var isTrue))
                {
                    var selected = isTrue ? conditional.Consequent : conditional.Alternate;
                    var continuation = selected == null ? remaining : new[] { selected }.Concat(remaining).ToArray();
                    return Execute(continuation, isTrue ? yes : no);
                }
                if (!ContainsReturn(conditional.Consequent) && !ContainsReturn(conditional.Alternate))
                {
                    Execute(new[] { conditional.Consequent }, yes);
                    if (conditional.Alternate != null)
                        Execute(new[] { conditional.Alternate }, no);
                    values.Clear();
                    foreach (var name in yes.Keys.Intersect(no.Keys, StringComparer.Ordinal))
                        values[name] = Select(condition, yes[name], no[name]);
                    return Execute(remaining, values);
                }
                var whenTrue = Execute(new[] { conditional.Consequent }.Concat(remaining).ToArray(), yes);
                var whenFalse = Execute(
                    conditional.Alternate is null
                        ? remaining
                        : new[] { conditional.Alternate }.Concat(remaining).ToArray(),
                    no
                );
                return Select(condition, whenTrue, whenFalse);
            case EmptyStatement:
                break;
            default:
                throw new NotSupportedException($"Statement '{statement.Type}' requires C# conversion.");
        }
        return Execute(remaining, values);
    }

    private Value Read(Expression? expression, Dictionary<string, Value> values)
    {
        if (++_steps > 4096)
            throw new NotSupportedException("Calculation would produce an excessively large expression.");
        switch (expression)
        {
            case null:
            case Identifier { Name: "undefined" } when _parameter != "undefined" && !values.ContainsKey("undefined"):
                return new(null, Kind.Undefined);
            case Literal literal:
                return literal.Value switch
                {
                    null => new(null, Kind.Null),
                    bool boolean => new(JsonValue.Create(boolean), Kind.Boolean),
                    string text when text.ToLowerInvariant() is not ("null" or "true" or "false") => new(
                        JsonValue.Create(text),
                        Kind.String
                    ),
                    int or long or double or float => new(
                        JsonValue.Create(
                            System.Convert.ToDouble(literal.Value, System.Globalization.CultureInfo.InvariantCulture)
                        ),
                        Kind.Number,
                        NonZero: System.Convert.ToDouble(
                            literal.Value,
                            System.Globalization.CultureInfo.InvariantCulture
                        ) != 0
                    ),
                    _ => throw new NotSupportedException("Unsupported literal."),
                };
            case Identifier identifier when identifier.Name == _parameter:
                return new(JsonValue.Create(true), Kind.Object);
            case Identifier:
            case MemberExpression:
                if (TryConstantMember(expression, values, out var constant))
                    return constant;
                var key = Key(expression);
                if (key != null && values.TryGetValue(key, out var value))
                {
                    if (
                        value.Kind == Kind.String
                        && value.MayBeMissing
                        && !value.NumericString
                        && !value.SelectionString
                    )
                        throw new NotSupportedException(
                            "String inputs require JS semantics for numeric coercion and reserved expression strings."
                        );
                    return value;
                }
                if (key?.StartsWith("input:", StringComparison.Ordinal) == true)
                    return new(null, Kind.Undefined);
                throw new NotSupportedException("Unknown variable or member access.");
            case ConditionalExpression conditional:
                if (TryNumericDefault(conditional, values, out var defaulted))
                    return defaulted;
                var condition = ReadTruthy(conditional.Test, values);
                var yes = new Dictionary<string, Value>(values, StringComparer.Ordinal);
                Refine(conditional.Test, yes);
                var no = new Dictionary<string, Value>(values, StringComparer.Ordinal);
                Refine(conditional.Test, no, false);
                if (condition is JsonValue literalCondition && literalCondition.TryGetValue<bool>(out var isTrue))
                    return Read(isTrue ? conditional.Consequent : conditional.Alternate, isTrue ? yes : no);
                return Select(condition, Read(conditional.Consequent, yes), Read(conditional.Alternate, no));
            case LogicalExpression logical:
                var left = Read(logical.Left, values);
                var op = logical.Operator.ToString();
                var refined = new Dictionary<string, Value>(values, StringComparer.Ordinal);
                if (op == "NullishCoalescing")
                {
                    var fallback = Read(logical.Right, values);
                    if (left.Kind is Kind.Null or Kind.Undefined)
                        return fallback;
                    if (left.Kind == Kind.Number && IsZero(fallback))
                        return NumberOrZero(left);
                    return Select(Call("equals", left.Expression, null), fallback, left with { MayBeMissing = false });
                }
                if (op is not ("LogicalAnd" or "LogicalOr"))
                    throw new NotSupportedException("Unsupported logical operator.");
                Refine(logical.Left, refined, op == "LogicalAnd");
                var right = Read(logical.Right, refined);
                if (
                    left.Kind == Kind.Boolean
                    && right.Kind == Kind.Boolean
                    && !left.MayBeMissing
                    && !right.MayBeMissing
                )
                    return new(
                        Call(op == "LogicalAnd" ? "and" : "or", left.Expression, right.Expression),
                        Kind.Boolean
                    );
                if (op == "LogicalAnd")
                    return Select(Truthy(left), right, left);
                if (left.Kind == Kind.Number && IsZero(right))
                    return NumberOrZero(left);
                return Select(Truthy(left), left with { MayBeMissing = false }, right);
            case UnaryExpression unary:
                if (unary.Operator.ToString() == "LogicalNot")
                    return new(Call("not", ReadTruthy(unary.Argument, values)), Kind.Boolean);
                var argument = Read(unary.Argument, values);
                return unary.Operator.ToString() switch
                {
                    "LogicalNot" => new(Call("not", Truthy(argument)), Kind.Boolean),
                    "UnaryPlus" => Numeric(argument),
                    "UnaryNegation"
                        when argument.Expression is JsonValue scalar && scalar.TryGetValue<double>(out var number) =>
                        new(JsonValue.Create(-number), Kind.Number),
                    "UnaryNegation" => new(Call("multiply", Numeric(argument).Expression, -1), Kind.Number),
                    _ => throw new NotSupportedException("Unsupported unary operator."),
                };
            case BinaryExpression binary:
                if (TryScaledRounding(binary, values, out var rounded))
                    return rounded;
                return Binary(binary, Read(binary.Left, values), Read(binary.Right, values));
            case CallExpression call:
                return ReadCall(call, values);
            case TemplateLiteral template:
                return ReadTemplate(template, values);
            case ChainExpression chain:
                return Read(chain.Expression, values);
            default:
                throw new NotSupportedException($"Expression '{expression.Type}' requires C# conversion.");
        }
    }

    private Value Binary(BinaryExpression binary, Value left, Value right)
    {
        var op = binary.Operator.ToString();
        if (
            op
                is "Equality"
                    or "Inequality"
                    or "StrictEquality"
                    or "StrictInequality"
                    or "GreaterThan"
                    or "GreaterThanOrEqual"
                    or "LessThan"
                    or "LessThanOrEqual"
            && (
                NumericComparisonSafety.MayChangeBoundary(left.Expression, _integerInputs)
                || NumericComparisonSafety.MayChangeBoundary(right.Expression, _integerInputs)
            )
        )
            throw new NotSupportedException(
                "Fractional arithmetic in a comparison can change JavaScript boundary decisions."
            );
        if (op is "Equality" or "Inequality" or "StrictEquality" or "StrictInequality")
        {
            var strict = op is "StrictEquality" or "StrictInequality";
            if (strict && (left.Kind is Kind.Null or Kind.Undefined || right.Kind is Kind.Null or Kind.Undefined))
            {
                JsonNode? strictEqual;
                if (left.Kind is Kind.Null or Kind.Undefined && right.Kind is Kind.Null or Kind.Undefined)
                    strictEqual = JsonValue.Create(left.Kind == right.Kind);
                else
                {
                    var absent = left.Kind is Kind.Null or Kind.Undefined ? left : right;
                    var subject = left.Kind is Kind.Null or Kind.Undefined ? right : left;
                    if (subject.MayBeUndefined)
                        throw new NotSupportedException(
                            "Strict equality distinguishes a computed undefined from null."
                        );
                    // Configured inputs are always present and scalar or null after legacy binding.
                    strictEqual =
                        absent.Kind == Kind.Undefined || !subject.MayBeMissing
                            ? JsonValue.Create(false)
                            : Call("equals", subject.Expression, null);
                }
                return new(op == "StrictEquality" ? strictEqual : Call("not", strictEqual), Kind.Boolean);
            }
            // Loose null equality also matches undefined.
            if (
                op is "Equality" or "Inequality"
                && (left.Kind is Kind.Null or Kind.Undefined || right.Kind is Kind.Null or Kind.Undefined)
            )
                return new(
                    Call(op == "Equality" ? "equals" : "notEquals", left.Expression, right.Expression),
                    Kind.Boolean
                );
            if (
                strict
                && left.Kind != right.Kind
                && left.Kind is Kind.Number or Kind.Boolean
                && right.Kind is Kind.String
                && !right.MayBeMissing
            )
                return new(JsonValue.Create(op == "StrictInequality"), Kind.Boolean);
            if (
                strict
                && left.Kind != right.Kind
                && right.Kind is Kind.Number or Kind.Boolean
                && left.Kind is Kind.String
                && !left.MayBeMissing
            )
                return new(JsonValue.Create(op == "StrictInequality"), Kind.Boolean);
            if (!strict && left.Kind == Kind.Number && TryNumericLiteral(right, out var numericRight))
                right = numericRight;
            else if (!strict && right.Kind == Kind.Number && TryNumericLiteral(left, out var numericLeft))
                left = numericLeft;
            if (left.Kind == Kind.Number && right.Kind == Kind.Number && !(left.MayBeMissing && right.MayBeMissing))
            {
                var numericEqual = NumericEquals(left.Expression, right.Expression);
                return new(
                    op is "Equality" or "StrictEquality" ? numericEqual : Call("not", numericEqual),
                    Kind.Boolean
                );
            }
            if (
                left.Kind != right.Kind
                || left.Kind is not (Kind.Number or Kind.String or Kind.Boolean)
                || left.MayBeMissing
                || right.MayBeMissing
            )
                throw new NotSupportedException("Equality requires JS coercion or distinguishes missing values.");
            // Keep numeric equality numeric, including signed zero and decimal scale.
            var equal =
                left.Kind == Kind.Number
                    ? NumericEquals(left.Expression, right.Expression)
                    : Call("equals", left.Expression, right.Expression);
            return new(op is "Equality" or "StrictEquality" ? equal : Call("not", equal), Kind.Boolean);
        }
        if (
            op == "Addition"
            && left.Kind == Kind.String
            && right.Kind == Kind.String
            && !left.MayBeMissing
            && !right.MayBeMissing
        )
        {
            if (
                left.Expression is JsonValue leftLiteral
                && leftLiteral.TryGetValue<string>(out var leftText)
                && right.Expression is JsonValue rightLiteral
                && rightLiteral.TryGetValue<string>(out var rightText)
                && (leftText + rightText).ToLowerInvariant() is not ("null" or "true" or "false")
            )
                return new(JsonValue.Create(leftText + rightText), Kind.String);
            throw new NotSupportedException("Concatenation could produce a reserved expression string.");
        }
        if (op == "Addition" && (left.Kind == Kind.String || right.Kind == Kind.String))
            throw new NotSupportedException("String addition concatenates values instead of adding numbers.");
        if (
            left.Kind == Kind.String
            && right.Kind == Kind.String
            && op is "GreaterThan" or "GreaterThanOrEqual" or "LessThan" or "LessThanOrEqual"
        )
            throw new NotSupportedException("Comparing two strings requires lexicographic ordering.");
        var a = Numeric(left);
        var b = Numeric(right);
        var function = op switch
        {
            "Addition" => "plus",
            "Subtraction" => "minus",
            "Multiplication" => "multiply",
            "Division" => "divide",
            "GreaterThan" => "greaterThan",
            "GreaterThanOrEqual" => "greaterThanEq",
            "LessThan" => "lessThan",
            "LessThanOrEqual" => "lessThanEq",
            _ => throw new NotSupportedException($"Operator '{op}' requires C# conversion."),
        };
        if (op == "Division" && !b.NonZero)
            throw new NotSupportedException("Division is not guarded against a zero denominator.");
        // Expression arguments are eager. An unreachable branch must remain safe to evaluate.
        var denominator =
            op == "Division"
                ? Call(
                    "if",
                    Call("or", Call("greaterThan", b.Expression, 0), Call("lessThan", b.Expression, 0)),
                    b.Expression,
                    1
                )
                : b.Expression;
        return new(
            Call(function, a.Expression, denominator),
            function is "greaterThan" or "greaterThanEq" or "lessThan" or "lessThanEq" ? Kind.Boolean : Kind.Number
        );
    }

    private static bool TryNumericLiteral(Value value, out Value number)
    {
        number = value;
        if (
            value.Kind != Kind.String
            || value.Expression is not JsonValue literal
            || !literal.TryGetValue<string>(out var text)
            || !double.TryParse(
                text,
                System.Globalization.NumberStyles.Float,
                System.Globalization.CultureInfo.InvariantCulture,
                out var parsed
            )
            || !double.IsFinite(parsed)
        )
            return false;
        number = new(JsonValue.Create(parsed), Kind.Number, NonZero: parsed != 0);
        return true;
    }

    private static Value Numeric(Value value)
    {
        if (value.Kind == Kind.Number && !value.MayBeUndefined)
            return NumberOrZero(value);
        if (value.Kind == Kind.Boolean && !value.MayBeMissing)
            return new(Call("if", value.Expression, 1, 0), Kind.Number);
        if (value.Kind == Kind.Null)
            return new(JsonValue.Create(0), Kind.Number);
        if (value.Kind == Kind.String && value.NumericString && !value.MayBeMissing)
        {
            var number = Call("jmespath", value.Expression, "to_number(@)");
            var missing = Call("or", Call("equals", value.Expression, null), Call("equals", value.Expression, ""));
            // Unlike numeric argument casts, to_number accepts signed numeric option strings
            // consistently in both runtimes. Pass unparsable nonempty input through to arithmetic.
            return new(
                Call(
                    "plus",
                    Call("if", Call("equals", number, null), Call("if", missing, 0, value.Expression), number),
                    0
                ),
                Kind.Number
            );
        }
        throw new NotSupportedException("Numeric coercion of strings or missing inputs requires C# conversion.");
    }

    private static JsonNode? Truthy(Value value) =>
        value.Kind switch
        {
            Kind.Null or Kind.Undefined => JsonValue.Create(false),
            Kind.Object => JsonValue.Create(true),
            Kind.Number => Call("or", Call("greaterThan", value.Expression, 0), Call("lessThan", value.Expression, 0)),
            Kind.String => Call(
                "and",
                Call("notEquals", value.Expression, null),
                Call("notEquals", value.Expression, "")
            ),
            Kind.Boolean => value.MayBeMissing ? Call("equals", value.Expression, true) : value.Expression,
            _ => throw new NotSupportedException("Unsupported truthiness."),
        };

    private void ValidateDeclarations(Statement statement, int depth)
    {
        switch (statement)
        {
            case VariableDeclaration declaration:
                if (
                    depth > 0
                    && declaration.Kind.ToString() != "Var"
                    && !declaration.Declarations.All(variable => IsSelectionListInitializer(variable.Init))
                )
                    throw new NotSupportedException("Nested block-scoped declarations require C# conversion.");
                if (depth > 0 && declaration.Declarations.Any(variable => variable.Init is IFunction))
                    throw new NotSupportedException("Conditionally declared helpers require C# conversion.");
                if (declaration.Kind.ToString() == "Const")
                    foreach (var variable in declaration.Declarations)
                        if (variable.Id is Identifier id)
                            _constants.Add(id.Name);
                break;
            case BlockStatement block:
                if (
                    ContainsReturn(block)
                    && block
                        .Body.OfType<VariableDeclaration>()
                        .Any(declaration =>
                            declaration.Kind.ToString() != "Var"
                            && declaration.Declarations.Any(variable => IsSelectionListInitializer(variable.Init))
                        )
                )
                    throw new NotSupportedException(
                        "Block-local selection lists with early returns require C# conversion."
                    );
                foreach (var child in block.Body)
                    ValidateDeclarations(child, depth + 1);
                break;
            case IfStatement conditional:
                ValidateDeclarations(conditional.Consequent, depth + 1);
                if (conditional.Alternate != null)
                    ValidateDeclarations(conditional.Alternate, depth + 1);
                break;
        }
    }

    private static bool IsSelectionListInitializer(Expression? expression) =>
        expression
            is CallExpression
            {
                Callee: MemberExpression { Computed: false, Property: Identifier { Name: "split" } },
                Arguments.Count: 1
            } call
        && call.Arguments[0] is Literal { Value: "," };

    private void Refine(Expression expression, Dictionary<string, Value> values, bool truthy = true)
    {
        if (expression is UnaryExpression plus && plus.Operator.ToString() == "UnaryPlus")
        {
            Refine(plus.Argument, values, truthy);
            return;
        }
        if (truthy && Key(expression) is { } key && values.TryGetValue(key, out var value))
            values[key] = value with { MayBeMissing = false, NonZero = value.Kind == Kind.Number };
        if (expression is UnaryExpression unary && unary.Operator.ToString() == "LogicalNot")
            Refine(unary.Argument, values, !truthy);
        if (
            expression is BinaryExpression binary
            && Key(binary.Left) is { } inputKey
            && values.TryGetValue(inputKey, out var input)
        )
        {
            var op = binary.Operator.ToString();
            if (binary.Right is Literal { Value: null } || binary.Right is Identifier { Name: "undefined" })
            {
                if ((op == "Equality" && !truthy) || (op == "Inequality" && truthy))
                    values[inputKey] = input with { MayBeMissing = false };
            }
            else if (
                binary.Right is Literal { Value: int or long or double or float } literal
                && input.Kind == Kind.Number
                && !input.MayBeMissing
                && System.Convert.ToDouble(literal.Value, System.Globalization.CultureInfo.InvariantCulture) == 0
                && (
                    (truthy && op is "GreaterThan" or "LessThan" or "Inequality" or "StrictInequality")
                    || (!truthy && op is "Equality" or "StrictEquality")
                )
            )
                values[inputKey] = input with { NonZero = true };
        }
        if (
            expression is LogicalExpression logical
            && (
                (truthy && logical.Operator.ToString() == "LogicalAnd")
                || (!truthy && logical.Operator.ToString() == "LogicalOr")
            )
        )
        {
            Refine(logical.Left, values, truthy);
            Refine(logical.Right, values, truthy);
        }
    }

    private string? Key(Expression expression) =>
        expression switch
        {
            ChainExpression chain => Key(chain.Expression),
            Identifier id when id.Name != _parameter => id.Name,
            MemberExpression { Object: Identifier obj, Property: Identifier key, Computed: false }
                when obj.Name == _parameter => "input:" + key.Name,
            _ => null,
        };

    private static Value Select(JsonNode? condition, Value yes, Value no)
    {
        if (condition is JsonValue scalar && scalar.TryGetValue<bool>(out var flag))
            return flag ? yes : no;
        if (yes.Kind == no.Kind && JsonNode.DeepEquals(yes.Expression, no.Expression))
            return yes with
            {
                MayBeMissing = yes.MayBeMissing || no.MayBeMissing,
                MayBeUndefined = yes.MayBeUndefined || no.MayBeUndefined,
                NonZero = yes.NonZero && no.NonZero,
            };
        if (
            yes.Kind != no.Kind
            && yes.Kind is not (Kind.Null or Kind.Undefined)
            && no.Kind is not (Kind.Null or Kind.Undefined)
        )
            throw new NotSupportedException("Branches return different JS value types.");
        return new(
            Call("if", condition, yes.Expression, no.Expression),
            yes.Kind is Kind.Null or Kind.Undefined ? no.Kind : yes.Kind,
            yes.MayBeMissing
                || no.MayBeMissing
                || yes.Kind is Kind.Null or Kind.Undefined
                || no.Kind is Kind.Null or Kind.Undefined,
            MayBeUndefined: yes.MayBeUndefined
                || no.MayBeUndefined
                || yes.Kind == Kind.Undefined
                || no.Kind == Kind.Undefined
        );
    }

    private static JsonArray Call(string name, params object?[] args)
    {
        var result = new JsonArray(JsonValue.Create(name));
        for (var index = 0; index < args.Length; index++)
        {
            if (name == "if" && index == 2)
                result.Add("else");
            var argument = args[index];
            result.Add(
                argument is JsonNode node ? node.DeepClone() : System.Text.Json.JsonSerializer.SerializeToNode(argument)
            );
        }
        return result;
    }
}
