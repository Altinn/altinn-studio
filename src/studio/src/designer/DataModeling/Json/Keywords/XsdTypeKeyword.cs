using System;
using System.Text.Json;
using System.Text.Json.Serialization;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Json.Keywords
{
    /// <summary>
    /// Adds @xsdType keyword to schema
    /// </summary>
    [SchemaKeyword(Name)]
    [SchemaPriority(int.MinValue)]
    [SchemaDraft(Draft.Unspecified)]
    [JsonConverter(typeof(XsdTypeKeywordJsonConverter))]
    public class XsdTypeKeyword : IJsonSchemaKeyword, IEquatable<XsdTypeKeyword>
    {
        /// <summary>
        /// The name of the keyword
        /// </summary>
        internal const string Name = "@xsdType";

        /// <summary>
        /// The value, Element or Attribute
        /// </summary>
        public string Value { get; }

        /// <summary>
        /// Create a new instance of XsdTypeKeyword with the specified value
        /// </summary>
        /// <param name="value">Xsd type name</param>
        public XsdTypeKeyword(string value)
        {
            Value = value;
        }

        /// <summary>
        /// Always validates as true
        /// </summary>
        public void Validate(ValidationContext context)
        {
            context.Ignore = true;
            context.IsValid = true;
        }

        /// <summary>Indicates whether the current object is equal to another object of the same type.</summary>
        /// <param name="other">An object to compare with this object.</param>
        /// <returns><see langword="true" /> if the current object is equal to the <paramref name="other" /> parameter; otherwise, <see langword="false" />.</returns>
        public bool Equals(XsdTypeKeyword other)
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
            return Equals(obj as XsdTypeKeyword);
        }

        /// <summary>Serves as the default hash function.</summary>
        /// <returns>A hash code for the current object.</returns>
        public override int GetHashCode()
        {
            return Value.GetHashCode();
        }

        /// <summary>
        /// Serializer for the @xsdType keyword
        /// </summary>
        internal class XsdTypeKeywordJsonConverter : JsonConverter<XsdTypeKeyword>
        {
            /// <summary>
            /// Read @xsdType keyword from json schema
            /// </summary>
            public override XsdTypeKeyword Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
            {
                if (reader.TokenType != JsonTokenType.String)
                {
                    throw new JsonException("Expected string");
                }

                string value = reader.GetString();
                if (string.IsNullOrWhiteSpace(value))
                {
                    value = "Element";
                }

                return new XsdTypeKeyword(value);
            }

            /// <summary>
            /// Write @xsdType keyword to json
            /// </summary>
            public override void Write(Utf8JsonWriter writer, XsdTypeKeyword value, JsonSerializerOptions options)
            {
                writer.WriteString(Name, value.Value);
            }
        }
    }
}
