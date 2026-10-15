using System.Collections.Immutable;
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
    ///     Construct a value expression with the given literal value
    /// </summary>
    /// <param name="value"></param>
    public Expression(ExpressionValue value)
    {
        Function = ExpressionFunction.LITERAL_VALUE;
        Args = default;
        ValueUnion = value;
    }

    /// <summary>
    /// Construct a function expression with the given function and arguments
    /// </summary>
    public Expression(ExpressionFunction function, Expression[] args)
    {
        if (function == ExpressionFunction.LITERAL_VALUE)
        {
            throw new ArgumentException("Function LITERAL_VALUE cannot have arguments", nameof(function));
        }
        if (args == null)
        {
            throw new ArgumentNullException(
                nameof(args),
                "Args cannot be null when constructing a function expression"
            );
        }
        Function = function;
        Args = ImmutableArray.Create(args);
    }

    /// <summary>
    /// Construct a function expression without copying the arguments
    /// </summary>
    internal Expression(ExpressionFunction function, ImmutableArray<Expression> args)
    {
        if (function == ExpressionFunction.LITERAL_VALUE)
        {
            throw new ArgumentException("Function LITERAL_VALUE cannot have arguments", nameof(function));
        }
        if (args.IsDefault)
        {
            throw new ArgumentNullException(
                nameof(args),
                "Args cannot be default when constructing a function expression"
            );
        }
        Function = function;
        Args = args;
    }

    /// <summary>
    /// Construct a function expression with the given function and arguments
    /// </summary>
    [Obsolete("Use the constructor with Expression[] instead")]
    public Expression(ExpressionFunction function, List<Expression> args)
        : this(function, args.ToArray()) { }

    /// <summary>
    ///     Construct a value expression with the given value
    /// </summary>
    /// <param name="value"></param>
    [Obsolete("Use the constructor with ExpressionValue instead")]
    public Expression(object? value)
        : this(ExpressionValue.FromObject(value)) { }

    /// <summary>
    /// Construct a function expression with the given function and arguments
    /// </summary>
    public Expression(ExpressionFunction function, Expression arg1)
        : this(function, new[] { arg1 }) { }

    /// <summary>
    /// Construct a function expression with the given function and arguments
    /// </summary>
    public Expression(ExpressionFunction function, Expression arg1, Expression arg2)
        : this(function, new[] { arg1, arg2 }) { }

    /// <summary>
    /// Test function to see if this is representing a function with args.
    /// </summary>
    [Obsolete("Use !IsLiteralValue instead")]
    public bool IsFunctionExpression => !IsLiteralValue;

    /// <summary>
    /// Test to see if this expression must be evaluated or is just a literal value.
    /// </summary>
    public bool IsLiteralValue => Args.IsDefault;

    /// <summary>
    /// Name of the function. Must be one those actually implemented in <see cref="ExpressionEvaluator" />
    /// </summary>
    public ExpressionFunction Function { get; }

    /// <summary>
    /// List of arguments to the function. These expressions will be evaluated before passed to the function.
    /// </summary>
    /// <remarks>
    /// Default (<see cref="ImmutableArray{T}.IsDefault"/>) for a literal value, see <see cref="IsLiteralValue"/>.
    /// </remarks>
    public ImmutableArray<Expression> Args { get; }

    /// <summary>
    /// Get the object value for backwards compatibility
    /// </summary>
    [Obsolete("Use ValueUnion instead")]
    public object? Value =>
        ValueUnion.ValueKind switch
        {
            JsonValueKind.Null => null,
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.String => ValueUnion.String,
            JsonValueKind.Number => ValueUnion.Number,
            _ => throw new InvalidOperationException("Invalid value kind"),
        };

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
    /// Returns true if this expression is a literal string value
    /// </summary>
    public bool IsLiteralString => ValueUnion.ValueKind == JsonValueKind.String;

    /// <summary>
    /// Used when the expression is not defined
    /// </summary>
    public static Expression Undefined => new(ExpressionValue.Undefined);

    /// <summary>
    /// The custom <see cref="ExpressionConverter"/> is a <see cref="JsonConverter{T}"/>
    /// that serializes the expression to JSON (array for function or literal value).
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
        // if (!IsLiteralValue)
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
        // if (!IsLiteralValue)
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
