using System.Diagnostics;
using System.Globalization;
using System.Numerics;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.Expressions;

/// <summary>
/// Discriminated union for the JSON types that can be arguments and result of expressions
/// </summary>
[JsonConverter(typeof(ExpressionTypeUnionConverter))]
[DebuggerDisplay("{ToString(),nq}")]
public readonly struct ExpressionValue : IEquatable<ExpressionValue>
{
    private readonly string? _stringValue = null;
    private string _stringValueNotNull => _stringValue ?? throw new UnreachableException("String value is null");

    // double is a value type where nullable takes extra space, and we only read it when it should be set
    private readonly double _numberValue = 0;

    /// <summary>
    /// Constructor for NULL value (structs require a public parameterless constructor)
    /// </summary>
    public ExpressionValue()
        : this(JsonValueKind.Null) { }

    private ExpressionValue(JsonValueKind valueKind)
    {
        ValueKind = valueKind;
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
            ValueKind = value.Value ? JsonValueKind.True : JsonValueKind.False;
        }
        else
        {
            ValueKind = JsonValueKind.Null;
        }
    }

    private ExpressionValue(double? value)
    {
        if (value.HasValue)
        {
            ValueKind = JsonValueKind.Number;
            _numberValue = value.Value;
        }
        else
        {
            ValueKind = JsonValueKind.Null;
        }
    }

    private ExpressionValue(string? value)
    {
        ValueKind = value is null ? JsonValueKind.Null : JsonValueKind.String;
        _stringValue = value;
    }

    /// <summary>From a JsonNode</summary>
    private ExpressionValue(JsonNode? value)
    {
        if (value is null)
        {
            ValueKind = JsonValueKind.Null;
            return;
        }

        ValueKind = value.GetValueKind();
        switch (ValueKind)
        {
            case JsonValueKind.String:
                _stringValue = value.GetValue<string>();
                break;
            case JsonValueKind.Number:
                _numberValue = value.GetValue<double>();
                break;
            case JsonValueKind.Array:
            case JsonValueKind.Object:
                _stringValue = JsonSerializer.Serialize(value);
                break;
            case JsonValueKind.True:
            case JsonValueKind.False:
            case JsonValueKind.Null:
            case JsonValueKind.Undefined:
                break;
        }
    }

    private ExpressionValue(JsonElement value)
    {
        ValueKind = value.ValueKind;
        switch (ValueKind)
        {
            case JsonValueKind.String:
                _stringValue = value.GetString();
                break;
            case JsonValueKind.Number:
                _numberValue = value.GetDouble();
                break;
            case JsonValueKind.True:
            case JsonValueKind.False:
                break;
            case JsonValueKind.Array:
            case JsonValueKind.Object:
                _stringValue = value.GetRawText();
                break;
        }
    }

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

    /// <summary>
    /// Convert a JsonNode to ExpressionValue
    /// </summary>
    public static implicit operator ExpressionValue(JsonNode value) => new(value);

    /// <summary>
    /// Convert a JsonElement to ExpressionValue
    /// </summary>
    public static implicit operator ExpressionValue(JsonElement value) => new(value);

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
            BigInteger bigInteger => bigInteger.ToString(CultureInfo.InvariantCulture),
            JsonNode jsonNode => jsonNode,
            // Fallback to whatever JsonSerializer does
            _ => JsonSerializer.SerializeToElement(value),
        };
    }

    /// <summary>
    /// Convert the value to the relevant CLR type
    /// </summary>
    [Obsolete(
        "ToObject is not type safe and should be avoided. Use the type-specific properties or TryDeserialize<T> instead.",
        error: false
    )]
    public object? ToObject() =>
        ValueKind switch
        {
            JsonValueKind.Null => null,
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.String => String,
            JsonValueKind.Number => Number,
            _ => throw new InvalidOperationException("Invalid value kind"),
        };

    /// <summary>
    /// Get the type of json value this represents
    /// </summary>
    public JsonValueKind ValueKind { get; }

    /// <summary>
    /// Get the value as a boolean (or throw if it isn't a boolean ValueKind)
    /// </summary>
    public bool Bool =>
        ValueKind switch
        {
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            _ => throw new InvalidCastException(
                $"The .Bool property can't be used on an expression value that represent a {ValueKind}"
            ),
        };

    /// <summary>
    /// Get the value as a string (or throw if it isn't a string ValueKind)
    /// </summary>
    public string String
    {
        get
        {
            ThrowIfNotOfKind(JsonValueKind.String, nameof(String));
            return _stringValueNotNull;
        }
    }

    /// <summary>
    /// Get the value as a number (or throw if it isn't a number ValueKind)
    /// </summary>
    public double Number
    {
        get
        {
            ThrowIfNotOfKind(JsonValueKind.Number, nameof(Number));
            return _numberValue;
        }
    }

    /// <summary>
    /// Get the value as an object (or throw if it isn't an object ValueKind)
    /// </summary>
    public JsonNode? JsonNode =>
        ValueKind switch
        {
            JsonValueKind.Undefined => null,
            JsonValueKind.Object => JsonObject,
            JsonValueKind.Array => JsonArray,
            JsonValueKind.String => _stringValue,
            JsonValueKind.Number => _numberValue,
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Null => null,
            _ => throw new UnreachableException($"Invalid value kind"),
        };

    /// <summary>
    /// Get the value as a dictionary (or throw if it isn't an object ValueKind)
    /// </summary>
    public JsonObject JsonObject
    {
        get
        {
            ThrowIfNotOfKind(JsonValueKind.Object, nameof(JsonObject));
            return JsonNode.Parse(_stringValueNotNull)?.AsObject()
                ?? throw new UnreachableException("JsonObject value is null when ValueKind is Object");
        }
    }

    /// <summary>Get the value as an array (or throw if it isn't an array ValueKind)</summary>
    public JsonArray JsonArray
    {
        get
        {
            ThrowIfNotOfKind(JsonValueKind.Array, nameof(JsonArray));
            return JsonNode.Parse(_stringValueNotNull)?.AsArray()
                ?? throw new UnreachableException("JsonArray value is null when ValueKind is Array");
        }
    }

    /// <summary>
    /// Get the value as a JsonElement
    /// </summary>
    public JsonElement JsonElement =>
        ValueKind switch
        {
            JsonValueKind.Object or JsonValueKind.Array => ParseAndCloneJsonElement(
                _stringValue ?? throw new UnreachableException("_stringValue is null when ValueKind is Object or Array")
            ),
            JsonValueKind.String => JsonSerializer.SerializeToElement(_stringValue),
            JsonValueKind.Number => JsonSerializer.SerializeToElement(_numberValue),
            JsonValueKind.True => JsonSerializer.SerializeToElement(true),
            JsonValueKind.False => JsonSerializer.SerializeToElement(false),
            JsonValueKind.Null => JsonSerializer.SerializeToElement((object?)null),
            JsonValueKind.Undefined => default,
            _ => throw new InvalidOperationException(
                $"The .JsonElement property can't be used on an expression value that represent a {ValueKind}"
            ),
        };

    private static JsonElement ParseAndCloneJsonElement(string json)
    {
        using var document = JsonDocument.Parse(json);
        return document.RootElement.Clone();
    }

    /// <summary>
    /// Get the value as it would be serialized to JSON
    /// </summary>
    public override string ToString() =>
        ValueKind switch
        {
            JsonValueKind.Null => "null",
            JsonValueKind.Undefined => "undefined",
            JsonValueKind.True => "true",
            JsonValueKind.False => "false",
            JsonValueKind.String => JsonSerializer.Serialize(String, _unsafeSerializerOptionsForSerializingDates),
            JsonValueKind.Number => Number.ToString(CultureInfo.InvariantCulture),
            JsonValueKind.Object or JsonValueKind.Array => _stringValueNotNull,
            _ => throw new InvalidOperationException($"Invalid value kind {ValueKind}"),
        };

    /// <summary>
    /// Converts the current instance of <see cref="ExpressionValue"/> to its string representation
    /// suitable for text-based contexts.
    /// </summary>
    /// <returns>
    /// A string representation of the value. Returns "true" for boolean true, "false" for boolean false,
    /// the string content for string values, the numeric value as a string for number values, or an empty string for null.
    /// </returns>
    public string? ToStringForText() =>
        ValueKind switch
        {
            JsonValueKind.Null => null,
            JsonValueKind.String => String, // Unquoted
            _ => ToString(),
        };

    /// <summary>
    /// Get the value as a string that can be used for equality comparisons in ["equals"] expressions.
    ///
    /// Has special handling for strings that are "true", "false", or "null" to make them equal to the primitive types
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
            JsonValueKind.Object => JsonSerializer.Serialize(this),
            JsonValueKind.Array => JsonSerializer.Serialize(this),
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

    /// <summary>
    /// Convert the value to nullable boolean using loose conversion rules
    /// </summary>
    /// <remarks>
    /// Loose conversion rules:
    ///     * Undefined is null
    ///     * Null is false
    ///     * "true" (case-insensitive) is true
    ///     * "false" (case-insensitive) is false
    ///     * "1" is true
    ///     * "0" is false
    ///     * 1 is true
    ///     * 0 is false
    ///     * Anything else is null
    /// </remarks>
    public bool? ToBoolLoose()
    {
        return ValueKind switch
        {
            JsonValueKind.Null => false,
            JsonValueKind.Undefined => null,
            JsonValueKind.True => true,
            JsonValueKind.False => false,

            JsonValueKind.String => String switch
            {
                "true" => true,
                "false" => false,
                "1" => true,
                "0" => false,
                { } sValue when sValue.Equals("true", StringComparison.OrdinalIgnoreCase) => true,
                { } sValue when sValue.Equals("false", StringComparison.OrdinalIgnoreCase) => false,
                _ => ExpressionEvaluator.ParseNumber(String, throwException: false) switch
                {
                    1 => true,
                    0 => false,
                    _ => null,
                },
            },
            JsonValueKind.Number => Number switch
            {
                1 => true,
                0 => false,
                _ => null,
            },
            _ => null,
        };
    }

    /// <summary>
    /// Convert the ExpressionValue to the requested type T using normal JSON deserialization rules
    /// </summary>
    /// <remarks>
    /// Different from some json implementations we accept deserializing "number in string" and bool to numeric types
    /// (e.g., "123" to int, true to 1)
    /// Accept loose conversion rules for bool (e.g., "true", "TRUE", "1" and 1.0 to true)
    /// </remarks>
    /// <param name="result">The result (null or default if unsuccessful), but note that null might also be a valid result</param>
    /// <typeparam name="T">The type to convert to</typeparam>
    /// <returns>Whether the conversion was successful</returns>
    public bool TryDeserialize<T>(out T? result)
    {
        var type = typeof(T);
        if (TryDeserialize(type, out var rawResult))
        {
            result = rawResult is T typedResult ? typedResult : default;
            return true;
        }

        result = default;
        return false;
    }

    /// <summary>
    /// Convert the ExpressionValue to the requested type T using normal JSON deserialization rules
    /// </summary>
    /// <remarks>
    /// Different from some json implementations we accept deserializing "number in string" and bool to numeric types
    /// (e.g., "123" to int, true to 1)
    /// Accept loose conversion rules for bool (e.g., "true", "TRUE", "1" and 1.0 to true)
    /// </remarks>
    /// <param name="result">The result (null or default if unsuccessful), but note that null might also be a valid result</param>
    /// <param name="type">The type to convert to</param>
    /// <returns>Whether the conversion was successful</returns>
    public bool TryDeserialize(Type type, out object? result)
    {
        // Value types can be Nullable<T>, so assign underlyingType accordingly
        Type underlyingType;
        if (type.IsValueType)
        {
            if (Nullable.GetUnderlyingType(type) is not { } getUnderlyingType)
            {
                // Null or undefined can't be converted to non-nullable value types
                // so handle this special case early
                if (ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
                {
                    result = null;
                    return false;
                }

                underlyingType = type;
            }
            else
            {
                underlyingType = getUnderlyingType;
            }
        }
        else
        {
            underlyingType = type;
        }

        // Fast path for primitive types
        switch (ValueKind)
        {
            case JsonValueKind.Null:
            case JsonValueKind.Undefined:
                result = null;
                return true;
            case JsonValueKind.False or JsonValueKind.True when underlyingType == typeof(bool):
                result = Bool;
                return true;
            // Support converting bool to numeric types (e.g., true -> 1, false -> 0)
            case JsonValueKind.False or JsonValueKind.True when IsSupportedNumericType(underlyingType):
                result = Convert.ChangeType(Bool ? 1 : 0, underlyingType, CultureInfo.InvariantCulture);
                return true;
            case JsonValueKind.Number when IsSupportedNumericType(underlyingType):
                result = Convert.ChangeType(Number, underlyingType, CultureInfo.InvariantCulture);
                return true;
            case JsonValueKind.Number when underlyingType == typeof(string):
                result = Number.ToString(CultureInfo.InvariantCulture);
                return true;
            case JsonValueKind.String when underlyingType == typeof(string):
                result = String;
                return true;
            // Support parsing numbers from strings for numeric types
            case JsonValueKind.String when IsSupportedNumericType(underlyingType):
            {
                var parsedNumber = ExpressionEvaluator.ParseNumber(String, throwException: false);
                if (parsedNumber.HasValue)
                {
                    result = Convert.ChangeType(parsedNumber.Value, underlyingType, CultureInfo.InvariantCulture);
                    return true;
                }
                else
                {
                    result = null;
                    return false;
                }
            }
        }

        // Add special handling for bool to support loose conversion rules
        // e.g., "true", "false", "1", "0" as strings or numbers
        if (underlyingType == typeof(bool))
        {
            bool? boolValue = ToBoolLoose();
            // type is non-nullable bool but value is null
            if (boolValue is null && type == typeof(bool))
            {
                result = false; // default to false and indicate failure
                return false;
            }

            if (boolValue is null)
            {
                result = null;
                return false;
            }

            result = boolValue.Value;
            return true;
        }

        if (ValueKind == JsonValueKind.String)
        {
            // Fallback to JSON deserialization when the fast path fails (i.e., deserialize string to DateTime or similar)
            try
            {
                var json = JsonSerializer.Serialize(String, _unsafeSerializerOptionsForSerializingDates); // Wrap in quotes to ensure it's deserialized as a string (e.g., for DateTime)
                result = JsonSerializer.Deserialize(json, type);
                return true;
            }
            catch (JsonException)
            {
                result = null;
                return false;
            }
            catch (NotSupportedException)
            {
                result = null;
                return false;
            }
        }

        result = null;
        return false;
    }

    private static bool IsSupportedNumericType(Type type)
    {
        // TODO: consider supporting enums as numeric types as well, but currently we
        // don't use C# enums in datamodels, so it isn't very urgent.
        return type == typeof(double)
            || type == typeof(int)
            || type == typeof(float)
            || type == typeof(decimal)
            || type == typeof(long)
            || type == typeof(short)
            || type == typeof(byte)
            || type == typeof(uint)
            || type == typeof(ulong)
            || type == typeof(ushort)
            || type == typeof(sbyte);
    }

    private void ThrowIfNotOfKind(JsonValueKind jsonValueKind, string accessorName)
    {
        if (ValueKind != jsonValueKind)
            throw new InvalidCastException(
                $"The .{accessorName} property can't be used on an expression value that represent a {ValueKind}"
            );
    }

    /// <summary>
    /// Utility to initialize an ExpressionValue from a json string.
    /// </summary>
    public static ExpressionValue FromJsonString(string jsonString)
    {
        // We could initialize directly with the json string, but parsing ensures that whitespace and tracing commas are consistent
        // A more light weight verification that don't transcode the string to UTF8 would be nice.
        using var doc = JsonDocument.Parse(jsonString);
        return new(doc.RootElement);
    }

    internal void WriteJson(Utf8JsonWriter writer, JsonSerializerOptions options)
    {
        switch (ValueKind)
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
                writer.WriteStringValue(_stringValueNotNull);
                break;
            case JsonValueKind.Number:
                writer.WriteNumberValue(_numberValue);
                break;
            case JsonValueKind.Object:
            case JsonValueKind.Array:
                writer.WriteRawValue(_stringValueNotNull);
                break;
            default:
                throw new JsonException();
        }
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
        switch (reader.TokenType)
        {
            case JsonTokenType.True:
                return true;
            case JsonTokenType.False:
                return false;
            case JsonTokenType.String:
                return reader.GetString();
            case JsonTokenType.Number:
                return reader.GetDouble();
            case JsonTokenType.Null:
                return ExpressionValue.Null;
            case JsonTokenType.StartObject:
            case JsonTokenType.StartArray:
                using (var doc = JsonDocument.ParseValue(ref reader))
                    return doc.RootElement;
            default:
                throw new JsonException();
        }
    }

    /// <inheritdoc />
    public override void Write(Utf8JsonWriter writer, ExpressionValue value, JsonSerializerOptions options) =>
        value.WriteJson(writer, options);
}
