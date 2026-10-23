using System.Globalization;
using System.Text.Json;
using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.DataProcessingRules;

// Translate a bounded, scalar JS subset. Runtime helpers retain JS coercion until the
// final model write; unsupported code is reported rather than translated by type guesses.
internal sealed class PrimitiveRuleConverter(
    string parameterName,
    string parameterValue = "obj",
    string localPrefix = "local_"
)
{
    private readonly Dictionary<string, string> _locals = new(StringComparer.Ordinal);
    private readonly Dictionary<string, IFunction> _helpers = new(StringComparer.Ordinal);
    private readonly HashSet<string> _implicit = new(StringComparer.Ordinal);
    private readonly HashSet<string> _lexical = new(StringComparer.Ordinal);
    private readonly HashSet<string> _constantLocals = new(StringComparer.Ordinal);
    private HashSet<string> _assigned = new(StringComparer.Ordinal);
    private int _steps;

    public string Convert(IFunction function)
    {
        if (function.Async || function.Generator || function.Params.Count != 1 || function.Params[0] is not Identifier)
            throw new NotSupportedException("Expected a synchronous function with one input object.");
        var code = new IndentedStringBuilder();
        if (function.Body is Expression expression)
        {
            code.AppendLine($"return {Expression(expression)};");
            return code.ToString();
        }
        if (function.Body is not BlockStatement body)
            throw new NotSupportedException("Unsupported function body.");
        foreach (var statement in body.Body)
            CollectLocals(statement);
        foreach (var (name, local) in _locals)
            if (!_helpers.ContainsKey(name))
                code.AppendLine($"object? {local} = Undefined;");
        Statements(body.Body, code);
        if (!Returns(body))
            code.AppendLine("return Undefined;");
        return code.ToString();
    }

    private void CollectLocals(Statement statement)
    {
        switch (statement)
        {
            case VariableDeclaration declaration:
                foreach (var variable in declaration.Declarations)
                {
                    if (
                        variable.Id is not Identifier id
                        || id.Name == parameterName
                        || !_locals.TryAdd(id.Name, localPrefix + _locals.Count)
                    )
                        throw new NotSupportedException("Duplicate, shadowed or destructured local variable.");
                    RegisterDeclaration(id.Name, declaration);
                    if (variable.Init is IFunction helper)
                    {
                        if (declaration.Kind.ToString() != "Const" || parameterValue != "obj")
                            throw new NotSupportedException(
                                "Local helpers must be constant functions without nested helpers."
                            );
                        _helpers.Add(id.Name, helper);
                    }
                }
                break;
            case BlockStatement block:
                foreach (var child in block.Body)
                    CollectLocals(child);
                break;
            case IfStatement conditional:
                CollectLocals(conditional.Consequent);
                if (conditional.Alternate != null)
                    CollectLocals(conditional.Alternate);
                break;
            case ExpressionStatement { Expression: AssignmentExpression { Left: Identifier id } }:
                if (id.Name == parameterName || IsBuiltin(id.Name))
                    throw new NotSupportedException("Assignment changes the input object or a builtin.");
                if (_locals.TryAdd(id.Name, localPrefix + _locals.Count))
                    _implicit.Add(id.Name);
                break;
        }
    }

    private static bool Returns(Statement statement) =>
        statement switch
        {
            ReturnStatement => true,
            BlockStatement block => block.Body.Any(Returns),
            IfStatement { Test: Literal { Value: bool condition } } branch => condition
                ? Returns(branch.Consequent)
                : branch.Alternate != null && Returns(branch.Alternate),
            IfStatement branch => branch.Alternate != null && Returns(branch.Consequent) && Returns(branch.Alternate),
            _ => false,
        };

    private void Statements(IEnumerable<Statement> statements, IndentedStringBuilder code)
    {
        foreach (var statement in statements)
        {
            Statement(statement, code);
            if (Returns(statement))
                break;
        }
    }

    private void Statement(Statement statement, IndentedStringBuilder code)
    {
        if (++_steps > 4096)
            throw new NotSupportedException("Rule exceeds the conversion size limit.");
        switch (statement)
        {
            case BlockStatement block:
                code.OpenBrace();
                Statements(block.Body, code);
                LeaveBlock(block);
                code.CloseBrace();
                break;
            case VariableDeclaration declaration:
                foreach (var variable in declaration.Declarations)
                {
                    if (variable.Id is not Identifier id)
                        throw new NotSupportedException("Destructured local variable.");
                    if (_helpers.TryGetValue(id.Name, out var helper))
                    {
                        if (helper.Params.Count != 1 || helper.Params[0] is not Identifier parameter)
                            throw new NotSupportedException("Local helpers require one argument.");
                        if (IsBuiltin(parameterName) || _locals.Keys.Any(IsBuiltin))
                            throw new NotSupportedException("Local helpers cannot capture shadowed builtins.");
                        var body = new PrimitiveRuleConverter(
                            parameter.Name,
                            "helperInput",
                            "helper_" + Local(id.Name) + "_"
                        ).Convert(helper);
                        code.AppendLine($"static object? {Local(id.Name)}(object? helperInput)");
                        code.OpenBrace();
                        foreach (var line in body.Split('\n'))
                            code.AppendLine(line);
                        code.CloseBrace();
                        _assigned.Add(id.Name);
                        continue;
                    }
                    code.AppendLine($"{Local(id.Name)} = {Expression(variable.Init)};");
                    _assigned.Add(id.Name);
                }
                break;
            case ExpressionStatement { Expression: AssignmentExpression assignment }:
                Assign(assignment, code);
                break;
            case ExpressionStatement { Expression: CallExpression iteration } when IsForEach(iteration):
                ForEach(iteration, code);
                break;
            case ExpressionStatement discarded:
                // Evaluate validated expressions, but never turn a discarded default into an assignment.
                code.AppendLine($"_ = {Expression(discarded.Expression)};");
                break;
            case IfStatement conditional:
                if (conditional.Test is Literal { Value: bool condition })
                {
                    var selected = condition ? conditional.Consequent : conditional.Alternate;
                    if (selected != null)
                        Statement(selected, code);
                    break;
                }
                code.AppendLine($"if (JsTruthy({Expression(conditional.Test)}))");
                var before = new HashSet<string>(_assigned, StringComparer.Ordinal);
                Body(conditional.Consequent, code);
                var yes = _assigned;
                _assigned = new(before, StringComparer.Ordinal);
                if (conditional.Alternate != null)
                {
                    code.AppendLine("else");
                    Body(conditional.Alternate, code);
                }
                if (!Returns(conditional.Consequent))
                {
                    if (conditional.Alternate != null && Returns(conditional.Alternate))
                        _assigned = yes;
                    else
                        _assigned.IntersectWith(yes);
                }
                break;
            case ReturnStatement result:
                code.AppendLine($"return {Expression(result.Argument)};");
                break;
            case EmptyStatement:
            case DebuggerStatement:
                break;
            default:
                throw new NotSupportedException($"Statement {statement.Type} requires manual conversion.");
        }
    }

    private void Assign(AssignmentExpression assignment, IndentedStringBuilder code)
    {
        string target;
        string? name = null;
        if (assignment.Left is Identifier id && _locals.ContainsKey(id.Name) && !_constantLocals.Contains(id.Name))
        {
            if (_lexical.Contains(id.Name) && !_assigned.Contains(id.Name))
                throw new NotSupportedException("Assignment precedes a block-scoped declaration or escapes its scope.");
            target = Local(id.Name);
            name = id.Name;
        }
        else if (
            assignment.Left is MemberExpression { Object: Identifier obj } member
            && obj.Name == parameterName
            && parameterValue == "obj"
        )
            target = $"{parameterValue}[{PropertyKey(member)}]";
        else
            throw new NotSupportedException("Assignment target is not a rule input or local.");
        var value = Expression(assignment.Right);
        if (assignment.Operator.ToString() != "Assignment")
        {
            var left = assignment.Left is Expression expression
                ? Expression(expression)
                : throw new NotSupportedException("Unsupported assignment.");
            value = Operation(
                assignment.Operator.ToString().Replace("Assignment", "", StringComparison.Ordinal),
                left,
                value
            );
        }
        code.AppendLine($"{target} = {value};");
        if (name != null)
            _assigned.Add(name);
    }

    private void Body(Statement statement, IndentedStringBuilder code)
    {
        code.OpenBrace();
        if (statement is BlockStatement block)
        {
            Statements(block.Body, code);
            LeaveBlock(block);
        }
        else
            Statement(statement, code);
        code.CloseBrace();
    }

    private void RegisterDeclaration(string name, VariableDeclaration declaration)
    {
        if (declaration.Kind.ToString() != "Var")
            _lexical.Add(name);
        if (declaration.Kind.ToString() == "Const")
            _constantLocals.Add(name);
    }

    private void LeaveBlock(BlockStatement block) =>
        _assigned.ExceptWith(
            block
                .Body.OfType<VariableDeclaration>()
                .Where(declaration => declaration.Kind.ToString() != "Var")
                .SelectMany(declaration => declaration.Declarations)
                .Select(declaration => ((Identifier)declaration.Id).Name)
        );

    private string Expression(Expression? expression)
    {
        if (++_steps > 4096)
            throw new NotSupportedException("Rule exceeds the conversion size limit.");
        return expression switch
        {
            null => "Undefined",
            RegExpLiteral => throw new NotSupportedException("Regex values are only supported in literal tests."),
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
            Identifier id when _helpers.ContainsKey(id.Name) => throw new NotSupportedException(
                "Helper values cannot escape their calls."
            ),
            Identifier id when _locals.ContainsKey(id.Name) => ReadLocal(id.Name),
            Identifier id when id.Name == parameterName => parameterValue,
            Identifier { Name: "undefined" } => "Undefined",
            Identifier { Name: "Infinity" } => "double.PositiveInfinity",
            Identifier { Name: "NaN" } => "double.NaN",
            ChainExpression chain when IsSimpleOptionalChain(chain.Expression) => Expression(chain.Expression),
            ParenthesizedExpression parentheses => Expression(parentheses.Expression),
            MemberExpression
            {
                Object: Identifier { Name: "Number" },
                Property: Identifier { Name: "MAX_SAFE_INTEGER" },
                Computed: false
            } => "9007199254740991d",
            MemberExpression { Object: Identifier obj } member
                when obj.Name == parameterName && parameterValue == "obj" =>
                $"JsGet({parameterValue}, {PropertyKey(member)})",
            MemberExpression { Property: Identifier { Name: "length" }, Computed: false } member =>
                $"JsLength({Expression(member.Object)}, {Flag(member.Optional)})",
            ConditionalExpression conditional =>
                $"(JsTruthy({Expression(conditional.Test)}) ? (object?)({Expression(conditional.Consequent)}) : (object?)({Expression(conditional.Alternate)}))",
            LogicalExpression logical => Logical(logical),
            BinaryExpression binary => Operation(
                binary.Operator.ToString(),
                Expression(binary.Left),
                Expression(binary.Right)
            ),
            UnaryExpression unary => unary.Operator.ToString() switch
            {
                "UnaryPlus" => $"JsNumber({Expression(unary.Argument)})",
                "UnaryNegation" => $"(-JsNumber({Expression(unary.Argument)}))",
                "LogicalNot" => $"(!JsTruthy({Expression(unary.Argument)}))",
                _ => throw new NotSupportedException("Unsupported unary operator."),
            },
            CallExpression call => Call(call),
            TemplateLiteral template => Template(template),
            _ => throw new NotSupportedException($"Expression {expression.Type} requires manual conversion."),
        };
    }

    private static string Operation(string op, string left, string right) =>
        op switch
        {
            "Addition" => $"JsAdd({left}, {right})",
            "Subtraction" => $"(JsNumber({left}) - JsNumber({right}))",
            "Multiplication" => $"(JsNumber({left}) * JsNumber({right}))",
            "Division" => $"(JsNumber({left}) / JsNumber({right}))",
            "Remainder" => $"(JsNumber({left}) % JsNumber({right}))",
            "Equality" => $"JsEquals({left}, {right})",
            "Inequality" => $"(!JsEquals({left}, {right}))",
            "StrictEquality" => $"JsStrictEquals({left}, {right})",
            "StrictInequality" => $"(!JsStrictEquals({left}, {right}))",
            "GreaterThan" => $"(JsCompare({left}, {right}) > 0)",
            "GreaterThanOrEqual" => $"(JsCompare({left}, {right}) >= 0)",
            "LessThan" => $"(JsCompare({left}, {right}) < 0)",
            "LessThanOrEqual" => $"(JsCompare({left}, {right}) <= 0)",
            _ => throw new NotSupportedException($"Unsupported operator {op}."),
        };

    private string Logical(LogicalExpression logical) =>
        logical.Operator.ToString() switch
        {
            "LogicalAnd" => $"JsAnd({Expression(logical.Left)}, () => {Expression(logical.Right)})",
            "LogicalOr" => $"JsOr({Expression(logical.Left)}, () => {Expression(logical.Right)})",
            "NullishCoalescing" => $"JsCoalesce({Expression(logical.Left)}, () => {Expression(logical.Right)})",
            _ => throw new NotSupportedException("Unsupported logical operator."),
        };

    private string Call(CallExpression call)
    {
        if (call.Optional)
            throw new NotSupportedException("Optional method calls require manual conversion.");
        if (call.Callee is Identifier name && _helpers.ContainsKey(name.Name) && call.Arguments.Count == 1)
        {
            if (!_assigned.Contains(name.Name))
                throw new NotSupportedException("Local helper is called before its declaration.");
            return $"{Local(name.Name)}({Expression(call.Arguments[0])})";
        }
        if (call.Callee is Identifier builtin && !_locals.ContainsKey(builtin.Name) && builtin.Name != parameterName)
        {
            if (call.Arguments.Count != 1)
                throw new NotSupportedException("Expected one conversion argument.");
            var argument = Expression(call.Arguments[0]);
            return builtin.Name switch
            {
                "Number" => $"JsNumber({argument})",
                "String" => $"JsString({argument})",
                "isNaN" => $"double.IsNaN(JsNumber({argument}))",
                "isFinite" => $"double.IsFinite(JsNumber({argument}))",
                "parseInt" => $"JsParseInt({argument})",
                "parseFloat" => $"JsParseFloat({argument})",
                _ => throw new NotSupportedException("Unsupported function call."),
            };
        }
        if (call.Callee is not MemberExpression { Property: Identifier method, Computed: false } member)
            throw new NotSupportedException("Unsupported function call.");
        if (method.Name == "every")
            return Every(call, member);
        if (
            member.Object is Identifier { Name: "Number" }
            && !_locals.ContainsKey("Number")
            && parameterName != "Number"
            && method.Name == "isFinite"
            && call.Arguments.Count == 1
        )
            return $"JsFiniteNumber({Expression(call.Arguments[0])})";
        if (
            member.Object is Identifier { Name: "Math" }
            && !_locals.ContainsKey("Math")
            && parameterName != "Math"
            && call.Arguments.Count == 1
        )
        {
            var number = $"JsNumber({Expression(call.Arguments[0])})";
            return method.Name switch
            {
                "round" => $"JsRound({number})",
                "abs" => $"Math.Abs({number})",
                "floor" => $"Math.Floor({number})",
                "ceil" => $"Math.Ceiling({number})",
                _ => throw new NotSupportedException("Unsupported Math function."),
            };
        }
        if (member.Object is RegExpLiteral regex && method.Name == "test" && call.Arguments.Count == 1)
        {
            // Restrict this translation to the observed digit-only normalizer. General
            // JS regex flags, Unicode and stateful lastIndex behavior need separate support.
            if (regex.Raw != @"/^\d+$/")
                throw new NotSupportedException("Unsupported regex test.");
            return $"JsDigits({Expression(call.Arguments[0])})";
        }
        var receiver = Expression(member.Object);
        var optional = Flag(member.Optional);
        if (method.Name == "toString" && call.Arguments.Count == 0)
            return $"JsToString({receiver}, {optional})";
        if (method.Name == "trim" && call.Arguments.Count == 0)
            return $"JsTrim({receiver}, {optional})";
        if (call.Arguments.Count != 1)
            throw new NotSupportedException("Expected one method argument.");
        var value = Expression(call.Arguments[0]);
        return method.Name switch
        {
            "toFixed" => $"JsFixed({receiver}, {value}, {optional})",
            "includes" => $"JsIncludes({receiver}, {value}, {optional})",
            "split" => $"JsSplit({receiver}, {value}, {optional})",
            _ => throw new NotSupportedException($"Unsupported method {method.Name}."),
        };
    }

    private string Every(CallExpression call, MemberExpression member)
    {
        if (
            member.Optional
            || call.Arguments.Count != 1
            || call.Arguments[0] is not IFunction callback
            || callback.Async
            || callback.Generator
            || callback.Params.Count != 1
            || callback.Params[0] is not Identifier parameter
            || callback.Body is not Expression predicate
            || _locals.ContainsKey(parameter.Name)
            || parameter.Name == parameterName
            || IsBuiltin(parameter.Name)
        )
            throw new NotSupportedException(
                "List every requires an unshadowed parameter and a pure expression callback."
            );
        var source = Expression(member.Object);
        var local = "item_" + _steps;
        _locals.Add(parameter.Name, local);
        try
        {
            return $"JsItems({source}).All({local} => JsTruthy({Expression(predicate)}))";
        }
        finally
        {
            _locals.Remove(parameter.Name);
        }
    }

    private static bool IsSimpleOptionalChain(Expression expression) =>
        expression switch
        {
            MemberExpression { Object: Identifier or MemberExpression { Object: Identifier }, Optional: true } => true,
            CallExpression
            {
                Callee: MemberExpression { Object: MemberExpression { Object: Identifier }, Optional: true }
            } => true,
            _ => false,
        };

    private string Template(TemplateLiteral template)
    {
        var parts = new List<string>();
        for (var index = 0; index < template.Quasis.Count; index++)
        {
            parts.Add(
                Quote(
                    template.Quasis[index].Value.Cooked ?? throw new NotSupportedException("Invalid template literal.")
                )
            );
            if (index < template.Expressions.Count)
                parts.Add($"JsString({Expression(template.Expressions[index])})");
        }
        return "(" + string.Join(" + ", parts) + ")";
    }

    private static bool IsForEach(CallExpression call) =>
        call.Callee is MemberExpression { Property: Identifier { Name: "forEach" }, Computed: false };

    private void ForEach(CallExpression call, IndentedStringBuilder code)
    {
        if (
            call.Callee is not MemberExpression member
            || call.Arguments.Count != 1
            || call.Arguments[0] is not IFunction callback
            || callback.Async
            || callback.Generator
            || callback.Params.Count != 1
            || callback.Params[0] is not Identifier parameter
            || callback.Body is not BlockStatement block
            || Returns(block)
            || _locals.ContainsKey(parameter.Name)
            || parameter.Name == parameterName
        )
            throw new NotSupportedException(
                "Only synchronous split-list forEach callbacks without returns are supported."
            );
        var source = Expression(member.Object);
        var previous = new Dictionary<string, string>(_locals, StringComparer.Ordinal);
        var assigned = new HashSet<string>(_assigned, StringComparer.Ordinal);
        var local = "item_" + _steps;
        _locals.Add(parameter.Name, local);
        foreach (var declaration in block.Body.OfType<VariableDeclaration>())
        {
            foreach (var variable in declaration.Declarations)
            {
                if (variable.Id is not Identifier id || !_locals.TryAdd(id.Name, localPrefix + _locals.Count))
                    throw new NotSupportedException("Shadowed callback variable.");
                RegisterDeclaration(id.Name, declaration);
            }
        }
        code.AppendLine($"foreach (var {local} in JsItems({source}))");
        code.OpenBrace();
        foreach (var name in _locals.Keys.Except(previous.Keys).Where(name => name != parameter.Name))
            code.AppendLine($"object? {Local(name)} = Undefined;");
        Statements(block.Body, code);
        code.CloseBrace();
        _lexical.ExceptWith(_locals.Keys.Except(previous.Keys));
        _constantLocals.ExceptWith(_locals.Keys.Except(previous.Keys));
        _locals.Clear();
        foreach (var pair in previous)
            _locals.Add(pair.Key, pair.Value);
        _assigned = assigned;
    }

    private string PropertyKey(MemberExpression member)
    {
        if (member.Computed)
            return $"JsString({Expression(member.Property)})";
        return member.Property is Identifier key
            ? Quote(key.Name)
            : throw new NotSupportedException("Unsupported property key.");
    }

    private string ReadLocal(string name)
    {
        if (_assigned.Contains(name))
            return Local(name);
        if (_implicit.Contains(name))
            throw new NotSupportedException($"Implicit global '{name}' can retain state from a previous invocation.");
        if (_lexical.Contains(name))
            throw new NotSupportedException(
                $"Block-scoped variable '{name}' is read before its declaration or outside its scope."
            );
        return Local(name);
    }

    private string Local(string name) => _locals[name];

    private static bool IsBuiltin(string name) =>
        name
            is "undefined"
                or "Infinity"
                or "NaN"
                or "Math"
                or "Number"
                or "String"
                or "parseInt"
                or "parseFloat"
                or "isNaN"
                or "isFinite";

    private static string Flag(bool value) => value ? "true" : "false";

    internal static string Quote(string value) => JsonSerializer.Serialize(value);

    // Included in the generated app, rather than adding a runtime dependency on studioctl.
    internal const string Runtime = """
        private sealed class JsUndefined { }
        private static readonly object Undefined = new JsUndefined();
        private static object? JsInput(object? value) => value switch
        {
            string or bool => value,
            IConvertible convertible when convertible.GetTypeCode() is >= TypeCode.SByte and <= TypeCode.Decimal =>
                Convert.ToDouble(value, System.Globalization.CultureInfo.InvariantCulture),
            _ => null,
        };
        private static object? JsGet(Dictionary<string, object?> obj, string key) =>
            obj.TryGetValue(key, out var value) ? value : Undefined;
        private static bool JsFiniteNumber(object? value) =>
            value is IConvertible number && number.GetTypeCode() is >= TypeCode.SByte and <= TypeCode.Decimal
            && double.IsFinite(JsNumber(value));
        private static object? JsAnd(object? left, Func<object?> right) => JsTruthy(left) ? right() : left;
        private static object? JsOr(object? left, Func<object?> right) => JsTruthy(left) ? left : right();
        private static object? JsCoalesce(object? left, Func<object?> right) => left is null or JsUndefined ? right() : left;
        private static bool JsTruthy(object? value) => value switch
        {
            null or JsUndefined => false,
            bool boolean => boolean,
            string text => text.Length != 0,
            IConvertible convertible when convertible.GetTypeCode() is >= TypeCode.SByte and <= TypeCode.Decimal =>
                JsNumber(value) is var number && number != 0 && !double.IsNaN(number),
            _ => true,
        };
        private static double JsNumber(object? value) => value switch
        {
            null => 0,
            bool boolean => boolean ? 1 : 0,
            string text => JsNumberText(text),
            IConvertible convertible when convertible.GetTypeCode() is >= TypeCode.SByte and <= TypeCode.Decimal =>
                Convert.ToDouble(value, System.Globalization.CultureInfo.InvariantCulture),
            _ => double.NaN,
        };
        private static string JsTrimText(string text) => text.Trim(
            '\u0009', '\u000A', '\u000B', '\u000C', '\u000D', '\u0020', '\u00A0', '\u1680',
            '\u2000', '\u2001', '\u2002', '\u2003', '\u2004', '\u2005', '\u2006', '\u2007',
            '\u2008', '\u2009', '\u200A', '\u2028', '\u2029', '\u202F', '\u205F', '\u3000', '\uFEFF');
        private static double JsNumberText(string text)
        {
            text = JsTrimText(text);
            if (text.Length == 0) return 0;
            if (text.StartsWith("0x", StringComparison.OrdinalIgnoreCase)) return JsRadix(text[2..], 16, false);
            if (text.StartsWith("0b", StringComparison.OrdinalIgnoreCase)) return JsRadix(text[2..], 2, false);
            if (text.StartsWith("0o", StringComparison.OrdinalIgnoreCase)) return JsRadix(text[2..], 8, false);
            if (!System.Text.RegularExpressions.Regex.IsMatch(text,
                @"\A[+-]?(?:Infinity|(?:[0-9]+\.?[0-9]*|\.[0-9]+)(?:[eE][+-]?[0-9]+)?)\z")) return double.NaN;
            return double.TryParse(text, System.Globalization.NumberStyles.Float,
                System.Globalization.CultureInfo.InvariantCulture, out var number) ? number : double.NaN;
        }
        private static double JsRadix(string text, int radix, bool prefix)
        {
            var value = System.Numerics.BigInteger.Zero;
            int count = 0;
            foreach (char character in text)
            {
                int digit = character is >= '0' and <= '9' ? character - '0' :
                    character is >= 'a' and <= 'z' ? character - 'a' + 10 :
                    character is >= 'A' and <= 'Z' ? character - 'A' + 10 : -1;
                if (digit < 0 || digit >= radix) return prefix && count > 0 ? (double)value : double.NaN;
                value = value * radix + digit;
                count++;
            }
            return count == 0 ? double.NaN : (double)value;
        }
        private static double JsParseInt(object? value)
        {
            var text = JsTrimText(JsString(value));
            bool negative = text.StartsWith('-');
            if (text.StartsWith('-') || text.StartsWith('+')) text = text[1..];
            bool hexadecimal = text.StartsWith("0x", StringComparison.OrdinalIgnoreCase);
            var number = JsRadix(hexadecimal ? text[2..] : text, hexadecimal ? 16 : 10, true);
            return negative ? -number : number;
        }
        private static object JsAdd(object? left, object? right) =>
            left is string || right is string ? JsString(left) + JsString(right) : JsNumber(left) + JsNumber(right);
        private static string JsString(object? value) => value switch
        {
            JsUndefined => "undefined",
            null => "null",
            bool boolean => boolean ? "true" : "false",
            double number => JsNumberString(number),
            _ => Convert.ToString(value, System.Globalization.CultureInfo.InvariantCulture) ?? "",
        };
        private static string JsNumberString(double number)
        {
            if (number == 0) return "0";
            var text = number.ToString("R", System.Globalization.CultureInfo.InvariantCulture);
            var parts = text.Split('E');
            if (parts.Length == 1) return text;
            int exponent = int.Parse(parts[1], System.Globalization.CultureInfo.InvariantCulture);
            if (exponent < -6 || exponent >= 21)
                return parts[0] + "e" + (exponent >= 0 ? "+" : "") + exponent.ToString(System.Globalization.CultureInfo.InvariantCulture);
            bool negative = parts[0].StartsWith('-');
            var digits = parts[0].TrimStart('-').Replace(".", "", StringComparison.Ordinal);
            int position = exponent + 1;
            var expanded = position <= 0 ? "0." + new string('0', -position) + digits :
                position >= digits.Length ? digits + new string('0', position - digits.Length) : digits.Insert(position, ".");
            return negative ? "-" + expanded : expanded;
        }
        private static bool JsEquals(object? left, object? right) =>
            left is null or JsUndefined || right is null or JsUndefined ?
                left is null or JsUndefined && right is null or JsUndefined :
            left is string a && right is string b ? a == b : JsNumber(left) == JsNumber(right);
        private static bool JsStrictEquals(object? left, object? right) =>
            left is JsUndefined || right is JsUndefined ? left is JsUndefined && right is JsUndefined :
            left is null || right is null ? left is null && right is null :
            left is string a && right is string b ? a == b :
            left is bool x && right is bool y ? x == y :
            left is double l && right is double r ? l == r : ReferenceEquals(left, right);
        private static object? JsToString(object? value, bool optional)
        {
            if (value is null or JsUndefined)
                return optional ? Undefined : throw new InvalidOperationException("Cannot call toString on null or undefined.");
            return JsString(value);
        }
        private static object? JsTrim(object? value, bool optional) => value switch
        {
            string text => JsTrimText(text),
            null or JsUndefined when optional => Undefined,
            _ => throw new InvalidOperationException("trim requires a string."),
        };
        private static object? JsIncludes(object? value, object? search, bool optional) => value switch
        {
            string text => text.Contains(JsString(search), StringComparison.Ordinal),
            null or JsUndefined when optional => Undefined,
            _ => throw new InvalidOperationException("includes requires a string."),
        };
        private static object JsSplit(object? value, object? separator, bool optional)
        {
            if (value is null or JsUndefined && optional) return Undefined;
            if (value is not string text) throw new InvalidOperationException("split requires a string.");
            if (separator is JsUndefined) return new[] { text };
            var delimiter = JsString(separator);
            return delimiter.Length == 0 ? text.Select(character => character.ToString()).ToArray() :
                text.Split(new[] { delimiter }, StringSplitOptions.None);
        }
        private static IEnumerable<object?> JsItems(object? value) => value is string[] items ? items :
            throw new InvalidOperationException("forEach requires a split list.");
        private static object? JsLength(object? value, bool optional) => value switch
        {
            string text => (double)text.Length,
            string[] items => (double)items.Length,
            null or JsUndefined when optional => Undefined,
            null or JsUndefined => throw new InvalidOperationException("Cannot read length of null or undefined."),
            _ => Undefined,
        };
        private static bool JsDigits(object? value) => System.Text.RegularExpressions.Regex.IsMatch(
            JsString(value), @"\A[0-9]+\z");
        private static object? JsFixed(object? value, object? digits, bool optional)
        {
            if (value is null or JsUndefined && optional) return Undefined;
            if (value is not double number) throw new InvalidOperationException("toFixed requires a number.");
            var places = Math.Truncate(JsNumber(digits));
            if (double.IsNaN(places)) places = 0;
            if (places < 0 || places > 100) throw new ArgumentOutOfRangeException(nameof(digits));
            return JsToFixed(number, (int)places);
        }
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
            var match = System.Text.RegularExpressions.Regex.Match(JsTrimText(JsString(value)),
                @"^[+-]?(?:Infinity|(?:[0-9]+\.?[0-9]*|\.[0-9]+)(?:[eE][+-]?[0-9]+)?)");
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
