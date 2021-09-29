using System;
using System.Text.Json;
using System.Text.Json.Serialization;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Json.Keywords
{
    /// <summary>
    /// Adds @xsdStructure keyword to schema
    /// </summary>
    [SchemaKeyword(Name)]
    [SchemaPriority(int.MinValue)]
    [SchemaDraft(Draft.Unspecified)]
    [JsonConverter(typeof(XsdStructureKeywordJsonConverter))]
    public sealed class XsdStructureKeyword : IJsonSchemaKeyword, IEquatable<XsdStructureKeyword>
    {
        /// <summary>
        /// The name of the keyword
        /// </summary>
        internal const string Name = "@xsdStructure";

        /// <summary>
        /// The structure type; sequence, all, choice...
        /// </summary>
        public string Value { get; }

        /// <summary>
        /// Create a new instance of XsdStructureKeyword with the specified value
        /// </summary>
        /// <param name="value">Structure path of the element</param>
        public XsdStructureKeyword(string value)
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
        public bool Equals(XsdStructureKeyword other)
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
            return Equals(obj as XsdStructureKeyword);
        }

        /// <summary>Serves as the default hash function.</summary>
        /// <returns>A hash code for the current object.</returns>
        public override int GetHashCode()
        {
            return Value.GetHashCode();
        }

        /// <summary>
        /// Serializer for the @xsdStructure keyword
        /// </summary>
        internal class XsdStructureKeywordJsonConverter : JsonConverter<XsdStructureKeyword>
        {
            /// <summary>
            /// Read @xsdStructure keyword from json schema
            /// </summary>
            public override XsdStructureKeyword Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
            {
                if (reader.TokenType != JsonTokenType.String)
                {
                    throw new JsonException("Expected string");
                }

                return new XsdStructureKeyword(reader.GetString());
            }

            /// <summary>
            /// Write @xsdStructure keyword to json
            /// </summary>
            public override void Write(Utf8JsonWriter writer, XsdStructureKeyword value, JsonSerializerOptions options)
            {
                writer.WriteString(Name, value.Value);
            }
        }
    }
}
