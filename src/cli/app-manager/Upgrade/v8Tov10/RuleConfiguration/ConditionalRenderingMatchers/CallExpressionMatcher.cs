using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration.ConditionalRenderingMatchers;

/// <summary>
/// Matches JavaScript method calls like string.includes(), etc.
/// </summary>
public class CallExpressionMatcher : IExpressionMatcher
{
    public bool CanMatch(Expression expression)
    {
        return expression is CallExpression;
    }

    public object? Match(Expression expression, ConversionContext context, List<string> debugInfo)
    {
        if (expression is not CallExpression callExpr)
            return null;

        // Check if this is a member expression call (e.g., obj.method())
        if (callExpr.Callee is not MemberExpression memberExpr)
        {
            debugInfo.Add($"❌ Unsupported call expression (not a member expression)");
            return null;
        }

        // Check if this is a call to conditionalRuleHandlerObject.someMethod()
        if (memberExpr.Object is Identifier objIdentifier && objIdentifier.Name == "conditionalRuleHandlerObject")
        {
            var methodName = memberExpr.Property switch
            {
                Identifier id => id.Name,
                _ => null,
            };

            if (methodName != null)
            {
                return HandleConditionalRuleHandlerCall(methodName, context, debugInfo);
            }
        }

        // Get the property name (method name)
        var propertyMethodName = memberExpr.Property switch
        {
            Identifier id => id.Name,
            _ => null,
        };

        if (propertyMethodName == null)
        {
            debugInfo.Add($"❌ Could not determine method name");
            return null;
        }

        // Handle different methods
        return propertyMethodName switch
        {
            "includes" => HandleIncludes(memberExpr, callExpr, context, debugInfo),
            "indexOf" => HandleIndexOfStandalone(debugInfo),
            _ => HandleUnsupportedMethod(propertyMethodName, debugInfo),
        };
    }

    /// <summary>
    /// Handle calls to conditionalRuleHandlerObject.someMethod(arg)
    /// Inlines the function body by looking it up in AvailableFunctions
    /// </summary>
    private object? HandleConditionalRuleHandlerCall(
        string methodName,
        ConversionContext context,
        List<string> debugInfo
    )
    {
        debugInfo.Add($"Found call to conditionalRuleHandlerObject.{methodName}()");

        // Look up the function in available functions
        if (!context.AvailableFunctions.TryGetValue(methodName, out var functionExpression))
        {
            debugInfo.Add($"❌ Function '{methodName}' not found in conditionalRuleHandlerObject");
            return null;
        }

        debugInfo.Add($"Inlining function '{methodName}'");

        // The function should have one argument (the object parameter)
        // We need to convert the expression in the context of the passed argument
        // For now, we'll assume the argument is the same 'obj' parameter
        // and simply inline the function's return expression

        // Convert the inlined function's return expression
        var result = context.ConvertExpression(functionExpression, debugInfo);

        if (result == null)
        {
            debugInfo.Add($"❌ Failed to convert inlined function '{methodName}'");
            return null;
        }

        debugInfo.Add($"✅ Successfully inlined function '{methodName}'");
        return result;
    }

    /// <summary>
    /// Handle string.includes(substring)
    /// Converts to ["contains", string, substring]
    /// Note: Arrays are not supported in the expression language, only string operations
    /// </summary>
    private object? HandleIncludes(
        MemberExpression memberExpr,
        CallExpression callExpr,
        ConversionContext context,
        List<string> debugInfo
    )
    {
        debugInfo.Add("Converting string.includes() to 'contains'");

        // Get the string being called on
        var subject = context.ConvertExpression(memberExpr.Object, debugInfo);
        if (subject == null)
        {
            debugInfo.Add("❌ Failed to convert subject of .includes()");
            return null;
        }

        // Get the argument (value to search for)
        if (callExpr.Arguments.Count == 0)
        {
            debugInfo.Add("❌ .includes() requires at least one argument");
            return null;
        }

        var searchValue = context.ConvertExpression(callExpr.Arguments[0], debugInfo);
        if (searchValue == null)
        {
            debugInfo.Add("❌ Failed to convert argument to .includes()");
            return null;
        }

        // Unwrap null values
        var searchValueUnwrapped = UnwrapNullValue(searchValue);

        debugInfo.Add("✅ Successfully converted .includes() to 'contains'");

        return new object?[] { "contains", subject, searchValueUnwrapped };
    }

    /// <summary>
    /// Handle standalone indexOf() calls (not in comparison context)
    /// indexOf() by itself can't be converted - it's only valid when compared with -1
    /// That pattern is handled by BinaryComparisonMatcher
    /// </summary>
    private object? HandleIndexOfStandalone(List<string> debugInfo)
    {
        debugInfo.Add($"❌ indexOf() must be used in comparison with -1 (e.g., indexOf(x) !== -1)");
        debugInfo.Add($"   Standalone indexOf() calls cannot be converted to expression language");
        return null;
    }

    private object? HandleUnsupportedMethod(string methodName, List<string> debugInfo)
    {
        debugInfo.Add($"❌ Unsupported method call: .{methodName}()");
        return null;
    }

    /// <summary>
    /// Unwrap null values that were wrapped to distinguish from conversion failure
    /// </summary>
    private static object? UnwrapNullValue(object value)
    {
        // Check if this is a wrapped null (single-element array containing null)
        if (value is object?[] array && array.Length == 1 && array[0] == null)
        {
            return null;
        }
        return value;
    }
}
