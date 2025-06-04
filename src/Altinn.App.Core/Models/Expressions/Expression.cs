using System.Diagnostics.CodeAnalysis;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Internal.Expressions;

namespace Altinn.App.Core.Models.Expressions;

/// <summary>
/// Model for C# representation of a Layout Expression that can be part of a layout and Evaluated with <see cref="ExpressionEvaluator" />
/// </summary>
/// <remarks>
/// All props are marked as nullable, but a valid instance has either <see cref="Function" /> and <see cref="Args" /> or <see cref="ValueUnion" />
/// </remarks>
[JsonConverter(typeof(ExpressionConverter))]
public readonly struct Expression : IEquatable<Expression>
{
    /// <summary>
    ///     Construct a value expression with the given value
    /// </summary>
    /// <param name="value"></param>
    public Expression(ExpressionValue value)
    {
        ValueUnion = value;
    }

    /// <summary>
    ///     Construct a value expression with the given value
    /// </summary>
    /// <param name="value"></param>
    [Obsolete("Use the constructor with ExpressionValue instead")]
    public Expression(object? value)
    {
        ValueUnion = ExpressionValue.FromObject(value);
    }

    /// <summary>
    /// Construct a function expression with the given function and arguments
    /// </summary>
    public Expression(ExpressionFunction function, List<Expression>? args)
    {
        Function = function;
        Args = args;
    }

    /// <summary>
    /// Construct a function expression with the given function and arguments
    /// </summary>
    public Expression(ExpressionFunction function, Expression arg1)
    {
        Function = function;
        Args = [arg1];
    }

    /// <summary>
    /// Construct a function expression with the given function and arguments
    /// </summary>
    public Expression(ExpressionFunction function, Expression arg1, Expression arg2)
    {
        Function = function;
        Args = [arg1, arg2];
    }

    /// <summary>
    /// Test function to see if this is representing a function with args.
    /// </summary>
    [MemberNotNullWhen(true, nameof(Function), nameof(Args))]
#pragma warning disable CS0618 // Type or member is obsolete
    [MemberNotNullWhen(false, nameof(Value))]
#pragma warning restore CS0618 // Type or member is obsolete
    [MemberNotNullWhen(false, nameof(ValueUnion))]
    public bool IsFunctionExpression => Function != ExpressionFunction.INVALID && Args != null;

    /// <summary>
    /// Name of the function. Must be one those actually implemented in <see cref="ExpressionEvaluator" />
    /// </summary>
    public ExpressionFunction Function { get; }

    /// <summary>
    /// List of arguments to the function. These expressions will be evaluated before passed to the function.
    /// </summary>
    public List<Expression>? Args { get; }

    /// <summary>
    /// Get the object value for backwards compatibility
    /// </summary>
    [Obsolete("Use ValueUnion instead")]
    public object? Value => ValueUnion.ToObject();

    /// <summary>
    /// Some expressions are just literal values that evaluate to the same value.
    /// </summary>
    /// <remarks>
    ///  If <see cref="ValueUnion" /> isn't null, <see cref="Function" /> and <see cref="Args" /> must be
    /// </remarks>
    public ExpressionValue ValueUnion { get; }

    /// <summary>
    /// Static helper to create an expression with the value of false
    /// </summary>
    public static Expression False => new(ExpressionValue.False);

    /// <summary>
    /// Static helper to create an expression with the value of true
    /// </summary>
    public static Expression True => new(ExpressionValue.True);

    /// <summary>
    /// Static helper to create an expression with the value of true
    /// </summary>
    public static Expression Null => new(ExpressionValue.Null);

    /// <summary>
    /// Overridden for better debugging experience
    /// </summary>
    public override string ToString()
    {
        return JsonSerializer.Serialize(this);
    }

    /// <inheritdoc />
    public bool Equals(Expression other)
    {
        throw new NotImplementedException();
        // // First compare function types
        // if (Function != other.Function)
        //     return false;
        //
        // // For function expressions, compare arguments
        // if (IsFunctionExpression)
        // {
        //     if (other.Args == null || Args.Count != other.Args.Count)
        //         return false;
        //
        //     return Args.SequenceEqual(other.Args);
        // }
        //
        // // For value expressions, compare value unions
        // return ValueUnion.Equals(other.ValueUnion);
    }

    /// <inheritdoc />
    public override bool Equals(object? obj)
    {
        return obj is Expression other && Equals(other);
    }

    /// <inheritdoc />
    public override int GetHashCode()
    {
        throw new NotImplementedException();
        // if (IsFunctionExpression)
        // {
        //     var hash = Function.GetHashCode();
        //     if (Args != null)
        //     {
        //         foreach (var arg in Args)
        //         {
        //             hash = HashCode.Combine(hash, arg.GetHashCode());
        //         }
        //     }
        //     return hash;
        // }
        //
        // return ValueUnion.GetHashCode();
    }

    /// <summary>
    /// Compares two <see cref="Expression"/> instances for equality.
    /// </summary>
    public static bool operator ==(Expression left, Expression right)
    {
        return left.Equals(right);
    }

    /// <summary>
    /// Determines whether two <see cref="Expression"/> instances are not equal.
    /// </summary>
    public static bool operator !=(Expression left, Expression right)
    {
        return !left.Equals(right);
    }
}
