using System.Text.Json;
using System.Text.Json.Serialization;

namespace Altinn.App.Core.Models.Expressions;

/// <summary>
/// JsonConverter to be able to parse any valid Expression in Json format to the C# <see cref="Expression"/>
/// </summary>
/// <remarks>
/// Currently this parser supports {"function":"funcname", "args": [arg1, arg2]} and ["funcname", arg1, arg2] syntax, and literal primitive types
/// </remarks>
public class ExpressionConverter : JsonConverter<Expression>
{
    /// <inheritdoc />
    public override Expression? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
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
        var expr = new Expression() { Function = functionEnum, Args = new List<Expression>() };

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
