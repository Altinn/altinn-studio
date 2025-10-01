using System.Linq.Expressions;

namespace Altinn.Codelists.Utilities;

/// <summary>
/// Simple predicate builder
/// </summary>
internal static class PredicateBuilder
{
    /// <summary>
    /// Creates a predicate that evaluates to true
    /// </summary>
    public static Expression<Func<T, bool>> True<T>()
    {
        return f => true;
    }

    /// <summary>
    /// Creates a predicate that evaluates to false
    /// </summary>
    public static Expression<Func<T, bool>> False<T>()
    {
        return f => false;
    }

    /// <summary>
    ///  Combines the first predicate with the second using the logical "or".
    /// </summary>
    public static Expression<Func<T, bool>> Or<T>(this Expression<Func<T, bool>> expr1, Expression<Func<T, bool>> expr2)
    {
        var invokedExpr = Expression.Invoke(expr2, expr1.Parameters.Cast<Expression>());
        return Expression.Lambda<Func<T, bool>>(Expression.OrElse(expr1.Body, invokedExpr), expr1.Parameters);
    }

    /// <summary>
    /// Combines the first predicate with the second using the logical "and".
    /// </summary>
    public static Expression<Func<T, bool>> And<T>(
        this Expression<Func<T, bool>> expr1,
        Expression<Func<T, bool>> expr2
    )
    {
        var invokedExpr = Expression.Invoke(expr2, expr1.Parameters.Cast<Expression>());
        return Expression.Lambda<Func<T, bool>>(Expression.AndAlso(expr1.Body, invokedExpr), expr1.Parameters);
    }
}
