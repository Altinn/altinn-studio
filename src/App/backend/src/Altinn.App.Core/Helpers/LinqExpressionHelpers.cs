using System.Linq.Expressions;
using System.Reflection;
using System.Text.Json.Serialization;

namespace Altinn.App.Core.Helpers;

/// <summary>
/// Utilities for working with <see cref="Expression" />
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

                // Special case for handling indexers (eg m=>m.Children![0].Age)
                case MethodCallExpression
                {
                    Method.Name: "get_Item",
                    Arguments: [{ } indexExpression],
                    Object: MemberExpression memberExpression
                }:
                    var index = GetValueFromExpression(indexExpression);
                    if (index is not int)
                    {
                        throw new ArgumentException(
                            $"Invalid indexer expression: Expected int, but got {index?.GetType().Name}: {index}"
                        );
                    }

                    path.Add($"{GetJsonPropertyName(memberExpression.Member)}[{index}]");
                    current = memberExpression.Expression;
                    break;

                // Special case for selecting all children of a list using Select ( m => m.Children.Select(c=>c.Age) )
                case MethodCallExpression { Method.Name: "Select", Arguments: [{ } root, { } selectorFunction] }:
                    path.Add(GetJsonPath_internal(selectorFunction));
                    current = root;
                    break;

                default:
                    throw new ArgumentException($"Invalid expression {expression}. Failed reading {current}");
            }
        }

        path.Reverse();
        return string.Join(".", path);
    }

    private static object? GetValueFromExpression(Expression expression)
    {
        switch (expression)
        {
            // Just return the value of the constant expression (eg: m=>m.Children![0].Age)
            case ConstantExpression constantExpression:
                return constantExpression.Value;

            // Evaluate the member expression on a field (recursively if needed)
            // This is used to evaluate the index in an indexer expression (eg: m=>m.Children![index].Age)
            case MemberExpression { Member: FieldInfo fieldInfo, Expression: { } memberExpression }:
                var evaluatedMember = GetValueFromExpression(memberExpression);
                return fieldInfo.GetValue(evaluatedMember);
            // Support for evaluating the member expression on a property (recursively if needed)
            case MemberExpression { Member: PropertyInfo propertyInfo, Expression: { } memberExpression }:
                var evaluatedMember2 = GetValueFromExpression(memberExpression);
                return propertyInfo.GetValue(evaluatedMember2);
            // Support for evaluating binary expressions in indexers (eg: m=>m.Children[model.Children.Count + 1)
            case BinaryExpression { Left: { } leftExpr, Right: { } rightExpr } be:
                var left =
                    GetValueFromExpression(leftExpr) as int?
                    ?? throw new ArgumentException($"Missing implementation for {be}.");
                var right =
                    GetValueFromExpression(rightExpr) as int?
                    ?? throw new ArgumentException($"Missing implementation for {be}.");
                return be.NodeType switch
                {
                    ExpressionType.Add => left + right,
                    ExpressionType.Subtract => left - right,
                    ExpressionType.Divide => left / right,
                    ExpressionType.Multiply => left * right,
                    ExpressionType.Modulo => left % right,
                    _ => throw new ArgumentException($"Missing implementation for {be}."),
                };

            // Currently we just error on unknown expressions
            default:
                throw new ArgumentException($"Missing implementation for {expression.GetType()} {expression}.");
        }
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
