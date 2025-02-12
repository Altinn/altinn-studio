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
public readonly record struct Expression
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
    public static Expression False => new(false);

    /// <summary>
    /// Overridden for better debugging experience
    /// </summary>
    public override string ToString()
    {
        return JsonSerializer.Serialize(this);
    }
}
