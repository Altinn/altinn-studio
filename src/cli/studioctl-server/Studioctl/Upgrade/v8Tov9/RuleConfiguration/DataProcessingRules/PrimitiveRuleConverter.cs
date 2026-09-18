using System.Globalization;
using System.Text.Json;
using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.DataProcessingRules;

// Primitive rules keep their JS value semantics until the final model write. This avoids
// treating a missing input as zero before an explicit coercion or losing nested returns.
internal sealed class PrimitiveRuleConverter(string parameterName)
{
    private readonly Dictionary<string, string> _locals = new(StringComparer.Ordinal);

    public string Convert(IFunction function)
    {
        var code = new IndentedStringBuilder();
        if (function.Body is not BlockStatement body)
            throw new NotSupportedException("Only block-bodied primitive rules are supported.");
        foreach (var statement in body.Body)
            CollectLocals(statement, 0);
        foreach (var local in _locals.Values)
            code.AppendLine($"object? {local} = null;");
        foreach (var statement in body.Body)
            Statement(statement, code);
        // JS functions may fall through without a return.
        if (body.Body.Count == 0 || body.Body[^1] is not ReturnStatement)
            code.AppendLine("return null;");
        return code.ToString();
    }

    private void CollectLocals(Statement statement, int depth)
    {
        switch (statement)
        {
            case VariableDeclaration declaration:
                if (depth > 0 && declaration.Kind.ToString() != "Var")
                    throw new NotSupportedException("Nested block-scoped declarations require the existing converter.");
                foreach (var variable in declaration.Declarations)
                    if (variable.Id is not Identifier id || !_locals.TryAdd(id.Name, "local_" + _locals.Count))
                        throw new NotSupportedException("Duplicate or destructured local variable.");
                break;
            case BlockStatement block:
                foreach (var child in block.Body)
                    CollectLocals(child, depth + 1);
                break;
            case IfStatement conditional:
                CollectLocals(conditional.Consequent, depth + 1);
                if (conditional.Alternate != null)
                    CollectLocals(conditional.Alternate, depth + 1);
                break;
        }
    }

    private void Statement(Statement statement, IndentedStringBuilder code)
    {
        switch (statement)
        {
            case BlockStatement block:
                code.OpenBrace();
                foreach (var child in block.Body)
                    Statement(child, code);
                code.CloseBrace();
                break;
            case VariableDeclaration declaration:
                foreach (var variable in declaration.Declarations)
                {
                    if (variable.Id is not Identifier id)
                        throw new NotSupportedException("Destructured local variable.");
                    if (variable.Init != null)
                        code.AppendLine($"{Local(id.Name)} = {Expression(variable.Init)};");
                }
                break;
            case ExpressionStatement { Expression: AssignmentExpression assignment }:
                if (assignment.Operator.ToString() is not ("Assignment" or "="))
                    throw new NotSupportedException("Compound assignment is not supported.");
                var target = assignment.Left switch
                {
                    Identifier id when id.Name == parameterName => "obj",
                    Identifier id when _locals.ContainsKey(id.Name) => Local(id.Name),
                    MemberExpression { Object: Identifier obj, Property: Identifier key, Computed: false }
                        when obj.Name == parameterName => $"obj[{Quote(key.Name)}]",
                    _ => throw new NotSupportedException("Assignment target is not a rule input or local."),
                };
                code.AppendLine($"{target} = {Expression(assignment.Right)};");
                break;
            case IfStatement conditional:
                code.AppendLine($"if (JsTruthy({Expression(conditional.Test)}))");
                Body(conditional.Consequent, code);
                if (conditional.Alternate != null)
                {
                    code.AppendLine("else");
                    Body(conditional.Alternate, code);
                }
                break;
            case ReturnStatement result:
                code.AppendLine($"return {Expression(result.Argument)};");
                break;
            case EmptyStatement:
                break;
            default:
                throw new NotSupportedException($"Statement {statement.Type} is not a primitive rule statement.");
        }
    }

    private void Body(Statement statement, IndentedStringBuilder code)
    {
        code.OpenBrace();
        if (statement is BlockStatement block)
            foreach (var child in block.Body)
                Statement(child, code);
        else
            Statement(statement, code);
        code.CloseBrace();
    }

    private string Expression(Expression? expression) =>
        expression switch
        {
            null => "null",
            Literal literal => literal.Value switch
            {
                null => "null",
                string value => Quote(value),
                bool value => value ? "true" : "false",
                int or long or double or float => System
                    .Convert.ToDouble(literal.Value, CultureInfo.InvariantCulture)
                    .ToString("R", CultureInfo.InvariantCulture) + "d",
                _ => throw new NotSupportedException("Non-primitive literal."),
            },
            Identifier id when id.Name == parameterName => "obj",
            Identifier id when _locals.ContainsKey(id.Name) => Local(id.Name),
            MemberExpression { Object: Identifier obj, Property: Identifier key, Computed: false }
                when obj.Name == parameterName => $"JsGet(obj, {Quote(key.Name)})",
            ConditionalExpression conditional =>
                $"(JsTruthy({Expression(conditional.Test)}) ? (object?)({Expression(conditional.Consequent)}) : (object?)({Expression(conditional.Alternate)}))",
            LogicalExpression logical => Logical(logical),
            BinaryExpression binary => Binary(binary),
            UnaryExpression unary => unary.Operator.ToString() switch
            {
                "UnaryPlus" or "Plus" or "+" => $"JsNumber({Expression(unary.Argument)})",
                "UnaryNegation" or "UnaryMinus" or "Minus" or "-" => $"(-JsNumber({Expression(unary.Argument)}))",
                "LogicalNot" or "Not" or "!" => $"(!JsTruthy({Expression(unary.Argument)}))",
                _ => throw new NotSupportedException("Unsupported unary operator."),
            },
            CallExpression call => Call(call),
            _ => throw new NotSupportedException($"Expression {expression.Type} is not a primitive rule expression."),
        };

    private string Binary(BinaryExpression binary)
    {
        var left = Expression(binary.Left);
        var right = Expression(binary.Right);
        return binary.Operator.ToString() switch
        {
            "Addition" or "+" => $"JsAdd({left}, {right})",
            "Subtraction" or "-" => $"(JsNumber({left}) - JsNumber({right}))",
            "Multiplication" or "*" => $"(JsNumber({left}) * JsNumber({right}))",
            "Division" or "/" => $"(JsNumber({left}) / JsNumber({right}))",
            "Remainder" or "%" => $"(JsNumber({left}) % JsNumber({right}))",
            "Equality" or "==" => $"JsEquals({left}, {right})",
            "Inequality" or "!=" => $"(!JsEquals({left}, {right}))",
            "GreaterThan" or ">" => $"(JsCompare({left}, {right}) > 0)",
            "GreaterThanOrEqual" or ">=" => $"(JsCompare({left}, {right}) >= 0)",
            "LessThan" or "<" => $"(JsCompare({left}, {right}) < 0)",
            "LessThanOrEqual" or "<=" => $"(JsCompare({left}, {right}) <= 0)",
            _ => throw new NotSupportedException("Unsupported binary operator."),
        };
    }

    private string Logical(LogicalExpression expression)
    {
        var left = Expression(expression.Left);
        var right = Expression(expression.Right);
        return expression.Operator.ToString() switch
        {
            "LogicalAnd" or "And" or "&&" => $"JsAnd({left}, () => {right})",
            "LogicalOr" or "Or" or "||" => $"JsOr({left}, () => {right})",
            _ => throw new NotSupportedException("Unsupported logical operator."),
        };
    }

    private string Call(CallExpression call)
    {
        if (call.Arguments.Count != 1)
            throw new NotSupportedException("Expected one call argument.");
        var argument = Expression(call.Arguments[0]);
        return call.Callee switch
        {
            Identifier { Name: "parseFloat" } => $"JsParseFloat({argument})",
            MemberExpression { Object: Identifier { Name: "Math" }, Property: Identifier { Name: "round" } } =>
                $"JsRound(JsNumber({argument}))",
            MemberExpression { Property: Identifier { Name: "toFixed" } } member =>
                $"JsToFixed(JsNumber({Expression(member.Object)}), (int)JsNumber({argument}))",
            _ => throw new NotSupportedException("Unsupported primitive rule call."),
        };
    }

    private string Local(string name) => _locals[name];

    internal static string Quote(string value) => JsonSerializer.Serialize(value);

    // Included in the generated app, rather than adding a runtime dependency on studioctl.
    internal const string Runtime = """
        private static object? JsGet(Dictionary<string, object?> obj, string key) => obj.GetValueOrDefault(key);
        private static object? JsAnd(object? left, Func<object?> right) => JsTruthy(left) ? right() : left;
        private static object? JsOr(object? left, Func<object?> right) => JsTruthy(left) ? left : right();
        private static bool JsTruthy(object? value) => value switch
        {
            null => false,
            bool boolean => boolean,
            string text => text.Length != 0,
            IConvertible => JsNumber(value) is var number && number != 0 && !double.IsNaN(number),
            _ => true,
        };
        private static double JsNumber(object? value) => value switch
        {
            null => 0,
            bool boolean => boolean ? 1 : 0,
            string text when string.IsNullOrWhiteSpace(text) => 0,
            string text => double.TryParse(text, System.Globalization.NumberStyles.Float,
                System.Globalization.CultureInfo.InvariantCulture, out var parsed) ? parsed : double.NaN,
            _ => Convert.ToDouble(value, System.Globalization.CultureInfo.InvariantCulture),
        };
        private static object JsAdd(object? left, object? right) =>
            left is string || right is string ? JsString(left) + JsString(right) : JsNumber(left) + JsNumber(right);
        private static string JsString(object? value) => value switch
        {
            null => "null",
            bool boolean => boolean ? "true" : "false",
            _ => Convert.ToString(value, System.Globalization.CultureInfo.InvariantCulture) ?? "",
        };
        private static bool JsEquals(object? left, object? right) =>
            left == null || right == null ? left == null && right == null :
            left is string a && right is string b ? a == b : JsNumber(left) == JsNumber(right);
        private static double JsCompare(object? left, object? right)
        {
            if (left is string a && right is string b) return string.CompareOrdinal(a, b);
            var x = JsNumber(left); var y = JsNumber(right);
            return double.IsNaN(x) || double.IsNaN(y) ? double.NaN : x == y ? 0 : x < y ? -1 : 1;
        }
        private static double JsRound(double value)
        {
            if (!double.IsFinite(value) || value == 0 || Math.Abs(value) >= 4503599627370496d) return value;
            var floor = Math.Floor(value);
            var rounded = value - floor < 0.5 ? floor : floor + 1;
            return rounded == 0 ? Math.CopySign(0, value) : rounded;
        }
        private static double JsParseFloat(object? value)
        {
            var match = System.Text.RegularExpressions.Regex.Match(JsString(value).TrimStart(),
                @"^[+-]?(?:Infinity|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)");
            return match.Success && double.TryParse(match.Value, System.Globalization.NumberStyles.Float,
                System.Globalization.CultureInfo.InvariantCulture, out var number) ? number : double.NaN;
        }
        private static string JsToFixed(double value, int digits)
        {
            if (digits < 0 || digits > 100) throw new ArgumentOutOfRangeException(nameof(digits));
            if (!double.IsFinite(value) || Math.Abs(value) >= 1e21) return JsString(value);
            var bits = BitConverter.DoubleToInt64Bits(Math.Abs(value));
            int exponent = (int)((bits >> 52) & 0x7ff);
            var significant = new System.Numerics.BigInteger(bits & 0xfffffffffffffL);
            if (exponent != 0) significant += System.Numerics.BigInteger.One << 52;
            int shift = exponent == 0 ? -1074 : exponent - 1075;
            var scaled = significant * System.Numerics.BigInteger.Pow(10, digits);
            if (shift >= 0) scaled <<= shift;
            else
            {
                var divisor = System.Numerics.BigInteger.One << -shift;
                scaled = System.Numerics.BigInteger.DivRem(scaled, divisor, out var remainder);
                if (remainder * 2 >= divisor) scaled++;
            }
            var text = scaled.ToString(System.Globalization.CultureInfo.InvariantCulture).PadLeft(digits + 1, '0');
            if (digits > 0) text = text.Insert(text.Length - digits, ".");
            return value < 0 ? "-" + text : text;
        }
        """;
}
