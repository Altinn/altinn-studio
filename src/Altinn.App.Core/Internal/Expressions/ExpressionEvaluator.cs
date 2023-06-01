using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;

using Altinn.App.Core.Models.Expressions;
using Altinn.App.Core.Models.Layout.Components;

namespace Altinn.App.Core.Internal.Expressions;

/// <summary>
/// Static class used to evaluate expressions. Holds the implementation for all expression functions.
/// </summary>
public static class ExpressionEvaluator
{
    /// <summary>
    /// Shortcut for evaluating a boolean expression on a given property on a <see cref="BaseComponent" />
    /// </summary>
    public static bool EvaluateBooleanExpression(LayoutEvaluatorState state, ComponentContext context, string property, bool defaultReturn)
    {
        try
        {
            var expr = property switch
            {
                "hidden" => context.Component.Hidden,
                "required" => context.Component.Required,
                _ => throw new ExpressionEvaluatorTypeErrorException($"unknown boolean expression property {property}")
            };
            if (expr is null)
            {
                return defaultReturn;
            }

            return EvaluateExpression(state, expr, context) switch
            {
                true => true,
                false => false,
                null => defaultReturn,
                _ => throw new ExpressionEvaluatorTypeErrorException($"Return was not boolean (value)")
            };
        }
        catch(Exception e)
        {
            throw new ExpressionEvaluatorTypeErrorException($"Error while evaluating \"{property}\" on \"{context.Component.PageId}.{context.Component.Id}\"", e);
        }
    }

    /// <summary>
    /// Evaluate a <see cref="Expression" /> from a given <see cref="LayoutEvaluatorState" /> in a <see cref="ComponentContext" />
    /// </summary>
    public static object? EvaluateExpression(LayoutEvaluatorState state, Expression expr, ComponentContext context)
    {
        if (expr is null)
        {
            return null;
        }
        if (expr.Function is null || expr.Args is null)
        {
            return expr.Value;
        }

        var args = expr.Args.Select(a => EvaluateExpression(state, a, context)).ToArray();
        var ret = expr.Function switch
        {
            ExpressionFunction.dataModel => state.GetModelData(args.First()?.ToString(), context),
            ExpressionFunction.component => Component(args, context, state),
            ExpressionFunction.instanceContext => state.GetInstanceContext(args.First()?.ToString()!),
            ExpressionFunction.@if => IfImpl(args),
            ExpressionFunction.frontendSettings => state.GetFrontendSetting(args.First()?.ToString()!),
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
            ExpressionFunction.gatewayAction => state.GetGatewayAction(),
            _ => throw new ExpressionEvaluatorTypeErrorException($"Function \"{expr.Function}\" not implemented"),
        };
        return ret;
    }

    private static object? Component(object?[] args, ComponentContext context, LayoutEvaluatorState state)
    {
        var componentId = args.First()?.ToString();
        if (componentId is null)
        {
            throw new ArgumentException("Cannot lookup component null");
        }

        var targetContext = state.GetComponentContext(context.Component.PageId, componentId, context.RowIndices);

        if (targetContext.Component is GroupComponent)
        {
            throw new NotImplementedException("Component lookup for components in groups not implemented");
        }

        if (!targetContext.Component.DataModelBindings.TryGetValue("simpleBinding", out var binding))
        {
            throw new ArgumentException("component lookup requires the target component to have a simpleBinding");
        }
        ComponentContext? parent = targetContext; 
        while (parent is not null)
        {
            if(EvaluateBooleanExpression(state, parent, "hidden", false))
            {
                // Don't lookup data in hidden components
                return null;
            }
            parent = parent.Parent;
        }

        return state.GetModelData(binding, context);
    }

    private static string? Concat(object?[] args)
    {
        return string.Join("", args.Select(a => a switch { string s => s, _ => ToStringForEquals(a) }));
    }

    private static bool PrepareBooleanArg(object? arg)
    {
        return arg switch
        {
            bool b => b,
            null => false,
            string s => s switch
            {
                "true" => true,
                "false" => false,
                "1" => true,
                "0" => false,
                _ => parseNumber(s, throwException: false) switch
                {
                    1 => true,
                    0 => false,
                    _ => throw new ExpressionEvaluatorTypeErrorException($"Expected boolean, got value \"{s}\""),
                }
            },
            double s => s switch
            {
                1 => true,
                0 => false,
                _ => throw new ExpressionEvaluatorTypeErrorException($"Expected boolean, got value {s}"),
            },
            _ => throw new ExpressionEvaluatorTypeErrorException("Unknown data type encountered in expression: " + arg.GetType().Name),
        };
    }

    private static bool? And(object?[] args)
    {
        if (args.Length == 0)
        {
            throw new ExpressionEvaluatorTypeErrorException("Expected 1+ argument(s), got 0");
        }

        var preparedArgs = args.Select(arg => PrepareBooleanArg(arg)).ToArray();
        // Ensure all args gets converted, because they might throw an Exception
        return preparedArgs.All(a => a);
    }

    private static bool? Or(object?[] args)
    {
        if (args.Length == 0)
        {
            throw new ExpressionEvaluatorTypeErrorException("Expected 1+ argument(s), got 0");
        }

        var preparedArgs = args.Select(arg => PrepareBooleanArg(arg)).ToArray();
        // Ensure all args gets converted, because they might throw an Exception
        return preparedArgs.Any(a => a);
    }

    private static bool? Not(object?[] args)
    {
        if(args.Length != 1)
        {
            throw new ExpressionEvaluatorTypeErrorException($"Expected 1 argument(s), got {args.Length}");
        }
        return !PrepareBooleanArg(args[0]);
    }

    private static (double?, double?) PrepareNumericArgs(object?[] args)
    {
        if (args.Length != 2)
        {
            throw new ExpressionEvaluatorTypeErrorException("Invalid number of args for compare");
        }
        var a = args[0] switch
        {
            bool ab => throw new ExpressionEvaluatorTypeErrorException($"Expected number, got value {(ab ? "true" : "false")}"),
            string s => parseNumber(s),
            decimal d => (double)d,
            int i => (double)i,
            object o => o as double?, // assume all relevant numers are representable as double (as in frontend)
            _ => null,
        };

        var b = args[1] switch
        {
            bool bb => throw new ExpressionEvaluatorTypeErrorException($"Expected number, got value {(bb ? "true" : "false")}"),
            string s => parseNumber(s),
            decimal d => (double)d,
            int i => (double)i,
            object o => o as double?, // assume all relevant numers are representable as double (as in frontend)
            _ => null,
        };

        return (a, b);
    }

    private static object? IfImpl(object?[] args)
    {
        if (args.Length == 2)
        {
            return PrepareBooleanArg(args[0]) ? args[1] : null;
        }

        if (args.Length > 2 && !"else".Equals(args[2] as string, StringComparison.InvariantCultureIgnoreCase))
        {
            throw new ExpressionEvaluatorTypeErrorException("Expected third argument to be \"else\"");
        }

        if (args.Length == 4)
        {
            return PrepareBooleanArg(args[0]) ? args[1] : args[3];
        }

        throw new ExpressionEvaluatorTypeErrorException("Expected either 2 arguments (if) or 4 (if + else), got " + args.Length);
    }

    private static readonly Regex numberRegex = new Regex(@"^-?\d+(\.\d+)?$");
    private static double? parseNumber(string s, bool throwException = true)
    {
        if (numberRegex.IsMatch(s) && double.TryParse(s, NumberStyles.Any, CultureInfo.InvariantCulture, out var d))
        {
            return d;
        }

        if (throwException)
        {
            throw new ExpressionEvaluatorTypeErrorException($"Expected number, got value \"{s}\"");
        }
        return null;
    }

    private static bool? LessThan(object?[] args)
    {
        var (a, b) = PrepareNumericArgs(args);

        if (a is null || b is null)
        {
            return false; // error handeling
        }
        return a < b; // Actual implementation
    }

    private static bool? LessThanEq(object?[] args)
    {
        var (a, b) = PrepareNumericArgs(args);

        if (a is null || b is null)
        {
            return false; // error handeling
        }
        return a <= b; // Actual implementation
    }

    private static bool? GreaterThan(object?[] args)
    {
        var (a, b) = PrepareNumericArgs(args);

        if (a is null || b is null)
        {
            return false; // error handeling
        }
        return a > b; // Actual implementation
    }

    private static bool? GreaterThanEq(object?[] args)
    {
        var (a, b) = PrepareNumericArgs(args);

        if (a is null || b is null)
        {
            return false; // error handeling
        }
        return a >= b; // Actual implementation
    }

    private static string? ToStringForEquals(object? value)
    {
        if (value is null)
        {
            return null;
        }

        if (value is bool bvalue)
        {
            return bvalue ? "true" : "false";
        }

        if (value is string svalue)
        {
            // Special case for "TruE" to be equal to true
            if ("true".Equals(svalue, StringComparison.InvariantCultureIgnoreCase))
            {
                return "true";
            }
            else if ("false".Equals(svalue, StringComparison.InvariantCultureIgnoreCase))
            {
                return "false";
            }
            else if ("null".Equals(svalue, StringComparison.InvariantCultureIgnoreCase))
            {
                return null;
            }

            return svalue;
        }
        else if (value is decimal decvalue)
        {
            return decvalue.ToString(CultureInfo.InvariantCulture);
        }
        else if (value is double doubvalue)
        {
            return doubvalue.ToString(CultureInfo.InvariantCulture);
        }

        //TODO: consider accepting more types that might be used in model (eg Datetime)
        throw new NotImplementedException();
    }

    private static bool? EqualsImplementation(object?[] args)
    {
        if (args.Length != 2)
        {
            throw new ExpressionEvaluatorTypeErrorException($"Expected 2 argument(s), got {args.Length}");
        }

        return string.Equals(ToStringForEquals(args[0]), ToStringForEquals(args[1]), StringComparison.InvariantCulture);
    }
}

