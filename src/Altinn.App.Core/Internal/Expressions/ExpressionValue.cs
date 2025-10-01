using System.Diagnostics;
using System.Globalization;
using System.Text.Encodings.Web;
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
    /// Constructor for NULL value (structs require a public parameterless constructor)
    /// </summary>
    public ExpressionValue()
        : this(JsonValueKind.Null) { }

    private ExpressionValue(JsonValueKind valueKind)
    {
        _valueKind = valueKind;
    }

    /// <summary>
    /// Convenient accessor for NULL value
    /// </summary>
    public static ExpressionValue Null => new(JsonValueKind.Null);

    /// <summary>
    /// Convenient accessor for true value
    /// </summary>
    public static ExpressionValue True => new(JsonValueKind.True);

    /// <summary>
    /// Convenient accessor for false value
    /// </summary>
    public static ExpressionValue False => new(JsonValueKind.False);

    /// <summary>
    /// Convenient accessor for undefined value
    /// </summary>
    public static ExpressionValue Undefined => new(JsonValueKind.Undefined);

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
            decimal numberValue =>
                (double?)numberValue // expressions uses double which needs an explicit cast
            ,
            DateTime dateTimeValue => JsonSerializer
                .Serialize(dateTimeValue, _unsafeSerializerOptionsForSerializingDates)
                .Trim(
                    '"'
                ) // Trim quotes to match the string representation
            ,
            DateTimeOffset dateTimeOffsetValue => JsonSerializer
                .Serialize(dateTimeOffsetValue, _unsafeSerializerOptionsForSerializingDates)
                .Trim(
                    '"'
                ) // Trim quotes to match the string representation
            ,
            TimeSpan timeSpanValue => JsonSerializer
                .Serialize(timeSpanValue, _unsafeSerializerOptionsForSerializingDates)
                .Trim(
                    '"'
                ) // Trim quotes to match the string representation
            ,
            TimeOnly timeOnlyValue => JsonSerializer
                .Serialize(timeOnlyValue, _unsafeSerializerOptionsForSerializingDates)
                .Trim(
                    '"'
                ) // Trim quotes to match the string representation
            ,
            DateOnly dateOnlyValue => JsonSerializer
                .Serialize(dateOnlyValue, _unsafeSerializerOptionsForSerializingDates)
                .Trim(
                    '"'
                ) // Trim quotes to match the string representation
            ,
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
            _ => throw new InvalidCastException(
                $"The .Bool property can't be used on an expression value that represent a {_valueKind}"
            ),
        };

    /// <summary>
    /// Get the value as a string (or throw if it isn't a string ValueKind)
    /// </summary>
    public string String =>
        _valueKind switch
        {
            JsonValueKind.String => _stringValue ?? throw new UnreachableException("Not a string"),
            _ => throw new InvalidCastException(
                $"The .String property can't be used on an expression value that represent a {_valueKind}"
            ),
        };

    /// <summary>
    /// Get the value as a number (or throw if it isn't a number ValueKind)
    /// </summary>
    public double Number =>
        _valueKind switch
        {
            JsonValueKind.Number => _numberValue,
            _ => throw new InvalidCastException(
                $"The .Number property can't be used on an expression value that represent a {_valueKind}"
            ),
        };

    // public Dictionary<string, ExpressionValue> Object =>
    //     _valueKind switch
    //     {
    //         JsonValueKind.Object => _objectValue ?? throw new UnreachableException($"{this} is not an object"),
    //         _ => throw new InvalidCastException(
    //            $"The .Object property can't be used on an expression value that represent a {_valueKind}"
    //        ),
    //     };
    //
    // public ExpressionValue[] Array =>
    //     _valueKind switch
    //     {
    //         JsonValueKind.Array => _arrayValue ?? throw new UnreachableException($"{this} is not an array"),
    //         _ => throw new InvalidCastException(
    //            $"The .Array property can't be used on an expression value that represent a {_valueKind}"
    //        ),
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
            JsonValueKind.String => JsonSerializer.Serialize(String, _unsafeSerializerOptionsForSerializingDates),
            JsonValueKind.Number => Number.ToString(CultureInfo.InvariantCulture),
            // JsonValueKind.Object => JsonSerializer.Serialize(Object),
            // JsonValueKind.Array => JsonSerializer.Serialize(Array),
            _ => throw new InvalidOperationException($"Invalid value kind {ValueKind}"),
        };

    /// <summary>
    /// Get the value as a string that can be used for equality comparisons in ["equals"] expressions.
    ///
    /// Has special handeling for strings that are "true", "false", or "null" to make them equal to the primitive types
    /// </summary>
    /// <returns></returns>
    /// <exception cref="NotImplementedException"></exception>
    public string? ToStringForEquals() =>
        ValueKind switch
        {
            JsonValueKind.Null => null,
            JsonValueKind.Undefined => null,
            JsonValueKind.True => "true",
            JsonValueKind.False => "false",
            JsonValueKind.String => String switch
            {
                // Special case for "TruE" to be equal to true
                { } sValue when sValue.Equals("true", StringComparison.OrdinalIgnoreCase) => "true",
                { } sValue when sValue.Equals("false", StringComparison.OrdinalIgnoreCase) => "false",
                { } sValue when sValue.Equals("null", StringComparison.OrdinalIgnoreCase) => null,
                { } sValue => sValue,
            },
            JsonValueKind.Number => Number.ToString(CultureInfo.InvariantCulture),
            // JsonValueKind.Object => JsonSerializer.Serialize(Object),
            // JsonValueKind.Array => JsonSerializer.Serialize(Array),
            _ => throw new NotImplementedException($"ToStringForEquals not implemented for {ValueKind}"),
        };

    /// <inheritdoc />
    public bool Equals(ExpressionValue other)
    {
        throw new NotImplementedException("Equals is not used for ExpressionValue");
        // First compare value kinds
        // if (_valueKind != other._valueKind)
        //     return false;

        // // Then compare actual values based on the kind
        // return _valueKind switch
        // {
        //     JsonValueKind.Null => true, // All null values are equal
        //     JsonValueKind.True => true, // All true values are equal
        //     JsonValueKind.False => true, // All false values are equal
        //     JsonValueKind.String => _stringValue == other._stringValue,
        //     // ReSharper disable once CompareOfFloatsByEqualityOperator
        //     JsonValueKind.Number => _numberValue == other._numberValue,
        //     // JsonValueKind.Object =>
        //     // JsonValueKind.Array =>
        //     _ => throw new InvalidOperationException("Invalid value kind"),
        // };
    }

    /// <inheritdoc />
    public override bool Equals(object? obj)
    {
        return obj is ExpressionValue other && Equals(other);
    }

    /// <inheritdoc />
    public override int GetHashCode()
    {
        throw new NotImplementedException("GetHashCode is not implemented for ExpressionValue");
        // return ValueKind switch
        // {
        //     JsonValueKind.Null => 0,
        //     JsonValueKind.True => 1,
        //     JsonValueKind.False => 0,
        //     JsonValueKind.String => _stringValue?.GetHashCode() ?? 0,
        //     JsonValueKind.Number => _numberValue.GetHashCode(),
        //     // JsonValueKind.Object =>
        //     // JsonValueKind.Array =>
        //     _ => throw new InvalidOperationException("Invalid value kind"),
        // };
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

    private static readonly JsonSerializerOptions _unsafeSerializerOptionsForSerializingDates = new()
    {
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };
}

/// <summary>
/// JsonTypeUnion should serialize as the json value it represents, and the properties can't be accessed directly anyway
/// </summary>
internal class ExpressionTypeUnionConverter : JsonConverter<ExpressionValue>
{
    /// <inheritdoc />
    public override ExpressionValue Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
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
            case JsonValueKind.Undefined:
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
