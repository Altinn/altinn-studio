using System.Text.Json.Nodes;
using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.CalculationExpressions;

internal sealed partial class CalculationExpressionConverter
{
    private bool TrySelectionList(Expression? expression, Dictionary<string, Value> values, out Value result)
    {
        result = new(null, Kind.Undefined);
        if (
            expression is Identifier identifier
            && _selections.ContainsKey(identifier.Name)
            && values.TryGetValue(identifier.Name, out var stored)
            && stored.Kind == Kind.Object
            && stored.SelectionString
        )
        {
            result = stored;
            return true;
        }
        if (
            expression
                is not CallExpression
                {
                    Callee: MemberExpression { Computed: false, Property: Identifier { Name: "split" } } member,
                    Arguments.Count: 1
                } split
            || split.Optional
            || member.Optional
            || split.Arguments[0] is not Literal { Value: "," }
        )
            return false;
        var source = Read(member.Object, values);
        if (source.Kind != Kind.String || !source.SelectionString || source.MayBeMissing)
            throw new NotSupportedException("Checkbox splitting requires a finite selection and a guard against null.");
        result = source with { Kind = Kind.Object };
        SelectionOptions(result);
        return true;
    }

    private bool TryIterateSelection(CallExpression call, Dictionary<string, Value> values)
    {
        if (!TrySelectionCallback(call, "forEach", values, out var selection, out var callback, out var parameter))
            return false;
        if (callback?.Body is not BlockStatement body)
            throw new NotSupportedException("Checkbox iteration requires a block callback.");
        string? accumulator = null;
        var contributions = new List<JsonNode?>();
        foreach (var option in SelectionOptions(selection).Append(""))
        {
            var locals = new Dictionary<string, Value>(values, StringComparer.Ordinal)
            {
                [parameter] = new(JsonValue.Create(option), Kind.String),
            };
            var declared = new HashSet<string>(StringComparer.Ordinal) { parameter };
            Value? contribution = null;
            foreach (var statement in body.Body)
            {
                if (statement is VariableDeclaration declaration)
                {
                    foreach (var variable in declaration.Declarations)
                    {
                        if (
                            variable.Id is not Identifier identifier
                            || identifier.Name == _parameter
                            || _helpers.ContainsKey(identifier.Name)
                            || !declared.Add(identifier.Name)
                            || variable.Init is IFunction
                        )
                            throw new NotSupportedException("Unsupported checkbox callback declaration.");
                        locals[identifier.Name] = ReadSelectionLocal(variable.Init, locals, option.Length == 0);
                    }
                    continue;
                }
                if (statement is EmptyStatement)
                    continue;
                if (
                    statement is not ExpressionStatement { Expression: AssignmentExpression assignment }
                    || assignment.Operator.ToString() != "AdditionAssignment"
                    || assignment.Left is not Identifier target
                    || declared.Contains(target.Name)
                    || _constants.Contains(target.Name)
                    || _helpers.ContainsKey(target.Name)
                    || IsBuiltin(target.Name)
                    || target.Name == _parameter
                    || !values.TryGetValue(target.Name, out var previous)
                    || previous.Kind != Kind.Number
                    || previous.MayBeMissing
                    || contribution != null
                    || (accumulator != null && accumulator != target.Name)
                )
                    throw new NotSupportedException("Checkbox callbacks require one numeric accumulator addition.");
                accumulator = target.Name;
                contribution = ReadSelectionContribution(assignment.Right, locals, option.Length == 0);
            }
            if (contribution == null)
                throw new NotSupportedException("Checkbox callback has no numeric accumulator addition.");
            if (option.Length > 0)
                contributions.Add(
                    Call("if", Call("commaContains", selection.Expression, option), contribution.Expression, 0)
                );
        }
        if (accumulator == null)
            throw new NotSupportedException("Checkbox options are empty.");
        values[accumulator] = new(
            Call("plus", new[] { values[accumulator].Expression }.Concat(contributions).ToArray()),
            Kind.Number
        );
        return true;
    }

    private bool TryReadSelectionEvery(CallExpression call, Dictionary<string, Value> values, out Value result)
    {
        result = new(null, Kind.Undefined);
        if (!TrySelectionCallback(call, "every", values, out var selection, out var callback, out var parameter))
            return false;
        if (
            callback?.Body
                is not BinaryExpression
                {
                    Left: MemberExpression { Object: Identifier owner, Computed: true } field,
                    Right: Literal { Value: null }
                } predicate
            || owner.Name != _parameter
            || predicate.Operator.ToString() != "Inequality"
        )
            throw new NotSupportedException("Checkbox completeness requires an expression callback.");
        var emptyLocals = new Dictionary<string, Value>(values, StringComparer.Ordinal)
        {
            [parameter] = new(JsonValue.Create(""), Kind.String),
        };
        var emptyName = ReadSelectionLocal(field.Property, emptyLocals, emptySelection: true);
        if (
            emptyName.Expression is not JsonValue emptyLiteral
            || !emptyLiteral.TryGetValue<string>(out var emptyField)
            || values.ContainsKey("input:" + emptyField)
        )
            throw new NotSupportedException("Empty checkbox selection does not resolve to a missing input.");
        var conditions = new List<JsonNode?> { Call("notEquals", selection.Expression, "") };
        foreach (var option in SelectionOptions(selection))
        {
            var locals = new Dictionary<string, Value>(values, StringComparer.Ordinal)
            {
                [parameter] = new(JsonValue.Create(option), Kind.String),
            };
            if (Read(field, locals).Kind != Kind.Number)
                throw new NotSupportedException("Checkbox completeness requires numeric mapped inputs.");
            var condition = Read(predicate, locals);
            if (condition.Kind != Kind.Boolean || condition.MayBeMissing)
                throw new NotSupportedException("Checkbox completeness callback must return a boolean.");
            conditions.Add(
                Call("or", Call("not", Call("commaContains", selection.Expression, option)), condition.Expression)
            );
        }
        result = new(Call("and", conditions.ToArray()), Kind.Boolean);
        return true;
    }

    private bool TrySelectionCallback(
        CallExpression call,
        string method,
        Dictionary<string, Value> values,
        out Value selection,
        out IFunction? callback,
        out string parameter
    )
    {
        selection = new(null, Kind.Undefined);
        callback = null;
        parameter = "";
        if (
            call.Callee is not MemberExpression { Computed: false, Property: Identifier name } member
            || name.Name != method
            || !TrySelectionList(member.Object, values, out selection)
        )
            return false;
        if (
            call.Optional
            || member.Optional
            || call.Arguments.Count != 1
            || call.Arguments[0] is not IFunction function
            || function.Async
            || function.Generator
            || function.Params.Count != 1
            || function.Params[0] is not Identifier identifier
            || identifier.Name == _parameter
            || _helpers.ContainsKey(identifier.Name)
            || IsBuiltin(identifier.Name)
        )
            throw new NotSupportedException("Checkbox callbacks require one unshadowed option parameter.");
        callback = function;
        parameter = identifier.Name;
        return true;
    }

    private IReadOnlyList<string> SelectionOptions(Value selection)
    {
        if (
            selection.Expression is not JsonArray { Count: >= 2 } expression
            || expression[0]?.GetValue<string>() != "dataModel"
            || expression[1] is not JsonValue path
            || !path.TryGetValue<string>(out var field)
            || !_selectionOptions.TryGetValue(NumericOptionInputs.Normalize(field), out var options)
            || options.Count is < 1 or > 32
        )
            throw new NotSupportedException("Checkbox selections require a known finite option list.");
        return options;
    }

    private Value ReadSelectionContribution(
        Expression expression,
        Dictionary<string, Value> values,
        bool emptySelection
    )
    {
        if (
            expression
                is not ConditionalExpression
                {
                    Test: MemberExpression { Object: Identifier owner, Computed: true } input,
                    Alternate: Literal { Value: 0 or 0d }
                } conditional
            || owner.Name != _parameter
        )
            throw new NotSupportedException("Checkbox additions require a mapped numeric input with a zero default.");
        if (emptySelection)
        {
            var emptyName = ReadSelectionLocal(input.Property, values, emptySelection: true);
            if (
                emptyName.Expression is not JsonValue emptyLiteral
                || !emptyLiteral.TryGetValue<string>(out var field)
                || values.ContainsKey("input:" + field)
            )
                throw new NotSupportedException("Empty checkbox selection does not resolve to a zero contribution.");
            return new(JsonValue.Create(0), Kind.Number);
        }
        var consequent = conditional.Consequent;
        if (consequent is UnaryExpression unary && unary.Operator.ToString() == "UnaryPlus")
            consequent = unary.Argument;
        var value = Read(input, values);
        var whenPresent = Read(consequent, values);
        if (
            value.Kind != Kind.Number
            || whenPresent.Kind != Kind.Number
            || !JsonNode.DeepEquals(value.Expression, whenPresent.Expression)
        )
            throw new NotSupportedException(
                "Checkbox additions require the same mapped numeric input in both branches."
            );
        return NumberOrZero(value);
    }

    private Value ReadSelectionLocal(Expression? expression, Dictionary<string, Value> values, bool emptySelection)
    {
        if (
            emptySelection
            && expression is TemplateLiteral { Expressions.Count: 1 } template
            && TryEmptySelectionNumber(template.Expressions[0], values, out var number)
            && double.IsNaN(number)
        )
        {
            // split("") invokes the callback once with "". parseInt("") is NaN, so the
            // original computed lookup uses a key such as "feltNaN" and normally adds zero.
            var prefix =
                template.Quasis[0].Value.Cooked ?? throw new NotSupportedException("Invalid template literal.");
            var suffix =
                template.Quasis[1].Value.Cooked ?? throw new NotSupportedException("Invalid template literal.");
            return new(JsonValue.Create(prefix + "NaN" + suffix), Kind.String);
        }
        return Read(expression, values);
    }

    private bool TryEmptySelectionNumber(Expression expression, Dictionary<string, Value> values, out double number)
    {
        number = 0;
        if (
            expression is CallExpression { Callee: Identifier { Name: "parseInt" }, Arguments.Count: 1 } call
            && !values.ContainsKey("parseInt")
            && _parameter != "parseInt"
            && call.Arguments[0] is Expression argument
        )
        {
            var value = Read(argument, values);
            if (
                value.Kind == Kind.String
                && value.Expression is JsonValue literal
                && literal.TryGetValue<string>(out var text)
                && text.Length == 0
            )
            {
                number = double.NaN;
                return true;
            }
        }
        if (expression is Literal { Value: int or long or double or float } scalar)
        {
            number = System.Convert.ToDouble(scalar.Value, System.Globalization.CultureInfo.InvariantCulture);
            return true;
        }
        if (
            expression is BinaryExpression binary
            && binary.Operator.ToString() is "Addition" or "Subtraction" or "Multiplication"
            && TryEmptySelectionNumber(binary.Left, values, out var left)
            && TryEmptySelectionNumber(binary.Right, values, out var right)
        )
        {
            number = binary.Operator.ToString() switch
            {
                "Addition" => left + right,
                "Subtraction" => left - right,
                _ => left * right,
            };
            return true;
        }
        return false;
    }
}
