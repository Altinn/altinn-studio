using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Internal.Expressions;

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
    public override Expression Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        return ReadStatic(ref reader, options);
    }

    /// <summary>
    /// Reads a JSON element and converts it to an <see cref="Expression"/>.
    /// </summary>
    public static Expression ReadStatic(JsonElement element) =>
        element.ValueKind switch
        {
            JsonValueKind.True => new Expression(true),
            JsonValueKind.False => new Expression(false),
            JsonValueKind.String => new Expression(element.GetString()),
            JsonValueKind.Number => new Expression(element.GetDouble()),
            JsonValueKind.Null => new Expression(ExpressionValue.Null),
            JsonValueKind.Array => ReadArray(element),
            JsonValueKind.Object => throw new JsonException("Invalid type \"object\""),
            _ => throw new JsonException(),
        };

    /// <summary>
    /// Same as <see cref="Read" />, but without the nullable return type required by the interface. Throw an exeption instead.
    /// </summary>
    public static Expression ReadStatic(ref Utf8JsonReader reader, JsonSerializerOptions options)
    {
        return reader.TokenType switch
        {
            JsonTokenType.True => new Expression(true),
            JsonTokenType.False => new Expression(false),
            JsonTokenType.String => new Expression(reader.GetString()),
            JsonTokenType.Number => new Expression(reader.GetDouble()),
            JsonTokenType.Null => new Expression(ExpressionValue.Null),
            JsonTokenType.StartArray => ReadArray(ref reader, options),
            JsonTokenType.StartObject => throw new JsonException("Invalid type \"object\""),
            _ => throw new JsonException(),
        };
    }

    private static Expression ReadArray(JsonElement element)
    {
        if (element.GetArrayLength() == 0)
        {
            throw new JsonException("Missing function name in expression");
        }

        using var enumerator = element.EnumerateArray();
        if (!enumerator.MoveNext())
        {
            throw new JsonException("Missing function name in expression");
        }

        if (enumerator.Current.ValueKind != JsonValueKind.String)
        {
            throw new JsonException("Function name in expression must be string");
        }
        var args = new List<Expression>();
        var functionString = enumerator.Current.GetString();

        var functionEnum = ExpressionFunction(functionString);
        if (functionEnum == Expressions.ExpressionFunction.INVALID)
        {
            args.Add(new Expression(functionString));
        }

        while (enumerator.MoveNext())
        {
            args.Add(ReadStatic(enumerator.Current));
        }

        return new Expression(functionEnum, args.ToArray());
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
        var args = new List<Expression>();

        var functionString = reader.GetString();
        var functionEnum = ExpressionFunction(functionString);

        if (functionEnum == Expressions.ExpressionFunction.INVALID)
        {
            args.Add(new Expression(functionString));
        }

        while (reader.Read() && reader.TokenType != JsonTokenType.EndArray)
        {
            args.Add(ReadStatic(ref reader, options));
        }

        return new Expression(functionEnum, args.ToArray());
    }

    private static ExpressionFunction ExpressionFunction(string? stringFunction)
    {
        if (!Enum.TryParse<ExpressionFunction>(stringFunction, ignoreCase: false, out var functionEnum))
        {
            return Expressions.ExpressionFunction.INVALID;
        }

        return functionEnum;
    }

    /// <inheritdoc />
    public override void Write(Utf8JsonWriter writer, Expression value, JsonSerializerOptions options)
    {
        if (value.IsLiteralValue)
        {
            // Just serialize the literal value
            JsonSerializer.Serialize(writer, value.ValueUnion.ToObject(), options);
        }
        else
        {
            // Serialize with as an array expression ["functionName", arg1, arg2, ...]
            writer.WriteStartArray();
            if (value.Function != Expressions.ExpressionFunction.INVALID)
            {
                writer.WriteStringValue(value.Function.ToString());
            }
            foreach (var arg in value.Args)
            {
                JsonSerializer.Serialize(writer, arg, options);
            }
            writer.WriteEndArray();
        }
    }
}
