using System.Diagnostics;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.Expressions;

/// <summary>
/// Discriminated union for the JSON types that can be arguments and result of expressions
/// </summary>
[JsonConverter(typeof(ExpressionTypeUnionConverter))]
public readonly struct ExpressionValue : IEquatable<ExpressionValue>
{
    private readonly JsonValueKind _valueKind;
    private readonly string? _stringValue = null;

    // double is a value type where nullable takes extra space, and we only read it when it should be set
    private readonly double _numberValue = 0;

    // private readonly Dictionary<string, ExpressionValue>? _objectValue = null;
    // private readonly ExpressionValue[]? _arrayValue = null;

    /// <summary>
    /// Constructor for NULL value
    /// </summary>
    public ExpressionValue()
    {
        _valueKind = JsonValueKind.Null;
    }

    /// <summary>
    /// Convenient accessor for NULL value
    /// </summary>
    public static ExpressionValue Null => new();

    private ExpressionValue(bool? value)
    {
        if (value.HasValue)
        {
            _valueKind = value.Value ? JsonValueKind.True : JsonValueKind.False;
        }
        else
        {
            _valueKind = JsonValueKind.Null;
        }
    }

    private ExpressionValue(double? value)
    {
        if (value.HasValue)
        {
            _valueKind = JsonValueKind.Number;
            _numberValue = value.Value;
        }
        else
        {
            _valueKind = JsonValueKind.Null;
        }
    }

    private ExpressionValue(string? value)
    {
        _valueKind = value is null ? JsonValueKind.Null : JsonValueKind.String;
        _stringValue = value;
    }

    // private ExpressionValue(Dictionary<string, ExpressionValue>? value)
    // {
    //     _valueKind = value is null ? JsonValueKind.Null : JsonValueKind.Object;
    //     _objectValue = value;
    // }

    // private ExpressionValue(ExpressionValue[]? value)
    // {
    //     _valueKind = value is null ? JsonValueKind.Null : JsonValueKind.Array;
    //     _arrayValue = value;
    // }

    /// <summary>
    /// Convert a nullable boolean to ExpressionValue
    /// </summary>
    public static implicit operator ExpressionValue(bool? value) => new(value);

    /// <summary>
    /// Convert a nullable double to ExpressionValue
    /// </summary>
    public static implicit operator ExpressionValue(double? value) => new(value);

    /// <summary>
    /// Convert a nullable string to ExpressionValue
    /// </summary>
    public static implicit operator ExpressionValue(string? value) => new(value);

    // /// <summary>
    // /// Convert a Dictionary to ExpressionValue
    // /// </summary>
    // public static implicit operator ExpressionValue(Dictionary<string, ExpressionValue>? value) => new(value);
    //
    // /// <summary>
    // /// Convert an array to ExpressionValue
    // /// </summary>
    // public static implicit operator ExpressionValue(ExpressionValue[]? value) => new(value);

    /// <summary>
    /// Convert any of the supported CLR types to an expressionTypeUnion
    /// </summary>
    public static ExpressionValue FromObject(object? value)
    {
        return value switch
        {
            ExpressionValue expressionValue => expressionValue,
            null => Null,
            bool boolValue => boolValue,
            string stringValue => stringValue,
            float numberValue => numberValue,
            double numberValue => numberValue,
            byte numberValue => numberValue,
            sbyte numberValue => numberValue,
            short numberValue => numberValue,
            ushort numberValue => numberValue,
            int numberValue => numberValue,
            uint numberValue => numberValue,
            long numberValue => numberValue,
            ulong numberValue => numberValue,
            decimal numberValue => (double?)numberValue, // expressions uses double which needs an explicit cast

            DateTime dateTimeValue => JsonSerializer.Serialize(dateTimeValue),
            DateTimeOffset dateTimeOffsetValue => JsonSerializer.Serialize(dateTimeOffsetValue),
            TimeSpan timeSpanValue => JsonSerializer.Serialize(timeSpanValue),
            TimeOnly timeOnlyValue => JsonSerializer.Serialize(timeOnlyValue),
            DateOnly dateOnlyValue => JsonSerializer.Serialize(dateOnlyValue),

            // Dictionary<string, ExpressionValue> objectValue => new ExpressionValue(objectValue),
            // TODO add support for arrays, objects and other potential types
            _ => Null,
        };
    }

    /// <summary>
    /// Convert the value to the relevant CLR type
    /// </summary>
    /// <returns></returns>
    /// <exception cref="InvalidOperationException"></exception>
    public object? ToObject() =>
        ValueKind switch
        {
            JsonValueKind.Null => null,
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.String => String,
            JsonValueKind.Number => Number,
            // JsonValueKind.Object => Object,
            // JsonValueKind.Array => Array,
            _ => throw new InvalidOperationException("Invalid value kind"),
        };

    /// <summary>
    /// Get the type of json value this represents
    /// </summary>
    public JsonValueKind ValueKind => _valueKind;

    /// <summary>
    /// Get the value as a boolean (or throw if it isn't a boolean ValueKind)
    /// </summary>
    public bool Bool =>
        _valueKind switch
        {
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            _ => throw new InvalidOperationException($"{this} is not a boolean"),
        };

    /// <summary>
    /// Get the value as a string (or throw if it isn't a string ValueKind)
    /// </summary>
    public string String =>
        _valueKind switch
        {
            JsonValueKind.String => _stringValue ?? throw new UnreachableException("Not a string"),
            _ => throw new InvalidOperationException($"{this} is not a string"),
        };

    /// <summary>
    /// Get the value as a number (or throw if it isn't a number ValueKind)
    /// </summary>
    public double Number =>
        _valueKind switch
        {
            JsonValueKind.Number => _numberValue,
            _ => throw new InvalidOperationException($"{this} is not a number"),
        };

    // public Dictionary<string, ExpressionValue> Object =>
    //     _valueKind switch
    //     {
    //         JsonValueKind.Object => _objectValue ?? throw new UnreachableException($"{this} is not an object"),
    //         _ => throw new InvalidOperationException($"{this} is not an object"),
    //     };
    //
    // public ExpressionValue[] Array =>
    //     _valueKind switch
    //     {
    //         JsonValueKind.Array => _arrayValue ?? throw new UnreachableException($"{this} is not an array"),
    //         _ => throw new InvalidOperationException($"{this} is not an array"),
    //     };

    /// <summary>
    /// Get the value as it would be serialized to JSON
    /// </summary>
    public override string ToString() =>
        ValueKind switch
        {
            JsonValueKind.Null => "null",
            JsonValueKind.True => "true",
            JsonValueKind.False => "false",
            JsonValueKind.String => JsonSerializer.Serialize(String),
            JsonValueKind.Number => JsonSerializer.Serialize(Number),
            // JsonValueKind.Object => JsonSerializer.Serialize(Object),
            // JsonValueKind.Array => JsonSerializer.Serialize(Array),
            _ => throw new InvalidOperationException("Invalid value kind"),
        };

    /// <summary>
    /// Override default equals because we get a really slow default implementation from the runtime
    /// </summary>
    public bool Equals(ExpressionValue other)
    {
        throw new NotImplementedException("ExpressionValue does not yet implement Equals");
    }

    /// <summary>
    /// Override default equals because we get a really slow default implementation from the runtime
    /// </summary>
    public override bool Equals(object? obj)
    {
        throw new NotImplementedException("ExpressionValue does not yet implement Equals");
    }

    /// <summary>
    /// Override default GetHashCode because we get a really slow default implementation from the runtime
    /// </summary>
    public override int GetHashCode()
    {
        throw new NotImplementedException("ExpressionValue does not yet implement GetHashCode");
    }

    /// <summary>
    /// Ensure that the == operator uses Equals
    /// </summary>
    public static bool operator ==(ExpressionValue left, ExpressionValue right)
    {
        return left.Equals(right);
    }

    /// <summary>
    /// Ensure that the != operator uses Equals
    /// </summary>
    public static bool operator !=(ExpressionValue left, ExpressionValue right)
    {
        return !(left == right);
    }
}

/// <summary>
/// JsonTypeUnion should serialize as the json value it represents, and the properties can't be accessed directly anyway
/// </summary>
internal class ExpressionTypeUnionConverter : JsonConverter<ExpressionValue>
{
    /// <inheritdoc />
    public override ExpressionValue Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        reader.Read();
        return reader.TokenType switch
        {
            JsonTokenType.True => true,
            JsonTokenType.False => false,
            JsonTokenType.String => reader.GetString(),
            JsonTokenType.Number => reader.GetDouble(),
            JsonTokenType.Null => ExpressionValue.Null,
            // JsonTokenType.StartObject => ReadObject(ref reader),
            // JsonTokenType.StartArray => ReadArray(ref reader),
            _ => throw new JsonException(),
        };
    }

    // private ExpressionValue ReadArray(ref Utf8JsonReader reader)
    // {
    //     throw new NotImplementedException();
    // }
    //
    // private ExpressionValue ReadObject(ref Utf8JsonReader reader)
    // {
    //     throw new NotImplementedException();
    // }

    /// <inheritdoc />
    public override void Write(Utf8JsonWriter writer, ExpressionValue value, JsonSerializerOptions options)
    {
        switch (value.ValueKind)
        {
            case JsonValueKind.Null:
                writer.WriteNullValue();
                break;
            case JsonValueKind.True:
                writer.WriteBooleanValue(true);
                break;
            case JsonValueKind.False:
                writer.WriteBooleanValue(false);
                break;
            case JsonValueKind.String:
                writer.WriteStringValue(value.String);
                break;
            case JsonValueKind.Number:
                writer.WriteNumberValue(value.Number);
                break;
            // case JsonValueKind.Object:
            //     JsonSerializer.Serialize(writer, value.Object, options);
            //     break;
            // case JsonValueKind.Array:
            //     JsonSerializer.Serialize(writer, value.Array, options);
            //     break;
            default:
                throw new JsonException();
        }
    }
}
