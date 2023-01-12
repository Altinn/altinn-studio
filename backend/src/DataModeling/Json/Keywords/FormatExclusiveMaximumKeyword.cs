using System;
using System.Text.Json;
using System.Text.Json.Serialization;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Json.Keywords;

/// <summary>
/// Used to represent exclusive maximum on the date types
/// </summary>
[SchemaKeyword(Name)]
[SchemaPriority(int.MinValue)]
[SchemaDraft(Draft.Draft6)]
[SchemaDraft(Draft.Draft7)]
[SchemaDraft(Draft.Draft201909)]
[SchemaDraft(Draft.Draft202012)]
[JsonConverter(typeof(FormatExclusiveMaximumKeywordJsonConverter))]
public sealed class FormatExclusiveMaximumKeyword : IJsonSchemaKeyword, IEquatable<FormatExclusiveMaximumKeyword>
{
    /// <summary>
    /// The name of the keyword
    /// </summary>
    internal const string Name = "formatExclusiveMaximum";

    /// <summary>
    /// The value, format of maximum
    /// </summary>
    public string Value { get; }

    /// <summary>
    /// Create a new instance with the specified value
    /// </summary>
    /// <param name="value">ExclusiveMaximum format</param>
    public FormatExclusiveMaximumKeyword(string value)
    {
        Value = value;
    }

    /// <inheritdoc />
    public void Validate(ValidationContext context)
    {
        // No validation for keyword.
    }

    /// <inheritdoc />
    public bool Equals(FormatExclusiveMaximumKeyword other)
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
        return Equals(obj as FormatExclusiveMaximumKeyword);
    }

    /// <inheritdoc />
    public override int GetHashCode()
    {
        return Value.GetHashCode();
    }

    /// <summary>
    /// Serializer for the FormatExclusiveMaximumKeyword keyword
    /// </summary>
    internal class FormatExclusiveMaximumKeywordJsonConverter : JsonConverter<FormatExclusiveMaximumKeyword>
    {
        /// <summary>
        /// Read formatExclusiveMaximum keyword from json schema
        /// </summary>
        public override FormatExclusiveMaximumKeyword Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType != JsonTokenType.String)
            {
                throw new JsonException("Expected string");
            }

            return new FormatExclusiveMaximumKeyword(reader.GetString());
        }

        /// <summary>
        /// Write formatExclusiveMaximum keyword to json
        /// </summary>
        public override void Write(Utf8JsonWriter writer, FormatExclusiveMaximumKeyword value, JsonSerializerOptions options)
        {
            writer.WriteString(Name, value.Value);
        }
    }
}
