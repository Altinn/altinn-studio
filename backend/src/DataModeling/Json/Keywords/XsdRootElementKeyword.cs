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
[JsonConverter(typeof(XsdRootElementKeywordJsonConverter))]
public sealed class XsdRootElementKeyword : IJsonSchemaKeyword, IEquatable<XsdRootElementKeyword>
{
    /// <summary>
    /// The name of the keyword
    /// </summary>
    internal const string Name = "@xsdRootElement";

    /// <summary>
    /// Keyword value
    /// </summary>
    public string Value { get; }

    /// <summary>
    /// Initializes a new instance of the <see cref="XsdRootElementKeyword"/> class.
    /// </summary>
    /// <param name="value">Provided value</param>
    public XsdRootElementKeyword(string value)
    {
        Value = value;
    }

    /// <inheritdoc />
    public void Validate(ValidationContext context)
    {
        // No validation for keyword
    }

    /// <inheritdoc/>
    public bool Equals(XsdRootElementKeyword other)
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
        return Equals(obj as XsdRootElementKeyword);
    }

    /// <inheritdoc/>
    public override int GetHashCode()
    {
        return Value.GetHashCode();
    }

    /// <summary>
    /// Serializer for the @xsdRootElement keyword
    /// </summary>
    internal class XsdRootElementKeywordJsonConverter : JsonConverter<XsdRootElementKeyword>
    {
        /// <inheritdoc/>
        public override XsdRootElementKeyword Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType != JsonTokenType.String)
            {
                throw new JsonException("Expected string");
            }

            return new XsdRootElementKeyword(reader.GetString());
        }

        /// <inheritdoc/>
        public override void Write(Utf8JsonWriter writer, XsdRootElementKeyword value, JsonSerializerOptions options)
        {
            writer.WriteString(Name, value.Value);
        }
    }
}
