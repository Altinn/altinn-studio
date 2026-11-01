using Acornima.Ast;
using Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.Models;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.ConditionalRenderingMatchers;

/// <summary>
/// Interface for pattern matchers that convert JavaScript AST expressions to expression language
/// </summary>
public interface IExpressionMatcher
{
    /// <summary>
    /// Checks if this matcher can handle the given expression
    /// </summary>
    bool CanMatch(Expression expression);

    /// <summary>
    /// Converts the expression to expression language format
    /// </summary>
    /// <param name="expression">The JavaScript AST expression</param>
    /// <param name="context">Context containing input parameter mappings</param>
    /// <param name="debugInfo">List to append debug information to</param>
    /// <returns>Expression language array structure, or null if conversion fails</returns>
    object? Match(Expression expression, ConversionContext context, List<string> debugInfo);
}

/// <summary>
/// Context for expression conversion containing parameter mappings and metadata
/// </summary>
public partial class ConversionContext
{
    public string? FailureReason { get; private set; }

    public object? Reject(string reason, List<string> debugInfo)
    {
        FailureReason ??= reason;
        debugInfo.Add(reason);
        return null;
    }

    /// <summary>
    /// Maps JavaScript parameter names (e.g., "value") to data model paths (e.g., "MyModel.Field.value")
    /// </summary>
    public Dictionary<string, string> InputParams { get; set; } = new();

    /// <summary>
    /// The name of the object parameter in the function (usually "obj")
    /// </summary>
    public string ObjectParameterName { get; set; } = "obj";

    /// <summary>
    /// Nested matcher chain for recursive expression conversion
    /// </summary>
    public List<IExpressionMatcher> Matchers { get; set; } = new();

    /// <summary>
    /// Flag indicating that the conversion requires environment settings to be added to the app
    /// This is set by matchers like WindowLocationMatcher when they convert environment checks
    /// </summary>
    public bool RequiresEnvironmentSettings { get; set; }

    /// <summary>
    /// Maps destructured variable names to their original property paths
    /// For example: { "summertRisiko" => "obj.summertRisiko" }
    /// </summary>
    public Dictionary<string, string> VariableMappings { get; set; } = new();

    /// <summary>
    /// Global constants extracted from the JavaScript file (e.g., var ShouldNotParticipate = 0;)
    /// Maps constant names to their literal values
    /// </summary>
    public IReadOnlyDictionary<string, object?> GlobalConstants { get; set; } = new Dictionary<string, object?>();

    /// <summary>
    /// Dictionary of available conditional functions for inlining cross-function calls
    /// Maps function name to its AST representation
    /// </summary>
    public Dictionary<string, Acornima.Ast.Expression> AvailableFunctions { get; set; } = new();

    public Dictionary<string, JavaScriptFunction> FunctionDefinitions { get; set; } = new();
    public HashSet<string> ActiveFunctions { get; set; } = new(StringComparer.Ordinal);
    public IReadOnlyDictionary<string, string> InputTypes { get; set; } = new Dictionary<string, string>();
    public IReadOnlyDictionary<string, IReadOnlyList<string>> InputOptions { get; set; } =
        new Dictionary<string, IReadOnlyList<string>>();

    // Validating an unused initializer must not require a denominator guard which is
    // established only on the path where its value is used. These reads cannot mutate state.
    public bool IsPureValue(Expression expression) =>
        expression switch
        {
            Literal => true,
            Identifier id => id.Name == ObjectParameterName || GlobalConstants.ContainsKey(id.Name),
            MemberExpression member => TryGetInputName(member, out _),
            BinaryExpression binary => IsPureValue(binary.Left) && IsPureValue(binary.Right),
            UnaryExpression unary => IsPureValue(unary.Argument),
            ConditionalExpression choice => IsPureValue(choice.Test)
                && IsPureValue(choice.Consequent)
                && IsPureValue(choice.Alternate),
            _ => false,
        };

    public string? GetValueType(Expression expression) =>
        expression switch
        {
            Literal { Value: string } => "string",
            Literal { Value: bool } => "boolean",
            Literal { Value: int or long or double or float } => "number",
            Literal { Value: null } => "null",
            Identifier { Name: "undefined" } => "undefined",
            Identifier identifier when identifier.Name == ObjectParameterName => "object",
            Identifier identifier when GlobalConstants.TryGetValue(identifier.Name, out var value) => value switch
            {
                string => "string",
                bool => "boolean",
                int or long or double or float => "number",
                null => "null",
                _ => null,
            },
            MemberExpression member
                when TryGetInputName(member, out var name) && InputTypes.TryGetValue(name, out var type) => type,
            MemberExpression member when TryGetInputName(member, out var name) && !InputParams.ContainsKey(name) =>
                "undefined",
            MemberExpression { Computed: false, Property: Identifier { Name: "length" } } => "number",
            UnaryExpression unary when unary.Operator.ToString() is "LogicalNot" or "!" => "boolean",
            UnaryExpression unary when unary.Operator.ToString() is "UnaryPlus" or "+" or "UnaryNegation" or "-" =>
                "number",
            BinaryExpression binary when binary is not LogicalExpression => binary.Operator.ToString() switch
            {
                "Equality"
                or "StrictEquality"
                or "Inequality"
                or "StrictInequality"
                or "GreaterThan"
                or "GreaterThanOrEqual"
                or "LessThan"
                or "LessThanOrEqual" => "boolean",
                "Addition"
                or "Subtraction"
                or "Multiplication"
                or "Division"
                or "Remainder" when GetValueType(binary.Left) == "number" && GetValueType(binary.Right) == "number" =>
                    "number",
                _ => null,
            },
            ConditionalExpression conditional
                when GetValueType(conditional.Consequent) == GetValueType(conditional.Alternate) => GetValueType(
                conditional.Consequent
            ),
            CallExpression
            {
                Callee: MemberExpression { Computed: false, Property: Identifier { Name: "includes" or "endsWith" } }
            } => "boolean",
            ParenthesizedExpression parenthesized => GetValueType(parenthesized.Expression),
            _ => null,
        };

    public bool TryGetInputName(MemberExpression member, out string name)
    {
        name = "";
        if (member.Object is not Identifier source || source.Name != ObjectParameterName || member.Optional)
            return false;
        name = member.Property switch
        {
            Identifier property when !member.Computed => property.Name,
            StringLiteral property when member.Computed => property.Value,
            _ => "",
        };
        return name.Length != 0;
    }

    public bool HasSafeStringDomain(Expression expression)
    {
        if (expression is Literal { Value: string text })
            return IsStableString(text);
        return expression is MemberExpression member
            && TryGetInputName(member, out var name)
            && InputOptions.TryGetValue(name, out var values)
            && values.All(IsStableString);
    }

    public static bool IsReservedString(string value) =>
        value.Equals("null", StringComparison.OrdinalIgnoreCase)
        || value.Equals("true", StringComparison.OrdinalIgnoreCase)
        || value.Equals("false", StringComparison.OrdinalIgnoreCase);

    private static bool IsStableString(string value) =>
        !value.Equals("null", StringComparison.OrdinalIgnoreCase)
        && (!value.Equals("true", StringComparison.OrdinalIgnoreCase) || value == "true")
        && (!value.Equals("false", StringComparison.OrdinalIgnoreCase) || value == "false");

    public object? ConvertBoolean(Expression expression, List<string> debugInfo)
    {
        if (
            expression is UnaryExpression numeric
            && numeric.Operator.ToString() is "UnaryPlus" or "+" or "UnaryNegation" or "-"
            && GetValueType(numeric.Argument) == "number"
        )
            return ConvertBoolean(numeric.Argument, debugInfo);
        if (expression is CallExpression call && CallExpressionMatcher.IsConditionalCall(call))
            return CallExpressionMatcher.InlineConditional(call, this, debugInfo, true);
        if (expression is ParenthesizedExpression parentheses)
            return ConvertBoolean(parentheses.Expression, debugInfo);
        if (expression is ConditionalExpression conditional)
        {
            if (
                conditional.Consequent is Literal { Value: false }
                && GuardIsImpliedBy(conditional.Test, conditional.Alternate, false)
            )
                return ConvertBoolean(conditional.Alternate, debugInfo);
            if (
                conditional.Alternate is Literal { Value: false }
                && GuardIsImpliedBy(conditional.Test, conditional.Consequent)
            )
                return ConvertBoolean(conditional.Consequent, debugInfo);
            var test = ConvertBoolean(conditional.Test, debugInfo);
            var consequent = WithAssumption(
                conditional.Test,
                true,
                () => ConvertBoolean(conditional.Consequent, debugInfo)
            );
            var alternate = WithAssumption(
                conditional.Test,
                false,
                () => ConvertBoolean(conditional.Alternate, debugInfo)
            );
            return test == null || consequent == null || alternate == null
                ? null
                : new object[] { "if", test, consequent, "else", alternate };
        }
        if (expression is LogicalExpression logical)
        {
            var function = logical.Operator.ToString() switch
            {
                "LogicalAnd" or "&&" => "and",
                "LogicalOr" or "||" => "or",
                _ => null,
            };
            if (function == "and" && GuardIsImpliedBy(logical.Left, logical.Right))
                return ConvertBoolean(logical.Right, debugInfo);
            if (function == "and" && GuardIsImpliedBy(logical.Right, logical.Left))
                return ConvertBoolean(logical.Left, debugInfo);
            var left = ConvertBoolean(logical.Left, debugInfo);
            var right = WithAssumption(logical.Left, function == "and", () => ConvertBoolean(logical.Right, debugInfo));
            return function == null || left == null || right == null ? null : new object[] { function, left, right };
        }
        if (expression is UnaryExpression unary && unary.Operator.ToString() is "LogicalNot" or "!")
        {
            var argument = ConvertBoolean(unary.Argument, debugInfo);
            return argument == null ? null : new object[] { "not", argument };
        }
        if (expression is Literal literal)
            return literal.Value switch
            {
                null => false,
                bool value => value,
                string value => value.Length != 0,
                int value => value != 0,
                long value => value != 0,
                double value => value != 0 && !double.IsNaN(value),
                _ => null,
            };
        if (expression is Identifier { Name: "undefined" })
            return false;
        if (GetValueType(expression) == "undefined")
            return false;
        if (expression is Identifier identifier && identifier.Name == ObjectParameterName)
            return true;
        if (expression is Identifier constant && GlobalConstants.TryGetValue(constant.Name, out var constantValue))
            return constantValue switch
            {
                null => false,
                bool boolean => boolean,
                string text => text.Length != 0,
                double number => number.CompareTo(0d) != 0 && !double.IsNaN(number),
                int number => number != 0,
                long number => number != 0,
                _ => null,
            };
        var valueType = GetValueType(expression);
        var converted = ConvertExpression(expression, debugInfo);
        if (converted == null)
            return null;
        if (valueType == "boolean")
            return expression is MemberExpression or Identifier
                ? new object[] { "equals", converted, true }
                : converted;
        if (valueType == "number")
            return new object?[]
            {
                "or",
                new object[] { "greaterThan", converted, 0 },
                new object[] { "lessThan", converted, 0 },
            };
        if (valueType == "string" && HasSafeStringDomain(expression))
            return new object?[]
            {
                "and",
                new object?[] { "notEquals", converted, null },
                new object[] { "notEquals", converted, "" },
            };
        return Reject(
            "Cannot preserve JavaScript truthiness for an untyped value or an unrestricted string",
            debugInfo
        );
    }

    /// <summary>
    /// Try to convert any expression using the matcher chain
    /// </summary>
    public object? ConvertExpression(Expression expression, List<string> debugInfo)
    {
        foreach (var matcher in Matchers)
        {
            if (matcher.CanMatch(expression))
            {
                return matcher.Match(expression, this, debugInfo);
            }
        }

        return Reject($"Unsupported conditional expression: {expression.GetType().Name}", debugInfo);
    }
}
