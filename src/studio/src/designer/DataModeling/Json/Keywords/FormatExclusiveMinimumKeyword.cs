using System;
using System.Text.Json;
using System.Text.Json.Serialization;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Json.Keywords;

/// <summary>
/// Used to represent exclusive minimum on the date types
/// </summary>
[SchemaKeyword(Name)]
[SchemaPriority(int.MinValue)]
[SchemaDraft(Draft.Unspecified)]
[JsonConverter(typeof(FormatExclusiveMinimumKeywordJsonConverter))]
public sealed class FormatExclusiveMinimumKeyword: IJsonSchemaKeyword, IEquatable<FormatExclusiveMinimumKeyword>
{
    /// <summary>
    /// The name of the keyword
    /// </summary>
    internal const string Name = "formatExclusiveMinimum";

    /// <summary>
    /// The value, format of minimum
    /// </summary>
    public string Value { get; }

    /// <summary>
    /// Create a new instance with the specified value
    /// </summary>
    /// <param name="value">ExclusiveMinimum format</param>
    public FormatExclusiveMinimumKeyword(string value)
    {
        Value = value;
    }

    /// <inheritdoc />
    public void Validate(ValidationContext context)
    {
        context.Ignore = true;
    }

    /// <inheritdoc />
    public bool Equals(FormatExclusiveMinimumKeyword other)
    {
        if (other is null)
        {
            return false;
        }

        return ReferenceEquals(this, other) || Equals(Value, other.Value);
    }

    /// <inheritdoc />
    public override bool Equals(object obj)
    {
        return Equals(obj as FormatExclusiveMinimumKeyword);
    }

    /// <inheritdoc />
    public override int GetHashCode()
    {
        return Value.GetHashCode();
    }

    /// <summary>
    /// Serializer for the FormatExclusiveMinimumKeyword keyword
    /// </summary>
    public class FormatExclusiveMinimumKeywordJsonConverter : JsonConverter<FormatExclusiveMinimumKeyword>
    {
        /// <summary>
        /// Read @xsdType keyword from json schema
        /// </summary>
        public override FormatExclusiveMinimumKeyword Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType != JsonTokenType.String)
            {
                throw new JsonException("Expected string");
            }

            return new FormatExclusiveMinimumKeyword(reader.GetString());
        }

        /// <summary>
        /// Write formatExclusiveMaximum keyword to json
        /// </summary>
        public override void Write(Utf8JsonWriter writer, FormatExclusiveMinimumKeyword value, JsonSerializerOptions options)
        {
            writer.WriteString(Name, value.Value);
        }
    }
}
