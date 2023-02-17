using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Serialization;
using JetBrains.Annotations;

namespace Altinn.Studio.Designer.Models;

/// <summary>
/// Model for C# representation of a Layout Expression that can be part of a layout />
/// </summary>
/// <remarks>
/// All props are marked as nullable, but a valid instance has either <see cref="Function" /> and <see cref="Args" /> or <see cref="Value" />
/// </remarks>
[JsonConverter(typeof(ExpressionConverter))]
public sealed class Expression
{
    /// <summary>
    /// Name of the function. Must be one those actually implemented in <see cref="ExpressionEvaluator" />
    /// </summary>
    public ExpressionFunction? Function { get; set; }

    /// <summary>
    /// List of arguments to the function. These expressions will be evaluated before passed to the function.
    /// </summary>
    [CanBeNull] public List<Expression> Args { get; set; }

    /// <summary>
    /// Some expressions are just literal values that evaluate to the same value.
    /// </summary>
    /// <remarks>
    ///  If <see cref="Value" /> isn't null, <see cref="Function" /> and <see cref="Args" /> must be
    /// </remarks>
    [CanBeNull] public object Value { get; set; }
}

/// <summary>
/// JsonConverter to be able to parse any valid Expression in Json format to the C# <see cref="Expression"/>
/// </summary>
/// <remarks>
/// Currently this parser supports {"function":"funcname", "args": [arg1, arg2]} and ["funcname", arg1, arg2] syntax, and literal primitive types
/// </remarks>
public class ExpressionConverter : JsonConverter<Expression>
{
    /// <inheritdoc />
    [CanBeNull] public override Expression Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        return ReadNotNull(ref reader, options);
    }

    /// <summary>
    /// Same as <see cref="Read" />, but without the nullable return type required by the interface. Throw an exeption instead.
    /// </summary>
    public static Expression ReadNotNull(ref Utf8JsonReader reader, JsonSerializerOptions options)
    {
        return reader.TokenType switch
        {
            JsonTokenType.True => new Expression { Value = true },
            JsonTokenType.False => new Expression { Value = false },
            JsonTokenType.String => new Expression { Value = reader.GetString() },
            JsonTokenType.Number => new Expression { Value = reader.GetDouble() },
            JsonTokenType.Null => new Expression { Value = null },
            JsonTokenType.StartArray => ReadArray(ref reader, options),
            JsonTokenType.StartObject => throw new JsonException("Invalid type \"object\""),
            _ => throw new JsonException(),
        };
    }

    private static Expression ReadArray(ref Utf8JsonReader reader, JsonSerializerOptions options)
    {
        reader.Read();
        if (reader.TokenType == JsonTokenType.EndArray)
        {
            throw new JsonException("Missing function name in expression");
        }
        if (reader.TokenType != JsonTokenType.String)
        {
            throw new JsonException("Function name in expression should be string");
        }
        var stringFunction = reader.GetString();
        if (!Enum.TryParse<ExpressionFunction>(stringFunction, ignoreCase: false, out var functionEnum))
        {
            throw new JsonException($"Function \"{stringFunction}\" not implemented");
        }
        var expr = new Expression()
        {
            Function = functionEnum,
            Args = new List<Expression>()
        };

        while (reader.Read() && reader.TokenType != JsonTokenType.EndArray)
        {
            expr.Args.Add(ReadNotNull(ref reader, options));
        }

        return expr;
    }

    /// <inheritdoc />
    public override void Write(Utf8JsonWriter writer, Expression value, JsonSerializerOptions options)
    {
        if (value.Function != null && value.Args != null)
        {
            // Serialize with as an array expression ["functionName", arg1, arg2, ...]
            writer.WriteStartArray();
            writer.WriteStringValue(value.Function.ToString());
            foreach (var arg in value.Args)
            {
                JsonSerializer.Serialize(writer, arg, options);
            }
            writer.WriteEndArray();
        }
        else
        {
            // Just serialize the literal value
            JsonSerializer.Serialize(writer, value.Value, options);
        }
    }
}

/// <summary>
/// Enumeration for valid functions in Layout Expressions
/// </summary>
public enum ExpressionFunction
{
    /// <summary>
    /// Value for all unknown functions.
    /// </summary>
    INVALID,
    /// <summary>
    /// Lookup in datamodel (respect current context for missing indexes for repeating groups)
    /// </summary>
    dataModel,
    /// <summary>
    /// Lookup data in simpleBinding for a component with this ID
    /// </summary>
    component,
    /// <summary>
    /// Lookup a few properties from the instance
    /// </summary>
    instanceContext,
    /// <summary>
    /// Conditional
    /// </summary>
    @if,
    /// <summary>
    /// Lookup settings from the `frontendSettings` key in appsettings.json (or any environment overrides)
    /// </summary>
    frontendSettings,
    /// <summary>
    /// Concat strings
    /// </summary>
    concat,
    /// <summary>
    /// Check if values are equal
    /// </summary>
    equals,
    /// <summary>
    /// <see cref="equals" />
    /// </summary>
    notEquals,
    /// <summary>
    /// Compare numerically
    /// </summary>
    greaterThanEq,
    /// <summary>
    /// Compare numerically
    /// </summary>
    lessThan,
    /// <summary>
    /// Compare numerically
    /// </summary>
    lessThanEq,
    /// <summary>
    /// Compare numerically
    /// </summary>
    greaterThan,
    /// <summary>
    /// Return true if all the expressions evaluate to true
    /// </summary>
    and,
    /// <summary>
    /// Return true if any of the expressions evaluate to true
    /// </summary>
    or,
    /// <summary>
    /// Return true if the single argument evaluate to false, otherwise return false
    /// </summary>
    not,
}
