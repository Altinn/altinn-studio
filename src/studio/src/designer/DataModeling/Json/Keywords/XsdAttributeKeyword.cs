using System;
using System.Text.Json;
using System.Text.Json.Serialization;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Json.Keywords
{
    /// <summary>
    /// Adds @xsdAttribute keyword to schema
    /// </summary>
    [SchemaKeyword(Name)]
    [SchemaPriority(int.MinValue)]
    [SchemaDraft(Draft.Unspecified)]
    [JsonConverter(typeof(XsdAttributeKeywordJsonConverter))]
    public class XsdAttributeKeyword : IJsonSchemaKeyword, IEquatable<XsdAttributeKeyword>
    {
        /// <summary>
        /// The name of the keyword
        /// </summary>
        internal const string Name = "@xsdAttribute";

        /// <summary>
        /// The value, Element or Attribute
        /// </summary>
        public bool Value { get; }

        /// <summary>
        /// Create a new instance of XsdAttributeKeyword with the value set to true
        /// </summary>
        public XsdAttributeKeyword()
            : this(true)
        {
        }

        /// <summary>
        /// Create a new instance of XsdAttributeKeyword with the specified value
        /// </summary>
        /// <param name="value">info value, Element or Attribute</param>
        public XsdAttributeKeyword(bool value)
        {
            Value = value;
        }

        /// <summary>
        /// Always validates as true
        /// </summary>
        public void Validate(ValidationContext context)
        {
            context.Ignore = true;
        }

        /// <summary>Indicates whether the current object is equal to another object of the same type.</summary>
        /// <param name="other">An object to compare with this object.</param>
        /// <returns><see langword="true" /> if the current object is equal to the <paramref name="other" /> parameter; otherwise, <see langword="false" />.</returns>
        public bool Equals(XsdAttributeKeyword other)
        {
            if (other is null)
            {
                return false;
            }

            return ReferenceEquals(this, other) || Equals(Value, other.Value);
        }

        /// <summary>Determines whether the specified object is equal to the current object.</summary>
        /// <param name="obj">The object to compare with the current object.</param>
        /// <returns>true if the specified object  is equal to the current object; otherwise, false.</returns>
        public override bool Equals(object obj)
        {
            return Equals(obj as XsdAttributeKeyword);
        }

        /// <summary>Serves as the default hash function.</summary>
        /// <returns>A hash code for the current object.</returns>
        public override int GetHashCode()
        {
            return Value.GetHashCode();
        }

        /// <summary>
        /// Serializer for the @xsdAttribute keyword
        /// </summary>
        internal class XsdAttributeKeywordJsonConverter : JsonConverter<XsdAttributeKeyword>
        {
            /// <summary>
            /// Read @xsdAttribute keyword from json schema
            /// </summary>
            public override XsdAttributeKeyword Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
            {
                if (reader.TokenType != JsonTokenType.True && reader.TokenType != JsonTokenType.False)
                {
                    throw new JsonException("Expected boolean");
                }

                bool value = reader.GetBoolean();

                return new XsdAttributeKeyword(value);
            }

            /// <summary>
            /// Write @xsdAttribute keyword to json
            /// </summary>
            public override void Write(Utf8JsonWriter writer, XsdAttributeKeyword value, JsonSerializerOptions options)
            {
                writer.WriteBoolean(Name, value.Value);
            }
        }
    }
}
