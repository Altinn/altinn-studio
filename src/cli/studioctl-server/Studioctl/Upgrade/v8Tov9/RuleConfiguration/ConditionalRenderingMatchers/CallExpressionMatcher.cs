using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.ConditionalRenderingMatchers;

/// <summary>
/// Converts string searches and pure calls to other conditional functions.
/// </summary>
public class CallExpressionMatcher : IExpressionMatcher
{
    public bool CanMatch(Expression expression) => expression is CallExpression;

    public object? Match(Expression expression, ConversionContext context, List<string> debugInfo)
    {
        if (expression is not CallExpression call || call.Callee is not MemberExpression { Computed: false } member)
            return null;
        if (IsConditionalCall(call))
            return InlineConditional(call, context, debugInfo, false);
        if (member.Property is not Identifier { Name: "includes" } || call.Arguments.Count != 1)
        {
            return context.Reject(
                "Only includes with one argument and pure conditional helper calls are supported",
                debugInfo
            );
        }
        if (context.GetValueType(member.Object) != "string" || !context.HasSafeStringDomain(member.Object))
        {
            return context.Reject(
                "String searches require a bounded string domain to preserve reserved text values",
                debugInfo
            );
        }
        if (context.GetValueType(call.Arguments[0]) != "string" || !context.HasSafeStringDomain(call.Arguments[0]))
        {
            return context.Reject("String search text must preserve its type and reserved-value casing", debugInfo);
        }
        var subject = context.ConvertExpression(member.Object, debugInfo);
        var search = context.ConvertExpression(call.Arguments[0], debugInfo);
        return subject == null || search == null ? null : new object[] { "contains", subject, search };
    }

    public static bool IsConditionalCall(CallExpression call) =>
        call.Callee
            is MemberExpression
            {
                Computed: false,
                Object: Identifier { Name: "conditionalRuleHandlerObject" },
                Property: Identifier,
            };

    public static object? InlineConditional(
        CallExpression call,
        ConversionContext context,
        List<string> debugInfo,
        bool booleanResult
    )
    {
        if (call.Callee is not MemberExpression { Property: Identifier method })
            return null;
        if (!context.FunctionDefinitions.TryGetValue(method.Name, out var function))
        {
            return context.Reject($"Conditional function '{method.Name}' was not found", debugInfo);
        }
        if (
            call.Arguments.Count != 1
            || call.Arguments[0] is not Identifier argument
            || argument.Name != context.ObjectParameterName
        )
        {
            return context.Reject("Conditional helpers must receive the current input object unchanged", debugInfo);
        }
        if (!context.ActiveFunctions.Add(method.Name))
        {
            return context.Reject(
                $"Recursive conditional helper '{method.Name}' requires manual conversion",
                debugInfo
            );
        }
        try
        {
            var parsed = new JavaScriptExpressionParser().ParseFunction(function.Implementation);
            if (!parsed.Success || parsed.ReturnExpression == null)
            {
                return context.Reject(parsed.ErrorMessage ?? "Conditional helper could not be parsed", debugInfo);
            }
            if (
                parsed.AllStatements?.Any(statement => ContainsInputAssignment(statement, parsed.ObjectParameterName))
                == true
            )
            {
                return context.Reject("Conditional helpers that mutate their input object are not pure", debugInfo);
            }
            var nested = new ConversionContext
            {
                InputParams = context.InputParams,
                ObjectParameterName = parsed.ObjectParameterName,
                InputTypes = context.InputTypes,
                InputOptions = context.InputOptions,
                Matchers = context.Matchers,
                GlobalConstants = context.GlobalConstants,
                FunctionDefinitions = context.FunctionDefinitions,
                ActiveFunctions = context.ActiveFunctions,
                KnownNonNullInputs = new(context.KnownNonNullInputs, StringComparer.Ordinal),
                KnownNonZeroInputs = new(context.KnownNonZeroInputs, StringComparer.Ordinal),
            };
            if (
                parsed.EvaluatedExpressions.Any(evaluated =>
                    !nested.IsPureValue(evaluated) && nested.ConvertExpression(evaluated, debugInfo) == null
                )
            )
                return context.Reject(
                    nested.FailureReason ?? "Conditional helper initializer could not be converted",
                    debugInfo
                );
            var result = booleanResult
                ? nested.ConvertBoolean(parsed.ReturnExpression, debugInfo)
                : nested.ConvertExpression(parsed.ReturnExpression, debugInfo);
            context.RequiresEnvironmentSettings |= nested.RequiresEnvironmentSettings;
            return result
                ?? context.Reject(nested.FailureReason ?? "Conditional helper could not be converted", debugInfo);
        }
        finally
        {
            context.ActiveFunctions.Remove(method.Name);
        }
    }

    private static bool ContainsInputAssignment(Node node, string parameter) =>
        node is AssignmentExpression { Left: MemberExpression { Object: Identifier source } }
            && source.Name == parameter
        || node.ChildNodes.Any(child => ContainsInputAssignment(child, parameter));
}
