using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Expressions;
using Altinn.App.Core.Models.Layout;

namespace Altinn.App.Core.Internal.Expressions;

/// <summary>
/// Static class used to evaluate expressions. Holds the implementation for all expression functions.
/// </summary>
public static class ExpressionEvaluator
{
    /// <summary>
    /// Shortcut for evaluating a boolean expression on a given property on a <see cref="Models.Layout.Components.Base.BaseComponent" />
    /// </summary>
    public static async Task<bool> EvaluateBooleanExpression(
        LayoutEvaluatorState state,
        ComponentContext context,
        string property,
        bool defaultReturn
    )
    {
        try
        {
            ArgumentNullException.ThrowIfNull(context.Component);
            var expr = property switch
            {
                "hidden" => context.Component.Hidden,
                "required" => context.Component.Required,
                "removeWhenHidden" => context.Component.RemoveWhenHidden,
                _ => throw new ExpressionEvaluatorTypeErrorException($"unknown boolean expression property {property}"),
            };

            var result = await EvaluateExpression_internal(state, expr, context);

            return result.ValueKind switch
            {
                JsonValueKind.True => true,
                JsonValueKind.False => false,
                JsonValueKind.Null => defaultReturn,
                JsonValueKind.Undefined => defaultReturn,
                _ => throw new ExpressionEvaluatorTypeErrorException(
                    $"Return was not boolean. Was {result} of type {result.ValueKind}"
                ),
            };
        }
        catch (Exception e)
        {
            throw new ExpressionEvaluatorTypeErrorException(
                $"Error while evaluating \"{property}\" on \"{context.Component?.PageId}.{context.Component?.Id}\"",
                e
            );
        }
    }

    /// <summary>
    /// Evaluate a <see cref="Expression" /> from a given <see cref="LayoutEvaluatorState" /> in a <see cref="ComponentContext" />
    /// </summary>
    public static async Task<object?> EvaluateExpression(
        LayoutEvaluatorState state,
        Expression expr,
        ComponentContext context,
        object?[]? positionalArguments = null
    )
    {
        var positionalArgumentUnions = positionalArguments?.Select(ExpressionValue.FromObject).ToArray();
        var result = await EvaluateExpression_internal(state, expr, context, positionalArgumentUnions);
        return result.ToObject();
    }

    /// <summary>
    /// private implementation in order to change the types of positional arguments without breaking change.
    /// </summary>
    internal static async Task<ExpressionValue> EvaluateExpression_internal(
        LayoutEvaluatorState state,
        Expression expr,
        ComponentContext context,
        ExpressionValue[]? positionalArguments = null
    )
    {
        if (!expr.IsFunctionExpression)
        {
            return expr.ValueUnion;
        }
        ValidateExpressionArgs(expr);
        var args = new ExpressionValue[expr.Args.Count];
        for (var i = 0; i < args.Length; i++)
        {
            args[i] = await EvaluateExpression_internal(state, expr.Args[i], context, positionalArguments);
        }

        ExpressionValue ret = expr.Function switch
        {
            ExpressionFunction.dataModel => await DataModel(args, context, state),
            ExpressionFunction.component => await Component(args, context, state),
            ExpressionFunction.countDataElements => CountDataElements(args, state),
            ExpressionFunction.@if => IfImpl(args),
            ExpressionFunction.formatDate => FormatDate(args, state),
            ExpressionFunction.instanceContext => InstanceContext(state, args),
            ExpressionFunction.frontendSettings => FrontendSetting(state, args),
            ExpressionFunction.concat => Concat(args),
            ExpressionFunction.equals => EqualsImplementation(args),
            ExpressionFunction.notEquals => !EqualsImplementation(args),
            ExpressionFunction.greaterThanEq => GreaterThanEq(args),
            ExpressionFunction.lessThan => LessThan(args),
            ExpressionFunction.lessThanEq => LessThanEq(args),
            ExpressionFunction.greaterThan => GreaterThan(args),
            ExpressionFunction.and => And(args),
            ExpressionFunction.or => Or(args),
            ExpressionFunction.not => Not(args),
            ExpressionFunction.compare => Compare(args),
            ExpressionFunction.contains => Contains(args),
            ExpressionFunction.notContains => !Contains(args),
            ExpressionFunction.commaContains => CommaContains(args),
            ExpressionFunction.endsWith => EndsWith(args),
            ExpressionFunction.startsWith => StartsWith(args),
            ExpressionFunction.stringLength => StringLength(args),
            ExpressionFunction.stringIndexOf => StringIndexOf(args),
            ExpressionFunction.stringReplace => StringReplace(args),
            ExpressionFunction.stringSlice => StringSlice(args),
            ExpressionFunction.text => await Text(state, context, args),
            ExpressionFunction.round => Round(args),
            ExpressionFunction.upperCase => UpperCase(args),
            ExpressionFunction.lowerCase => LowerCase(args),
            ExpressionFunction.lowerCaseFirst => LowerCaseFirst(args),
            ExpressionFunction.upperCaseFirst => UpperCaseFirst(args),
            ExpressionFunction.argv => Argv(args, positionalArguments),
            ExpressionFunction.gatewayAction => state.GetGatewayAction(),
            ExpressionFunction.language => state.GetLanguage(),
            _ => throw new ExpressionEvaluatorTypeErrorException("Function not implemented", expr.Function, args),
        };
        return ret;
    }

    private static void ValidateExpressionArgs(Expression expr)
    {
        switch (expr)
        {
            case { Function: ExpressionFunction.dataModel, Args: [_, { IsFunctionExpression: true }] }:
                throw new ExpressionEvaluatorTypeErrorException(
                    "The data type must be a string (expressions cannot be used here)"
                );
            case { Function: ExpressionFunction.@if, Args: [_, _, { IsFunctionExpression: true }, _] }:
                throw new ExpressionEvaluatorTypeErrorException("Expected third argument to be \"else\"");
            case { Function: ExpressionFunction.compare, Args: [_, { IsFunctionExpression: true }, _] }:
            case { Function: ExpressionFunction.compare, Args: [_, _, { IsFunctionExpression: true }, _] }:
                throw new ExpressionEvaluatorTypeErrorException(
                    "Invalid operator (it cannot be an expression or null)"
                );
            case { Function: ExpressionFunction.compare, Args: [_, { IsFunctionExpression: true }, _, _] }:
                throw new ExpressionEvaluatorTypeErrorException(
                    "Second argument must be \"not\" when providing 4 arguments in total"
                );
        }
    }

    private static string InstanceContext(LayoutEvaluatorState state, ExpressionValue[] args)
    {
        if (args is [{ ValueKind: JsonValueKind.String } arg])
        {
            return state.GetInstanceContext(arg.String);
        }
        throw new ExpressionEvaluatorTypeErrorException(
            "Unknown Instance context property type",
            ExpressionFunction.instanceContext,
            args
        );
    }

    private static string? FrontendSetting(LayoutEvaluatorState state, ExpressionValue[] args)
    {
        return args switch
        {
            [{ ValueKind: JsonValueKind.String } arg] => state.GetFrontendSetting(arg.String),
            [{ ValueKind: JsonValueKind.Null }] => throw new ExpressionEvaluatorTypeErrorException(
                "Value cannot be null. (Parameter 'key')",
                ExpressionFunction.frontendSettings,
                args
            ),
            _ => throw new ExpressionEvaluatorTypeErrorException(
                "Expected 1 argument",
                ExpressionFunction.frontendSettings,
                args
            ),
        };
    }

    private static async Task<ExpressionValue> DataModel(
        ExpressionValue[] args,
        ComponentContext context,
        LayoutEvaluatorState state
    )
    {
        ModelBinding key = args switch
        {
            [{ ValueKind: JsonValueKind.String } field] => new ModelBinding { Field = field.String },
            [{ ValueKind: JsonValueKind.String } field, { ValueKind: JsonValueKind.String } dataType] =>
                new ModelBinding { Field = field.String, DataType = dataType.String },
            [{ ValueKind: JsonValueKind.Null }] => throw new ExpressionEvaluatorTypeErrorException(
                "Cannot lookup dataModel null",
                ExpressionFunction.dataModel,
                args
            ),
            _ => throw new ExpressionEvaluatorTypeErrorException(
                "expected 1-2 argument(s)",
                ExpressionFunction.dataModel,
                args
            ),
        };
        return await DataModel(key, context.DataElementIdentifier, context.RowIndices, state);
    }

    private static async Task<ExpressionValue> DataModel(
        ModelBinding key,
        DataElementIdentifier defaultDataElementIdentifier,
        int[]? indexes,
        LayoutEvaluatorState state
    )
    {
        var data = await state.GetModelData(key, defaultDataElementIdentifier, indexes);

        return ExpressionValue.FromObject(data);
    }

    private static async Task<ExpressionValue> Component(
        ExpressionValue[] args,
        ComponentContext? context,
        LayoutEvaluatorState state
    )
    {
        var componentId = args switch
        {
            [{ ValueKind: JsonValueKind.String } arg] => arg.String,
            [{ } arg] => throw new ExpressionEvaluatorTypeErrorException(
                $"Cannot lookup component {arg}",
                ExpressionFunction.component,
                args
            ),
            _ => throw new ExpressionEvaluatorTypeErrorException(
                $"Expected 1 argument",
                ExpressionFunction.component,
                args
            ),
        };

        if (context is null)
        {
            throw new ArgumentException("The component expression requires a component context");
        }

        var targetContext = await state.GetComponentContext(context.Component?.PageId, componentId, context.RowIndices);

        if (targetContext is null)
        {
            var rowIndexInfo = (
                (context.RowIndices?.Length > 0) ? " with row indices " + string.Join(", ", context.RowIndices) : null
            );
            throw new ArgumentException($"Unable to find component with identifier {componentId}{rowIndexInfo}");
        }

        if (targetContext.HasChildContexts)
        {
            throw new NotImplementedException("Component lookup for components that are groups is not implemented");
        }

        if (targetContext.Component?.DataModelBindings.TryGetValue("simpleBinding", out var binding) != true)
        {
            throw new ArgumentException("component lookup requires the target component to have a simpleBinding");
        }
        if (await targetContext.IsHidden(evaluateRemoveWhenHidden: false))
        {
            return ExpressionValue.Null;
        }

        return await DataModel(binding, context.DataElementIdentifier, context.RowIndices, state);
    }

    private static int CountDataElements(ExpressionValue[] args, LayoutEvaluatorState state)
    {
        if (args.Length != 1)
        {
            throw new ExpressionEvaluatorTypeErrorException($"Expected 1 argument(s), got {args.Length}");
        }
        if (args is not [{ ValueKind: JsonValueKind.String } dataType])
        {
            throw new ExpressionEvaluatorTypeErrorException("Expected dataType argument to be a string");
        }

        return state.CountDataElements(dataType.String);
    }

    private static string Concat(ExpressionValue[] args)
    {
        return string.Join("", args.Select(a => a.ToStringForEquals()));
    }

    private static bool Contains(ExpressionValue[] args)
    {
        if (args.Length != 2)
        {
            throw new ExpressionEvaluatorTypeErrorException($"Expected 2 argument(s), got {args.Length}");
        }
        string? stringOne = args[0].ToStringForEquals();
        string? stringTwo = args[1].ToStringForEquals();

        if (stringOne is null || stringTwo is null)
        {
            return false;
        }

        return stringOne.Contains(stringTwo, StringComparison.InvariantCulture);
    }

    private static string? FormatDate(ExpressionValue[] args, LayoutEvaluatorState state)
    {
        if (args.Length is < 1 or > 2)
        {
            throw new ExpressionEvaluatorTypeErrorException($"Expected 1-2 argument(s), got {args.Length}");
        }

        DateTimeOffset? date = PrepareDateArg(args[0], out var hasTimezone);
        if (date is null)
        {
            return null;
        }

        var timezone = state.GetTimeZone();
        if (hasTimezone && timezone is not null)
        {
            // If the date has a timezone, we need to convert it to the user's timezone before displaying it
            date = TimeZoneInfo.ConvertTime(date.Value, timezone);
        }

        string? language = state.GetLanguage();
        return UnicodeDateTimeTokenConverter.Format(
            date,
            args.Length == 2 ? args[1].ToStringForEquals() : null,
            language
        );
    }

    private static bool Compare(ExpressionValue[] args)
    {
        return args switch
        {
            [var a, { ValueKind: JsonValueKind.String } op, var b] => Compare(a, op.String, b),

            [var a, { ValueKind: JsonValueKind.String } not, { ValueKind: JsonValueKind.String } op, var b] =>
                not.String == "not"
                    ? !Compare(a, op.String, b)
                    : throw new ExpressionEvaluatorTypeErrorException(
                        $"Second argument must be \"not\" when providing 4 arguments in total"
                    ),
            _ => throw new ExpressionEvaluatorTypeErrorException(
                $"Expected 3-4 argument(s), got {args.Length}",
                ExpressionFunction.compare,
                args
            ),
        };
    }

    private static bool Compare(ExpressionValue a, string opString, ExpressionValue b)
    {
        // For all operators except for 'equals', every call with any null argument should return false
        if (opString != "equals" && (a.ValueKind == JsonValueKind.Null || b.ValueKind == JsonValueKind.Null))
        {
            return false;
        }

        ExpressionValue[] passOnArgs = [a, b];

        return opString switch
        {
            "equals" => EqualsImplementation(passOnArgs),
            "greaterThan" => GreaterThan(passOnArgs),
            "greaterThanEq" => GreaterThanEq(passOnArgs),
            "lessThan" => LessThan(passOnArgs),
            "lessThanEq" => LessThanEq(passOnArgs),
            "isBefore" => DateIsBefore(passOnArgs),
            "isAfter" => DateIsAfter(passOnArgs),
            "isBeforeEq" => DateIsBeforeEq(passOnArgs),
            "isAfterEq" => DateIsAfterEq(passOnArgs),
            "isSameDay" => DateIsSameDay(a, b),
            _ => throw new ExpressionEvaluatorTypeErrorException($"Invalid operator \"{opString}\""),
        };
    }

    private static DateTimeOffset? PrepareDateArg(ExpressionValue arg, out bool hasTimezone)
    {
        var dateStr = (
            arg switch
            {
                { ValueKind: JsonValueKind.String } => arg.String,
                { ValueKind: JsonValueKind.Null } => null,
                _ => throw new ExpressionEvaluatorTypeErrorException(
                    $"Date expressions only accept strings or null, got {arg} of type {arg.ValueKind}"
                ),
            }
        );
        if (string.IsNullOrWhiteSpace(dateStr))
        {
            hasTimezone = false;
            return null;
        }
        var date = UnicodeDateTimeTokenConverter.Parse(dateStr, out hasTimezone);
        if (date is null)
        {
            throw new ExpressionEvaluatorTypeErrorException($"Unable to parse date \"{dateStr}\": Unknown format");
        }

        return date;
    }

    private static (DateTimeOffset?, DateTimeOffset?) PrepareDateArgs(ExpressionValue[] args)
    {
        if (args.Length != 2)
        {
            throw new ExpressionEvaluatorTypeErrorException("Invalid number of args for date compare");
        }

        var a = PrepareDateArg(args[0], out bool aHasTimezone);
        var b = PrepareDateArg(args[1], out bool bHasTimezone);
        if (a.HasValue && b.HasValue && aHasTimezone != bHasTimezone)
        {
            throw new ExpressionEvaluatorTypeErrorException(
                "Can not compare timestamps with timezone info against timestamps withou timezone info",
                ExpressionFunction.compare,
                args
            );
        }

        return (a, b);
    }

    private static bool DateIsBefore(ExpressionValue[] args)
    {
        var (a, b) = PrepareDateArgs(args);
        return a < b;
    }

    private static bool DateIsAfter(ExpressionValue[] args)
    {
        var (a, b) = PrepareDateArgs(args);
        return a > b;
    }

    private static bool DateIsBeforeEq(ExpressionValue[] args)
    {
        var (a, b) = PrepareDateArgs(args);
        return a <= b;
    }

    private static bool DateIsAfterEq(ExpressionValue[] args)
    {
        var (a, b) = PrepareDateArgs(args);
        return a >= b;
    }

    private static bool DateIsSameDay(ExpressionValue aExpr, ExpressionValue bExpr)
    {
        var a = PrepareDateArg(aExpr, out bool aHasTimezone);
        var b = PrepareDateArg(bExpr, out bool bHasTimezone);
        if (!a.HasValue || !b.HasValue)
        {
            return false;
        }

        if (aHasTimezone != bHasTimezone)
        {
            throw new ExpressionEvaluatorTypeErrorException(
                "Can not compare timestamps where only one specify timezone",
                ExpressionFunction.compare,
                [aExpr, "isSameDay", bExpr]
            );
        }

        if (a.Value.Offset != b.Value.Offset)
        {
            throw new ExpressionEvaluatorTypeErrorException(
                "Can not figure out if timestamps in different timezones are in the same day",
                ExpressionFunction.compare,
                [aExpr, "isSameDay", bExpr]
            );
        }

        return a.Value.Date == b.Value.Date;
    }

    private static bool EndsWith(ExpressionValue[] args)
    {
        if (args.Length != 2)
        {
            throw new ExpressionEvaluatorTypeErrorException(
                "Expected 2 argument(s)",
                ExpressionFunction.endsWith,
                args
            );
        }
        string? stringOne = args[0].ToStringForEquals();
        string? stringTwo = args[1].ToStringForEquals();

        if (stringOne is null || stringTwo is null)
        {
            return false;
        }

        return stringOne.EndsWith(stringTwo, StringComparison.InvariantCulture);
    }

    private static bool StartsWith(ExpressionValue[] args)
    {
        if (args.Length != 2)
        {
            throw new ExpressionEvaluatorTypeErrorException(
                "Expected 2 argument(s)",
                ExpressionFunction.startsWith,
                args
            );
        }
        string? stringOne = args[0].ToStringForEquals();
        string? stringTwo = args[1].ToStringForEquals();

        if (stringOne is null || stringTwo is null)
        {
            return false;
        }

        return stringOne.StartsWith(stringTwo, StringComparison.InvariantCulture);
    }

    private static bool CommaContains(ExpressionValue[] args)
    {
        if (args.Length != 2)
        {
            throw new ExpressionEvaluatorTypeErrorException(
                "expect 2 arguments",
                ExpressionFunction.commaContains,
                args
            );
        }
        string? stringOne = args[0].ToStringForEquals();
        string? stringTwo = args[1].ToStringForEquals();

        if (stringOne is null || stringTwo is null)
        {
            return false;
        }

        return stringOne.Split(",").Select(s => s.Trim()).Contains(stringTwo, StringComparer.InvariantCulture);
    }

    private static int StringLength(ExpressionValue[] args)
    {
        if (args.Length != 1)
        {
            throw new ExpressionEvaluatorTypeErrorException($"1 argument", ExpressionFunction.stringLength, args);
        }
        string? stringOne = args[0].ToStringForEquals();
        return stringOne?.Length ?? 0;
    }

    private static int? StringIndexOf(ExpressionValue[] args)
    {
        if (args.Length != 2)
        {
            throw new ExpressionEvaluatorTypeErrorException($"Expected 2 arguments, got {args.Length}");
        }
        string? stringOne = args[0].ToStringForEquals();
        string? stringTwo = args[1].ToStringForEquals();

        if (stringOne is null || stringTwo is null)
        {
            return null;
        }

        var idx = stringOne.IndexOf(stringTwo, StringComparison.InvariantCulture);
        return idx == -1 ? null : idx;
    }

    private static string? StringReplace(ExpressionValue[] args)
    {
        if (args.Length != 3)
        {
            throw new ExpressionEvaluatorTypeErrorException($"Expected 3 arguments, got {args.Length}");
        }
        string? subject = args[0].ToStringForEquals();
        string? search = args[1].ToStringForEquals();
        string? replace = args[2].ToStringForEquals();

        if (subject is null || search is null || subject == "" || search == "")
        {
            return null;
        }

        return subject.Replace(search, replace, StringComparison.InvariantCulture);
    }

    private static string? StringSlice(ExpressionValue[] args)
    {
        if (args.Length < 2 || args.Length > 3)
        {
            throw new ExpressionEvaluatorTypeErrorException($"Expected 2-3 arguments, got {args.Length}");
        }
        string? subject = args[0].ToStringForEquals();
        double? start = PrepareNumericArg(args[1]);
        double? end = args.Length == 3 ? PrepareNumericArg(args[2]) : null;
        bool hasEnd = args.Length == 3;

        if (start == null || (hasEnd && end == null))
        {
            throw new ExpressionEvaluatorTypeErrorException(
                "Start/end index cannot be null (if you used an expression like stringIndexOf here, make sure to guard against null)"
            );
        }

        if (subject is null)
        {
            return null;
        }

        if (start < 0)
        {
            start = subject.Length + start;
        }

        start = Math.Max(0, Math.Min(subject.Length, start.Value)); // Clamp to be within the string

        if (end == null)
        {
            return subject.Substring((int)start);
        }

        if (end < 0)
        {
            end = subject.Length + end;
        }

        end = Math.Max(0, Math.Min(subject.Length, end.Value)); // Clamp to be within the string

        return subject.Substring((int)start, (int)(end - start));
    }

    private static string Round(ExpressionValue[] args)
    {
        if (args.Length < 1 || args.Length > 2)
        {
            throw new ExpressionEvaluatorTypeErrorException(
                $"Expected 1-2 argument(s), got {args.Length}",
                ExpressionFunction.round,
                args
            );
        }

        var number = PrepareNumericArg(args[0]);

        if (number is null)
        {
            number = 0;
        }

        int precision = 0;

        if (args.Length == 2)
        {
            precision = (int)(PrepareNumericArg(args[1]) ?? 0);
        }

        return number.Value.ToString($"N{precision}", CultureInfo.InvariantCulture);
    }

    private static string? UpperCase(ExpressionValue[] args)
    {
        if (args.Length != 1)
        {
            throw new ExpressionEvaluatorTypeErrorException($"Expected 1 argument, got {args.Length}");
        }
        string? stringOne = args[0].ToStringForEquals();
        return stringOne?.ToUpperInvariant();
    }

    private static string? LowerCase(ExpressionValue[] args)
    {
        if (args.Length != 1)
        {
            throw new ExpressionEvaluatorTypeErrorException($"Expected 1 argument, got {args.Length}");
        }
        string? stringOne = args[0].ToStringForEquals();
        return stringOne?.ToLowerInvariant();
    }

    private static string? UpperCaseFirst(ExpressionValue[] args)
    {
        if (args.Length != 1)
        {
            throw new ExpressionEvaluatorTypeErrorException($"Expected 1 argument, got {args.Length}");
        }
        string? stringOne = args[0].ToStringForEquals();
        if (stringOne is null)
        {
            return null;
        }
        return stringOne.Length switch
        {
            0 => stringOne,
            1 => stringOne.ToUpperInvariant(),
            _ => stringOne[0].ToString().ToUpperInvariant() + stringOne[1..],
        };
    }

    private static string? LowerCaseFirst(ExpressionValue[] args)
    {
        if (args.Length != 1)
        {
            throw new ExpressionEvaluatorTypeErrorException($"Expected 1 argument, got {args.Length}");
        }
        string? stringOne = args[0].ToStringForEquals();
        if (stringOne is null)
        {
            return null;
        }
        return stringOne.Length switch
        {
            0 => stringOne,
            1 => stringOne.ToLowerInvariant(),
            _ => stringOne[0].ToString().ToLowerInvariant() + stringOne[1..],
        };
    }

    private static bool PrepareBooleanArg(ExpressionValue arg)
    {
        return arg.ValueKind switch
        {
            JsonValueKind.Null => false,
            JsonValueKind.True => true,
            JsonValueKind.False => false,

            JsonValueKind.String => arg.String switch
            {
                "true" => true,
                "false" => false,
                "1" => true,
                "0" => false,
                _ => ParseNumber(arg.String, throwException: false) switch
                {
                    1 => true,
                    0 => false,
                    _ => throw new ExpressionEvaluatorTypeErrorException(
                        $"Expected boolean, got value \"{arg.String}\""
                    ),
                },
            },
            JsonValueKind.Number => arg.Number switch
            {
                1 => true,
                0 => false,
                _ => throw new ExpressionEvaluatorTypeErrorException($"Expected boolean, got value {arg.Number}"),
            },
            _ => throw new ExpressionEvaluatorTypeErrorException(
                "Unknown data type encountered in expression: " + arg.ValueKind
            ),
        };
    }

    private static bool? And(ExpressionValue[] args)
    {
        if (args.Length == 0)
        {
            throw new ExpressionEvaluatorTypeErrorException("Expected 1+ argument(s), got 0");
        }

        var preparedArgs = args.Select(arg => PrepareBooleanArg(arg)).ToArray();
        // Ensure all args gets converted, because they might throw an Exception
        return preparedArgs.All(a => a);
    }

    private static async Task<string?> Text(
        LayoutEvaluatorState state,
        ComponentContext context,
        ExpressionValue[] args
    )
    {
        if (args is [{ ValueKind: JsonValueKind.Null }])
        {
            return null;
        }
        if (args is [{ ValueKind: JsonValueKind.String } text])
        {
            return await state.TranslateText(text.String, context);
        }

        throw new ExpressionEvaluatorTypeErrorException(
            "Expression [\"text\"] expects a single string argument",
            ExpressionFunction.text,
            args
        );
    }

    private static bool? Or(ExpressionValue[] args)
    {
        if (args.Length == 0)
        {
            throw new ExpressionEvaluatorTypeErrorException("Expected 1+ argument(s), got 0");
        }

        var preparedArgs = args.Select(arg => PrepareBooleanArg(arg)).ToArray();
        // Ensure all args gets converted, because they might throw an Exception
        return preparedArgs.Any(a => a);
    }

    private static bool? Not(ExpressionValue[] args)
    {
        if (args.Length != 1)
        {
            throw new ExpressionEvaluatorTypeErrorException($"Expected 1 argument(s), got {args.Length}");
        }
        return !PrepareBooleanArg(args[0]);
    }

    private static (double?, double?) PrepareNumericArgs(ExpressionValue[] args)
    {
        if (args.Length != 2)
        {
            throw new ExpressionEvaluatorTypeErrorException("Invalid number of args for compare");
        }

        var a = PrepareNumericArg(args[0]);

        var b = PrepareNumericArg(args[1]);

        return (a, b);
    }

    private static double? PrepareNumericArg(ExpressionValue arg)
    {
        return arg.ValueKind switch
        {
            JsonValueKind.True or JsonValueKind.False or JsonValueKind.Array or JsonValueKind.Object =>
                throw new ExpressionEvaluatorTypeErrorException($"Expected number, got value {arg}"),
            JsonValueKind.String => ParseNumber(arg.String),
            JsonValueKind.Number => arg.Number,

            _ => null,
        };
    }

    private static ExpressionValue IfImpl(ExpressionValue[] args)
    {
        if (args.Length == 2)
        {
            return PrepareBooleanArg(args[0]) ? args[1] : ExpressionValue.Null;
        }

        if (
            args.Length > 2
            && !(
                args[2].ValueKind == JsonValueKind.String
                && "else".Equals(args[2].String, StringComparison.OrdinalIgnoreCase)
            )
        )
        {
            throw new ExpressionEvaluatorTypeErrorException("Expected third argument to be \"else\"");
        }

        if (args.Length == 4)
        {
            return PrepareBooleanArg(args[0]) ? args[1] : args[3];
        }

        throw new ExpressionEvaluatorTypeErrorException(
            "Expected either 2 arguments (if) or 4 (if + else), got " + args.Length
        );
    }

    private static readonly Regex _numberRegex = new Regex(@"^-?\d+(\.\d+)?$");

    private static double? ParseNumber(string s, bool throwException = true)
    {
        if (_numberRegex.IsMatch(s) && double.TryParse(s, NumberStyles.Any, CultureInfo.InvariantCulture, out var d))
        {
            return d;
        }

        if (throwException)
        {
            throw new ExpressionEvaluatorTypeErrorException($"Expected number, got value \"{s}\"");
        }
        return null;
    }

    private static bool LessThan(ExpressionValue[] args)
    {
        var (a, b) = PrepareNumericArgs(args);

        if (a is null || b is null)
        {
            return false; // error handeling
        }
        return a < b; // Actual implementation
    }

    private static bool LessThanEq(ExpressionValue[] args)
    {
        var (a, b) = PrepareNumericArgs(args);

        if (a is null || b is null)
        {
            return false; // error handeling
        }
        return a <= b; // Actual implementation
    }

    private static bool GreaterThan(ExpressionValue[] args)
    {
        var (a, b) = PrepareNumericArgs(args);

        if (a is null || b is null)
        {
            return false; // error handling
        }
        return a > b; // Actual implementation
    }

    private static bool GreaterThanEq(ExpressionValue[] args)
    {
        var (a, b) = PrepareNumericArgs(args);

        if (a is null || b is null)
        {
            return false; // false if any is null
        }
        return a >= b; // Actual implementation
    }

    internal static bool EqualsImplementation(ExpressionValue[] args)
    {
        if (args.Length != 2)
        {
            throw new ExpressionEvaluatorTypeErrorException($"Expected 2 argument(s), got {args.Length}");
        }

        return EqualsImplementation(args[0], args[1]);
    }

    internal static bool EqualsImplementation(ExpressionValue a, ExpressionValue b)
    {
        return string.Equals(a.ToStringForEquals(), b.ToStringForEquals(), StringComparison.Ordinal);
    }

    private static ExpressionValue Argv(ExpressionValue[] args, ExpressionValue[]? positionalArguments)
    {
        if (args.Length != 1)
        {
            throw new ExpressionEvaluatorTypeErrorException($"Expected 1 argument(s), got {args.Length}");
        }

        var index = (int?)PrepareNumericArg(args[0]);
        if (!index.HasValue)
        {
            throw new ExpressionEvaluatorTypeErrorException($"Expected number, got value \"{args[0]}\"");
        }

        if (positionalArguments == null)
        {
            throw new ExpressionEvaluatorTypeErrorException("No positional arguments available");
        }
        if (index < 0 || index >= positionalArguments.Length)
        {
            throw new ExpressionEvaluatorTypeErrorException($"Index {index} out of range");
        }

        return positionalArguments[index.Value];
    }
}
