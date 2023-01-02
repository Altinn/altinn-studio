using System;
using System.Text.Json;
using System.Text.Json.Serialization;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Json.Keywords;

/// <summary>
/// Adds @XsdText keyword to schema indicating if member should be treated as XML text when serialized or deserialized.
/// </summary>
[SchemaKeyword(Name)]
[SchemaDraft(Draft.Draft6)]
[SchemaDraft(Draft.Draft7)]
[SchemaDraft(Draft.Draft201909)]
[SchemaDraft(Draft.Draft202012)]
[JsonConverter(typeof(XsdTextKeywordJsonConverter))]
public sealed class XsdTextKeyword: IJsonSchemaKeyword, IEquatable<XsdTextKeyword>
{
    /// <summary>
    /// The name of the keyword
    /// </summary>
    private const string Name = "@xsdText";

    /// <summary>
    /// Content
    /// </summary>
    public bool Value { get; }

    /// <summary>
    /// Create a new instance of XsdTextKeyword with the default false value.
    /// </summary>
    public XsdTextKeyword() : this(false)
    {
    }

    /// <summary>
    /// Create a new instance of XsdTextKeyword with the specified false value.
    /// </summary>
    public XsdTextKeyword(bool value)
    {
        Value = value;
    }

    /// <summary>
    /// Always validates as true
    /// </summary>
    public void Validate(ValidationContext context)
    {
        // No validation for keyword.
    }

    /// <inheritdoc/>
    public bool Equals(XsdTextKeyword other)
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
        return Equals(obj as XsdTextKeyword);
    }

    /// <inheritdoc/>
    public override int GetHashCode()
    {
        return Value.GetHashCode();
    }

    /// <summary>
    /// Serializer for the @xsdText keyword
    /// </summary>
    internal class XsdTextKeywordJsonConverter : JsonConverter<XsdTextKeyword>
    {
        /// <inheritdoc/>
        public override XsdTextKeyword Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType != JsonTokenType.True && reader.TokenType != JsonTokenType.False)
            {
                throw new JsonException("Expected boolean");
            }

            return new XsdTextKeyword(reader.GetBoolean());
        }

        /// <inheritdoc/>
        public override void Write(Utf8JsonWriter writer, XsdTextKeyword value, JsonSerializerOptions options)
        {
            writer.WriteBoolean(Name, value.Value);
        }
    }
}
