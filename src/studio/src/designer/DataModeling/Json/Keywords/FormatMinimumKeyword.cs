using System;
using System.Text.Json;
using System.Text.Json.Serialization;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Json.Keywords;

/// <summary>
/// Used to represent minimum on the date types
/// </summary>
[SchemaKeyword(Name)]
[SchemaPriority(int.MinValue)]
[SchemaDraft(Draft.Unspecified)]
[JsonConverter(typeof(FormatMinimumKeywordJsonConverter))]
public sealed class FormatMinimumKeyword: IJsonSchemaKeyword, IEquatable<FormatMinimumKeyword>
{
    /// <summary>
    /// The name of the keyword
    /// </summary>
    internal const string Name = "formatMinimum";

    /// <summary>
    /// The value, format of minimum
    /// </summary>
    public string Value { get; }

    /// <summary>
    /// Create a new instance with the specified value
    /// </summary>
    /// <param name="value">Minimum format</param>
    public FormatMinimumKeyword(string value)
    {
        Value = value;
    }

    /// <inheritdoc />
    public void Validate(ValidationContext context)
    {
        context.Ignore = true;
    }

    /// <inheritdoc />
    public bool Equals(FormatMinimumKeyword other)
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
        return Equals(obj as FormatMinimumKeyword);
    }

    /// <inheritdoc />
    public override int GetHashCode()
    {
        return Value.GetHashCode();
    }

    /// <summary>
    /// Serializer for the FormatMinimumKeyword keyword
    /// </summary>
    public class FormatMinimumKeywordJsonConverter : JsonConverter<FormatMinimumKeyword>
    {
        /// <summary>
        /// Read @xsdType keyword from json schema
        /// </summary>
        public override FormatMinimumKeyword Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType != JsonTokenType.String)
            {
                throw new JsonException("Expected string");
            }

            return new FormatMinimumKeyword(reader.GetString());
        }

        /// <summary>
        /// Write formatExclusiveMaximum keyword to json
        /// </summary>
        public override void Write(Utf8JsonWriter writer, FormatMinimumKeyword value, JsonSerializerOptions options)
        {
            writer.WriteString(Name, value.Value);
        }
    }
}
