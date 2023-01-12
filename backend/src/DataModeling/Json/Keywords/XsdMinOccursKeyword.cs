using System;
using System.Text.Json;
using System.Text.Json.Serialization;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Json.Keywords;

/// <summary>
/// Adds @xsdMinOccurs keyword to schema.
/// </summary>
[SchemaKeyword(Name)]
[SchemaDraft(Draft.Draft6)]
[SchemaDraft(Draft.Draft7)]
[SchemaDraft(Draft.Draft201909)]
[SchemaDraft(Draft.Draft202012)]
[JsonConverter(typeof(XsdMinOccursKeywordJsonConverter))]
public sealed class XsdMinOccursKeyword : IJsonSchemaKeyword, IEquatable<XsdMinOccursKeyword>
{
    /// <summary>
    /// The name of the keyword
    /// </summary>
    private const string Name = "@xsdMinOccurs";

    /// <summary>
    /// Content
    /// </summary>
    public int Value { get; }

    /// <summary>
    /// Create instance with defined value
    /// </summary>
    public XsdMinOccursKeyword(int value)
    {
        Value = value;
    }

    /// <summary>
    /// Always validates as true
    /// </summary>
    public void Validate(ValidationContext context)
    {
        // No validation defined for this keyword.
    }

    /// <inheritdoc/>
    public bool Equals(XsdMinOccursKeyword other)
    {
        if (other is null)
        {
            return false;
        }

        return ReferenceEquals(this, other) || Equals(Value, other.Value);
    }

    /// <inheritdoc/>
    public override bool Equals(object obj)
    {
        return Equals(obj as XsdMinOccursKeyword);
    }

    /// <inheritdoc/>
    public override int GetHashCode()
    {
        return Value.GetHashCode();
    }

    /// <summary>
    /// Serializer for the @xsdMinOccurs keyword
    /// </summary>
    internal class XsdMinOccursKeywordJsonConverter : JsonConverter<XsdMinOccursKeyword>
    {
        /// <inheritdoc/>
        public override XsdMinOccursKeyword Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType != JsonTokenType.Number)
            {
                throw new JsonException("Expected number");
            }

            return new XsdMinOccursKeyword(reader.GetInt32());
        }

        /// <inheritdoc/>
        public override void Write(Utf8JsonWriter writer, XsdMinOccursKeyword value, JsonSerializerOptions options)
        {
            writer.WriteNumber(Name, value.Value);
        }
    }
}
