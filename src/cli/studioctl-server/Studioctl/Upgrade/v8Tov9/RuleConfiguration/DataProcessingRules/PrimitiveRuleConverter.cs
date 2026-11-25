using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.DataProcessingRules;

// Best-effort translation of a legacy calculation function into a C# method over the typed data
// model. Numbers become decimal, text stays string, and JS conversions map to their usual C#
// counterparts. The result is plausible code for the app developer to review, not an exact
// emulation of JavaScript. Shapes without a natural C# form are left for manual conversion.
internal sealed partial class PrimitiveRuleConverter(IReadOnlyDictionary<string, ModelMember> inputs, string outputType)
{
    private enum Kind
    {
        Number,
        NullableNumber,
        Text,
        Bool,
        List,
        Null,
    }

    private readonly record struct Value(string Code, Kind Kind);

    private sealed record Local(string Name, int Scope, Kind Kind);

    private readonly Dictionary<string, Local> _locals = new(StringComparer.Ordinal);
    private readonly HashSet<string> _names = new(StringComparer.Ordinal) { "model", "fields" };
    private readonly List<List<string>> _scopes = [];
    private readonly List<int> _scopeDepths = [];
    private string _parameter = "obj";
    private int _depth;

    public bool UsesToNumber { get; private set; }

    public string Convert(IFunction function)
    {
        if (function.Params is not [Identifier parameter] || function.Body is not BlockStatement body)
            throw new NotSupportedException("Expected a function with one input object and a block body.");
        _parameter = parameter.Name;
        var code = new IndentedStringBuilder();
        if (UsesComputedInput(body, _parameter))
        {
            // obj[key] reads one of the mapped numeric inputs by name.
            code.AppendLine("var fields = new Dictionary<string, decimal?>");
            code.OpenBrace();
            foreach (
                var (key, member) in inputs.Where(pair => KindOf(pair.Value) is Kind.Number or Kind.NullableNumber)
            )
                code.AppendLine($"[{Quote(key)}] = {Read(member)},");
            code.Unindent();
            code.AppendLine("};");
        }
        OpenScope(code);
        Statements(body.Body, code);
        if (!Returns(body))
            code.AppendLine("return null;");
        return PlaceDeclarations(code.ToString());
    }

    private static bool UsesComputedInput(Node node, string parameter) =>
        node is MemberExpression { Computed: true, Object: Identifier obj } && obj.Name == parameter
        || node.ChildNodes.Any(child => UsesComputedInput(child, parameter));

    private static Kind ToKind(string type) =>
        type.TrimEnd('?') switch
        {
            "decimal" when !type.EndsWith('?') => Kind.Number,
            "decimal" or "int" or "long" or "double" or "float" or "short" => Kind.NullableNumber,
            "string" => Kind.Text,
            "bool" => Kind.Bool,
            _ => throw new NotSupportedException($"Model type '{type}' has no plain C# translation."),
        };

    // A value read through a null-conditional parent is nullable even if the property is not.
    private static string Read(ModelMember member) =>
        member.Type switch
        {
            "decimal?" or "string?" => member.Read,
            "decimal" or "bool" when !member.Read.Contains("?.", StringComparison.Ordinal) => member.Read,
            "bool" or "bool?" => $"{member.Read} == true",
            _ => $"(decimal?){member.Read}",
        };

    private static Kind KindOf(ModelMember member) =>
        ToKind(member.Type) == Kind.Number && member.Read.Contains("?.", StringComparison.Ordinal)
            ? Kind.NullableNumber
            : ToKind(member.Type);

    private static bool Returns(Statement statement) =>
        statement switch
        {
            ReturnStatement => true,
            BlockStatement block => block.Body.Any(Returns),
            IfStatement { Test: Literal { Value: true } } branch => Returns(branch.Consequent),
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
        switch (statement)
        {
            case BlockStatement block:
                Block(block, code);
                break;
            case VariableDeclaration declaration:
                foreach (var variable in declaration.Declarations)
                {
                    if (variable.Id is not Identifier id || variable.Init is IFunction)
                        throw new NotSupportedException("Destructuring and local functions need manual conversion.");
                    if (variable.Init != null)
                        Assign(id.Name, Expression(variable.Init), code);
                }
                break;
            case ExpressionStatement { Expression: AssignmentExpression assignment }:
                Assign(assignment, code);
                break;
            case ExpressionStatement { Expression: CallExpression call } when IsMethod(call, "forEach"):
                ForEach(call, code);
                break;
            case ExpressionStatement or EmptyStatement or DebuggerStatement:
                // A discarded expression such as obj.a ? obj.a : 0 has no effect.
                break;
            case IfStatement { Test: Literal { Value: bool condition } } constant:
                // if (true) { ... } runs its block in place.
                var selected = condition ? constant.Consequent : constant.Alternate;
                if (selected is BlockStatement inner)
                    Statements(inner.Body, code);
                else if (selected != null)
                    Statement(selected, code);
                break;
            case IfStatement conditional:
                code.AppendLine($"if ({Truthy(Expression(conditional.Test))})");
                Block(conditional.Consequent, code);
                if (conditional.Alternate != null)
                {
                    code.AppendLine("else");
                    Block(conditional.Alternate, code);
                }
                break;
            case ReturnStatement result:
                code.AppendLine($"return {Output(Expression(result.Argument))};");
                break;
            default:
                throw new NotSupportedException($"Statement {statement.Type} needs manual conversion.");
        }
    }

    private void Block(Statement statement, IndentedStringBuilder code)
    {
        code.OpenBrace();
        _depth++;
        if (statement is BlockStatement block)
            Statements(block.Body, code);
        else
            Statement(statement, code);
        _depth--;
        code.CloseBrace();
    }

    private void Assign(AssignmentExpression assignment, IndentedStringBuilder code)
    {
        var name = assignment.Left switch
        {
            Identifier id when id.Name != _parameter => id.Name,
            MemberExpression { Object: Identifier obj, Computed: false, Property: Identifier key }
                when obj.Name == _parameter => _parameter + "." + key.Name,
            _ => throw new NotSupportedException("Assignment target needs manual conversion."),
        };
        var op = assignment.Operator.ToString().Replace("Assignment", "", StringComparison.Ordinal);
        var right = Expression(assignment.Right);
        if (op.Length == 0)
        {
            Assign(name, right, code);
            return;
        }
        var symbol = op switch
        {
            "Addition" => "+",
            "Subtraction" => "-",
            "Multiplication" => "*",
            "Division" => "/",
            _ => throw new NotSupportedException($"Assignment operator {op} needs manual conversion."),
        };
        // sum += value stays a compound assignment on a local that already exists.
        if (
            _locals.TryGetValue(name, out var local)
            && (local.Kind == Kind.Number || local.Kind == Kind.Text && symbol == "+")
        )
            code.AppendLine($"{local.Name} {symbol}= {(local.Kind == Kind.Text ? Text(right) : Number(right))};");
        else
            Assign(name, Binary(op, Expression((Expression)assignment.Left), right), code);
    }

    private void Assign(string name, Value value, IndentedStringBuilder code)
    {
        if (value.Kind == Kind.Null)
            throw new NotSupportedException("Assigning null or undefined to a local needs manual conversion.");
        if (!_locals.TryGetValue(name, out var local))
        {
            local = new(CSharpName(name.Split('.')[^1]), _scopes.Count - 1, value.Kind);
            _locals.Add(name, local);
            if (_depth == _scopeDepths[local.Scope])
            {
                code.AppendLine($"{TypeName(value.Kind)} {local.Name} = {value.Code};");
                return;
            }
            // First assigned in a nested block, so declare it where the whole function can see it.
            // An input copied to a local starts from the model value; JS locals start empty.
            var start = name.StartsWith(_parameter + ".", StringComparison.Ordinal)
                ? Convert(InputValue(name[(_parameter.Length + 1)..]), value.Kind)
                : Default(value.Kind);
            _scopes[local.Scope].Add($"{TypeName(value.Kind)} {local.Name} = {start};");
        }
        code.AppendLine($"{local.Name} = {Convert(value, local.Kind)};");
    }

    private static string TypeName(Kind kind) =>
        kind switch
        {
            Kind.Number => "decimal",
            Kind.NullableNumber => "decimal?",
            Kind.Text => "string?",
            Kind.Bool => "bool",
            _ => "string[]",
        };

    private static string Default(Kind kind) =>
        kind switch
        {
            Kind.Number => "0",
            Kind.Bool => "false",
            Kind.List => "[]",
            _ => "null",
        };

    private string Convert(Value value, Kind kind) =>
        kind switch
        {
            _ when value.Kind == kind => value.Code,
            Kind.Number => Number(value),
            Kind.NullableNumber when value.Kind is Kind.Number or Kind.Null => value.Code,
            Kind.NullableNumber => Number(value),
            Kind.Text => Text(value),
            Kind.Bool => Truthy(value),
            _ => throw new NotSupportedException("A local changes between incompatible types."),
        };

    // Convert the returned value to the output property's type.
    private string Output(Value value)
    {
        if (value.Kind == Kind.Null)
            return outputType.EndsWith('?') ? "null" : "default";
        return outputType.TrimEnd('?') switch
        {
            "string" => Text(value),
            "decimal" => value.Kind == Kind.NullableNumber && outputType.EndsWith('?') ? value.Code : Number(value),
            "bool" => Truthy(value),
            _ =>
                $"({outputType}){Paren(value.Kind == Kind.NullableNumber && outputType.EndsWith('?') ? value.Code : Number(value))}",
        };
    }

    private void OpenScope(IndentedStringBuilder code)
    {
        _scopes.Add([]);
        _scopeDepths.Add(_depth);
        code.AppendLine($"// @declarations {_scopes.Count - 1}");
    }

    private string PlaceDeclarations(string code)
    {
        var output = new StringBuilder();
        foreach (var line in code.TrimEnd('\n').Split('\n'))
        {
            var trimmed = line.TrimStart();
            if (!trimmed.StartsWith("// @declarations ", StringComparison.Ordinal))
                output.Append(line).Append('\n');
            else
                foreach (var declaration in _scopes[int.Parse(trimmed[17..], CultureInfo.InvariantCulture)])
                    output.Append(line[..(line.Length - trimmed.Length)]).Append(declaration).Append('\n');
        }
        return output.ToString();
    }

    private string CSharpName(string name)
    {
        var candidate = Identifier().IsMatch(name) ? name : "value";
        if (CSharpKeywords.Contains(candidate))
            candidate = "@" + candidate;
        return Unique(candidate, _names);
    }

    internal static string Unique(string name, HashSet<string> names)
    {
        var unique = name;
        var index = 1;
        while (!names.Add(unique))
            unique = name + ++index;
        return unique;
    }

    [GeneratedRegex("^[A-Za-z_][A-Za-z0-9_]*$")]
    private static partial Regex Identifier();

    private static readonly HashSet<string> CSharpKeywords = new(
        (
            "as base bool break byte case catch char checked class const continue decimal default delegate do "
            + "double else enum event explicit extern false finally fixed float for foreach goto if implicit in "
            + "int interface internal is lock long namespace new null object operator out override params private "
            + "protected public readonly ref return sbyte sealed short sizeof static string struct switch this "
            + "throw true try typeof uint ulong unchecked unsafe ushort using virtual void volatile while"
        ).Split(' '),
        StringComparer.Ordinal
    );

    private Value InputValue(string key) =>
        inputs.TryGetValue(key, out var member) ? new(Read(member), KindOf(member)) : new("null", Kind.Null);

    private Value Expression(Expression? expression) =>
        expression switch
        {
            null or Identifier { Name: "undefined" } or Literal { Value: null } => new("null", Kind.Null),
            Literal { Value: string text } => new(Quote(text), Kind.Text),
            Literal { Value: bool flag } => new(flag ? "true" : "false", Kind.Bool),
            Literal { Value: double or int or long } number => new(NumberLiteral(number), Kind.Number),
            Identifier id when _locals.TryGetValue(id.Name, out var local) => new(local.Name, local.Kind),
            Identifier id when id.Name == _parameter => new("true", Kind.Bool),
            // Decimal division by zero throws instead of producing Infinity.
            Identifier { Name: "Infinity" } => new("decimal.MaxValue", Kind.Number),
            ChainExpression chain => Expression(chain.Expression),
            ParenthesizedExpression inner => Expression(inner.Expression),
            MemberExpression
            {
                Object: Identifier { Name: "Number" },
                Property: Identifier { Name: "MAX_SAFE_INTEGER" }
            } => new("9007199254740991", Kind.Number),
            MemberExpression { Object: Identifier obj, Computed: false, Property: Identifier key }
                when obj.Name == _parameter => _locals.TryGetValue(_parameter + "." + key.Name, out var copy)
                ? new(copy.Name, copy.Kind)
                : InputValue(key.Name),
            MemberExpression { Object: Identifier obj, Computed: true } member when obj.Name == _parameter => new(
                $"fields.GetValueOrDefault({Text(Expression(member.Property))})",
                Kind.NullableNumber
            ),
            MemberExpression { Property: Identifier { Name: "length" }, Computed: false } member => Length(
                Expression(member.Object)
            ),
            ConditionalExpression conditional => Conditional(conditional),
            LogicalExpression logical => Logical(logical),
            BinaryExpression binary => Binary(
                binary.Operator.ToString(),
                Expression(binary.Left),
                Expression(binary.Right)
            ),
            UnaryExpression unary => unary.Operator.ToString() switch
            {
                "UnaryPlus" => new(Number(Expression(unary.Argument)), Kind.Number),
                "UnaryNegation" => new($"-{Paren(Number(Expression(unary.Argument)))}", Kind.Number),
                "LogicalNot" => new(Not(Truthy(Expression(unary.Argument))), Kind.Bool),
                _ => throw new NotSupportedException("Unsupported unary operator."),
            },
            CallExpression call => Call(call),
            TemplateLiteral template => Template(template),
            _ => throw new NotSupportedException($"Expression {expression.Type} needs manual conversion."),
        };

    // Whole numbers stay int literals, which C# converts to decimal; fractions get the m suffix.
    private static string NumberLiteral(Literal literal)
    {
        var number = System.Convert.ToDecimal(literal.Value, CultureInfo.InvariantCulture);
        return number == decimal.Truncate(number)
            ? number.ToString("0", CultureInfo.InvariantCulture)
            : number.ToString(CultureInfo.InvariantCulture) + "m";
    }

    private static Value Length(Value value) =>
        value.Kind switch
        {
            Kind.List => new($"{Paren(value.Code)}.Length", Kind.Number),
            Kind.Text => new($"({value.Code}?.Length ?? 0)", Kind.Number),
            _ => throw new NotSupportedException("length of a non-text value."),
        };

    private Value Conditional(ConditionalExpression conditional)
    {
        var test = Expression(conditional.Test);
        var yes = Expression(conditional.Consequent);
        var no = Expression(conditional.Alternate);
        // The legacy default idiom obj.a ? +obj.a : 0 reads a number or zero.
        if (
            no is { Kind: Kind.Number, Code: "0" }
            && yes.Kind is Kind.Number or Kind.NullableNumber or Kind.Text
            && test.Kind is Kind.Number or Kind.NullableNumber or Kind.Text or Kind.Null
            && Number(yes) == Number(test)
        )
            return new(Number(test), Kind.Number);
        var kind = (yes.Kind, no.Kind) switch
        {
            var (a, b) when a == b => a,
            (Kind.Null, var b) => Nullable(b),
            (var a, Kind.Null) => Nullable(a),
            (Kind.Number or Kind.NullableNumber, Kind.Number or Kind.NullableNumber) => Kind.NullableNumber,
            _ => Kind.Text,
        };
        return new($"{Paren(Truthy(test))} ? {Paren(Convert(yes, kind))} : {Paren(Convert(no, kind))}", kind);
    }

    private static Kind Nullable(Kind kind) =>
        kind switch
        {
            Kind.Number => Kind.NullableNumber,
            Kind.NullableNumber or Kind.Text => kind,
            _ => throw new NotSupportedException("A value is sometimes null."),
        };

    private Value Logical(LogicalExpression logical)
    {
        var left = Expression(logical.Left);
        var right = Expression(logical.Right);
        if (logical.Operator.ToString() == "NullishCoalescing")
            return left.Kind is Kind.NullableNumber && right.Kind == Kind.Number
                ? new($"{Paren(left.Code)} ?? {Paren(right.Code)}", Kind.Number)
                : new($"{Paren(left.Code)} ?? {Paren(right.Code)}", left.Kind);
        // Conditions combine as booleans. The obj && obj.a guard is always true for the input object.
        var and = logical.Operator.ToString() == "LogicalAnd";
        var neutral = and ? "true" : "false";
        var operands = new[] { Truthy(left), Truthy(right) }.Where(code => code != neutral).ToArray();
        if (operands.Length == 1)
            return new(operands[0], Kind.Bool);
        // Comparisons bind more tightly than && and ||, so only nested logic needs parentheses.
        operands = operands
            .Select(code =>
                code.Contains(" || ", StringComparison.Ordinal) || code.Contains(" ? ", StringComparison.Ordinal)
                    ? $"({code})"
                    : code
            )
            .ToArray();
        var separator = and ? " && " : " || ";
        return new(operands.Length == 0 ? neutral : string.Join(separator, operands), Kind.Bool);
    }

    private Value Binary(string op, Value left, Value right)
    {
        bool numeric(Value value) => value.Kind is Kind.Number or Kind.NullableNumber;
        // Arithmetic is left-associative, so a left operand needs parentheses only for lower precedence.
        string arithmetic(string symbol)
        {
            var first = Number(left);
            var sum =
                first.Contains(" + ", StringComparison.Ordinal) || first.Contains(" - ", StringComparison.Ordinal);
            var lower = first.Contains(" ?", StringComparison.Ordinal) || symbol is "*" or "/" or "%" && sum;
            return $"{(lower ? $"({first})" : first)} {symbol} {Paren(Number(right))}";
        }
        return op switch
        {
            "Addition" when left.Kind == Kind.Text || right.Kind == Kind.Text => new(
                $"{(Text(left).Contains(" ?", StringComparison.Ordinal) ? Paren(Text(left)) : Text(left))} + {Paren(Text(right))}",
                Kind.Text
            ),
            "Addition" => new(arithmetic("+"), Kind.Number),
            "Subtraction" => new(arithmetic("-"), Kind.Number),
            "Multiplication" => new(arithmetic("*"), Kind.Number),
            "Division" => new(arithmetic("/"), Kind.Number),
            "Remainder" => new(arithmetic("%"), Kind.Number),
            "Equality" or "StrictEquality" => Equals(left, right, "=="),
            "Inequality" or "StrictInequality" => Equals(left, right, "!="),
            "GreaterThan" => new($"{Paren(Number(left))} > {Paren(Number(right))}", Kind.Bool),
            "GreaterThanOrEqual" => new($"{Paren(Number(left))} >= {Paren(Number(right))}", Kind.Bool),
            "LessThan" => new($"{Paren(Number(left))} < {Paren(Number(right))}", Kind.Bool),
            "LessThanOrEqual" => new($"{Paren(Number(left))} <= {Paren(Number(right))}", Kind.Bool),
            _ => throw new NotSupportedException($"Operator {op} needs manual conversion."),
        };

        Value Equals(Value a, Value b, string symbol)
        {
            if (b.Kind == Kind.Null)
                (a, b) = (b, a);
            if (a.Kind == Kind.Null && b.Kind is Kind.Number or Kind.Bool or Kind.List)
                return new(symbol == "==" ? "false" : "true", Kind.Bool);
            if (a.Kind == Kind.Null)
                return new($"{Paren(b.Code)} is {(symbol == "==" ? "null" : "not null")}", Kind.Bool);
            // A text field compared with a number literal, such as a Yes/No code compared with 1.
            if (a.Kind == Kind.Text && b is { Kind: Kind.Number } && b.Code.All(char.IsDigit))
                return new($"{Paren(a.Code)} {symbol} {Quote(b.Code)}", Kind.Bool);
            if (b.Kind == Kind.Text && a is { Kind: Kind.Number } && a.Code.All(char.IsDigit))
                return new($"{Paren(b.Code)} {symbol} {Quote(a.Code)}", Kind.Bool);
            // A boolean compared with true, false, "true" or "false" is the boolean or its negation.
            if (b.Kind == Kind.Bool && a.Code is "true" or "false" or "\"true\"" or "\"false\"")
                (a, b) = (b, a);
            if (a.Kind == Kind.Bool && b.Code is "true" or "false" or "\"true\"" or "\"false\"")
                return new(
                    b.Code.Contains("true", StringComparison.Ordinal) == (symbol == "==") ? a.Code : Not(a.Code),
                    Kind.Bool
                );
            if (a.Kind == Kind.Bool && b.Kind == Kind.Text || a.Kind == Kind.Text && b.Kind == Kind.Bool)
                return new($"{Paren(Text(a))} {symbol} {Paren(Text(b))}", Kind.Bool);
            if (numeric(a) || numeric(b))
                return new(
                    $"{Paren(numeric(a) ? a.Code : Number(a))} {symbol} {Paren(numeric(b) ? b.Code : Number(b))}",
                    Kind.Bool
                );
            return new($"{Paren(a.Code)} {symbol} {Paren(b.Code)}", Kind.Bool);
        }
    }

    private string Number(Value value) =>
        value.Kind switch
        {
            Kind.Number => value.Code,
            Kind.NullableNumber => $"{Paren(value.Code)} ?? 0",
            Kind.Text => TextToNumber(value.Code),
            Kind.Bool => $"{Paren(value.Code)} ? 1 : 0",
            Kind.Null => "0",
            _ => throw new NotSupportedException("A list is used as a number."),
        };

    // Text from toFixed is rounded instead, and a numeric literal is used as it is.
    private string TextToNumber(string text)
    {
        if (FixedText().Match(text) is { Success: true } match)
            return $"Math.Round({match.Groups[1].Value}, {match.Groups[2].Value}, MidpointRounding.AwayFromZero)";
        if (System.Text.RegularExpressions.Regex.IsMatch(text, @"\A""-?[0-9]+(\.[0-9]+)?""\z"))
            return text.Trim('"');
        return ToNumber(text);
    }

    [GeneratedRegex(@"\A(.+)\.ToString\(""F([0-9]+)"", CultureInfo\.InvariantCulture\)\z")]
    private static partial Regex FixedText();

    private string ToNumber(string text)
    {
        UsesToNumber = true;
        return $"ToNumber({text})";
    }

    private static string Text(Value value) =>
        value.Kind switch
        {
            Kind.Text => value.Code,
            Kind.Number => $"{Paren(value.Code)}.ToString(CultureInfo.InvariantCulture)",
            Kind.NullableNumber => $"{Paren(value.Code)}?.ToString(CultureInfo.InvariantCulture)",
            Kind.Bool => $"{Paren(value.Code)} ? \"true\" : \"false\"",
            Kind.List => $"string.Join(\",\", {value.Code})",
            _ => "null",
        };

    private static string Truthy(Value value) =>
        value.Kind switch
        {
            Kind.Bool => value.Code,
            Kind.Number => $"{Paren(value.Code)} != 0",
            Kind.NullableNumber => $"{Paren(value.Code)} is not (null or 0)",
            Kind.Text => $"!string.IsNullOrEmpty({value.Code})",
            Kind.List => "true",
            _ => "false",
        };

    // Negating a negation, such as !!x, gives x.
    private static string Not(string code) =>
        code.StartsWith('!') && Atomic().IsMatch(code) ? code[1..] : $"!{Paren(code)}";

    private static string Paren(string code) => Atomic().IsMatch(code) ? code : $"({code})";

    // A name, literal, member access, call or index, possibly negated.
    [GeneratedRegex(@"\A!?(?:[\w.@]|\?\.|""[^""]*""|\((?:[^()]|\([^()]*\))*\)|\[[^\]]*\])+\z")]
    private static partial Regex Atomic();

    private Value Call(CallExpression call)
    {
        if (call.Callee is MemberExpression { Property: Identifier { Name: "every" } } list)
            return Every(call, list);
        if (call.Arguments.Count > 1)
            throw new NotSupportedException("Calls with several arguments need manual conversion.");
        var argument = call.Arguments.Count == 1 ? Expression(call.Arguments[0]) : default;
        switch (call.Callee)
        {
            case Identifier { Name: "Number" or "parseFloat" }:
                return new(Number(argument), Kind.Number);
            case Identifier { Name: "parseInt" }:
                return new($"decimal.Truncate({Number(argument)})", Kind.Number);
            case Identifier { Name: "String" }:
                return new(Text(argument), Kind.Text);
            case Identifier { Name: "isNaN" }:
                return argument.Kind == Kind.Text
                    ? new($"!decimal.TryParse({argument.Code}, CultureInfo.InvariantCulture, out _)", Kind.Bool)
                    : new("false", Kind.Bool);
            case MemberExpression { Object: Identifier { Name: "Number" }, Property: Identifier { Name: "isFinite" } }:
                return new(argument.Kind == Kind.Text ? "false" : "true", Kind.Bool);
            case MemberExpression { Object: Identifier { Name: "Math" }, Property: Identifier math }:
                return math.Name switch
                {
                    "round" => new($"Math.Round({Number(argument)}, MidpointRounding.AwayFromZero)", Kind.Number),
                    "abs" => new($"Math.Abs({Number(argument)})", Kind.Number),
                    "floor" => new($"Math.Floor({Number(argument)})", Kind.Number),
                    "ceil" => new($"Math.Ceiling({Number(argument)})", Kind.Number),
                    _ => throw new NotSupportedException($"Math.{math.Name} needs manual conversion."),
                };
            case MemberExpression { Object: RegExpLiteral { Raw: @"/^\d+$/" }, Property: Identifier { Name: "test" } }:
                var digits = Text(argument);
                return new($"!string.IsNullOrEmpty({digits}) && ({digits} ?? \"\").All(char.IsAsciiDigit)", Kind.Bool);
            case MemberExpression { Property: Identifier method, Computed: false } member:
                return Method(method.Name, Expression(member.Object), argument, call.Arguments.Count);
            default:
                throw new NotSupportedException("Function call needs manual conversion.");
        }
    }

    private Value Method(string name, Value receiver, Value argument, int arguments) =>
        (name, arguments) switch
        {
            ("toString", 0) => new(Text(receiver), Kind.Text),
            ("toFixed", 1) when argument.Code.All(char.IsDigit) => new(
                $"{Paren(Number(receiver))}.ToString(\"F{argument.Code}\", CultureInfo.InvariantCulture)",
                Kind.Text
            ),
            ("trim", 0) when receiver.Kind == Kind.Text => new($"{receiver.Code}?.Trim()", Kind.Text),
            ("includes", 1) when receiver.Kind == Kind.List => new(
                $"{Paren(receiver.Code)}.Contains({Text(argument)})",
                Kind.Bool
            ),
            ("includes", 1) when receiver.Kind == Kind.Text => new(
                $"{receiver.Code}?.Contains({Text(argument)}) == true",
                Kind.Bool
            ),
            ("split", 1) when receiver.Kind == Kind.Text && argument.Kind == Kind.Text => new(
                $"({receiver.Code} ?? \"\").Split({argument.Code}, StringSplitOptions.RemoveEmptyEntries)",
                Kind.List
            ),
            _ => throw new NotSupportedException($"Method {name} needs manual conversion."),
        };

    private static bool IsMethod(CallExpression call, string name) =>
        call.Callee is MemberExpression { Property: Identifier property, Computed: false } && property.Name == name;

    private Value Every(CallExpression call, MemberExpression member)
    {
        var list = Expression(member.Object);
        if (
            list.Kind != Kind.List
            || call.Arguments is not [IFunction { Params: [Identifier item], Body: Expression predicate }]
        )
            throw new NotSupportedException("every needs manual conversion.");
        var local = Item(item.Name);
        var result = new Value($"{Paren(list.Code)}.All({local.Name} => {Truthy(Expression(predicate))})", Kind.Bool);
        _locals.Remove(item.Name);
        return result;
    }

    private void ForEach(CallExpression call, IndentedStringBuilder code)
    {
        var list = Expression(((MemberExpression)call.Callee).Object);
        if (
            list.Kind != Kind.List
            || call.Arguments is not [IFunction { Params: [Identifier item], Body: BlockStatement body }]
        )
            throw new NotSupportedException("forEach needs manual conversion.");
        var outer = _locals.Keys.ToHashSet(StringComparer.Ordinal);
        var local = Item(item.Name);
        code.AppendLine($"foreach (var {local.Name} in {list.Code})");
        code.OpenBrace();
        _depth++;
        OpenScope(code);
        // A return in a forEach callback only skips to the next item.
        foreach (var statement in body.Body)
        {
            if (statement is ReturnStatement)
                throw new NotSupportedException("return inside forEach needs manual conversion.");
            Statement(statement, code);
        }
        _depth--;
        code.CloseBrace();
        foreach (var name in _locals.Keys.Except(outer).ToArray())
            _locals.Remove(name);
    }

    private Local Item(string name)
    {
        var local = new Local(CSharpName(name), _scopes.Count - 1, Kind.Text);
        _locals[name] = local;
        return local;
    }

    private Value Template(TemplateLiteral template)
    {
        var text = new StringBuilder("$\"");
        var formatsNumbers = false;
        for (var index = 0; index < template.Quasis.Count; index++)
        {
            var quoted = Quote(template.Quasis[index].Value.Cooked ?? "");
            text.Append(
                quoted[1..^1].Replace("{", "{{", StringComparison.Ordinal).Replace("}", "}}", StringComparison.Ordinal)
            );
            if (index < template.Expressions.Count)
            {
                var value = Expression(template.Expressions[index]);
                formatsNumbers |= value.Kind is Kind.Number or Kind.NullableNumber;
                text.Append('{').Append(Paren(value.Kind == Kind.Bool ? Text(value) : value.Code)).Append('}');
            }
        }
        text.Append('"');
        // Numbers in text use the invariant culture, as JS did.
        return new(
            formatsNumbers ? $"string.Create(CultureInfo.InvariantCulture, {text})" : text.ToString(),
            Kind.Text
        );
    }

    internal static string Quote(string value) => JsonSerializer.Serialize(value);

    internal const string ToNumberHelper = """
        // JS converted text to a number with +text, Number(text) or parseFloat(text).
        private static decimal ToNumber(string? text) =>
            decimal.TryParse(text, NumberStyles.Float, CultureInfo.InvariantCulture, out var number) ? number : 0;
        """;
}
