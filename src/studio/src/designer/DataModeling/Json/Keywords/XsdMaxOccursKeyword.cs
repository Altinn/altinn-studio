using System;
using System.Text.Json;
using System.Text.Json.Serialization;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Json.Keywords;

/// <summary>
/// Adds @xsdMaxOccurs keyword to schema.
/// </summary>
[SchemaKeyword(Name)]
[SchemaDraft(Draft.Draft6)]
[SchemaDraft(Draft.Draft7)]
[SchemaDraft(Draft.Draft201909)]
[SchemaDraft(Draft.Draft202012)]
[JsonConverter(typeof(XsdMaxOccursKeywordJsonConverter))]
public sealed class XsdMaxOccursKeyword: IJsonSchemaKeyword, IEquatable<XsdMaxOccursKeyword>
{
    /// <summary>
    /// The name of the keyword
    /// </summary>
    private const string Name = "@xsdMaxOccurs";

    /// <summary>
    /// Content
    /// </summary>
    public string Value { get; }

    /// <summary>
    /// Create instance with defined value
    /// </summary>
    public XsdMaxOccursKeyword(string value)
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
    public bool Equals(XsdMaxOccursKeyword other)
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
        return Equals(obj as XsdMaxOccursKeyword);
    }

    /// <inheritdoc/>
    public override int GetHashCode()
    {
        return Value.GetHashCode();
    }

    /// <summary>
    /// Serializer for the @xsdMaxOccurs keyword
    /// </summary>
    internal class XsdMaxOccursKeywordJsonConverter : JsonConverter<XsdMaxOccursKeyword>
    {
        /// <inheritdoc/>
        public override XsdMaxOccursKeyword Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType != JsonTokenType.String)
            {
                throw new JsonException("Expected string");
            }

            return new XsdMaxOccursKeyword(reader.GetString());
        }

        /// <inheritdoc/>
        public override void Write(Utf8JsonWriter writer, XsdMaxOccursKeyword value, JsonSerializerOptions options)
        {
            writer.WriteString(Name, value.Value);
        }
    }
}
