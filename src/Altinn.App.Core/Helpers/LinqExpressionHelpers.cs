using System.Linq.Expressions;
using System.Reflection;
using System.Text.Json.Serialization;

namespace Altinn.App.Core.Helpers;

/// <summary>
/// Utilities for working with <see cref="Expression"/>
/// </summary>
public static class LinqExpressionHelpers
{
    /// <summary>
    /// Gets the JSON path from an expression
    /// </summary>
    /// <param name="expression">The expression</param>
    /// <returns>The JSON path</returns>
    public static string GetJsonPath<TModel, T>(Expression<Func<TModel, T>> expression)
    {
        return GetJsonPath_internal(expression);
    }

    /// <summary>
    /// Need a private method to avoid the generic type parameter for recursion
    /// </summary>
    private static string GetJsonPath_internal(Expression expression)
    {
        ArgumentNullException.ThrowIfNull(expression);

        var path = new List<string>();
        Expression? current = expression;
        while (current is not null)
        {
            switch (current)
            {
                case MemberExpression memberExpression:
                    path.Add(GetJsonPropertyName(memberExpression.Member));
                    current = memberExpression.Expression;
                    break;
                case LambdaExpression lambdaExpression:
                    current = lambdaExpression.Body;
                    break;
                case ParameterExpression:
                    // We have reached the root of the expression
                    current = null;
                    break;

                // This is a special case for accessing a list item by index
                case MethodCallExpression { Method.Name: "get_Item", Arguments: [ ConstantExpression { Value: Int32 index } ], Object: MemberExpression memberExpression }:
                    path.Add($"{GetJsonPropertyName(memberExpression.Member)}[{index}]");
                    current = memberExpression.Expression;
                    break;
                // This is a special case for accessing a list item by index in a variable
                case MethodCallExpression { Method.Name: "get_Item", Arguments: [ MemberExpression { Expression: ConstantExpression constantExpression, Member: FieldInfo fieldInfo }], Object: MemberExpression memberExpression }:
                    // Evaluate the constant expression to get the index
                    var evaluatedIndex = fieldInfo.GetValue(constantExpression.Value);
                    path.Add($"{GetJsonPropertyName(memberExpression.Member)}[{evaluatedIndex}]");
                    current = memberExpression.Expression;
                    break;
                // This is a special case for selecting all childern of a list using Select
                case MethodCallExpression { Method.Name: "Select" } methodCallExpression:
                    path.Add(GetJsonPath_internal(methodCallExpression.Arguments[1]));
                    current = methodCallExpression.Arguments[0];
                    break;
                default:
                    throw new ArgumentException($"Invalid expression {expression}. Failed reading {current}");
            }
        }

        path.Reverse();
        return string.Join(".", path);
    }

    private static string GetJsonPropertyName(MemberInfo memberExpressionMember)
    {
        var jsonPropertyAttribute = memberExpressionMember.GetCustomAttribute<JsonPropertyNameAttribute>();
        if (jsonPropertyAttribute is not null)
        {
            return jsonPropertyAttribute.Name;
        }

        return memberExpressionMember.Name;
    }
}