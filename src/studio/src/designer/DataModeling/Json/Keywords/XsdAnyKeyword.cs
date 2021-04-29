using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Json.Keywords
{
    /// <summary>
    /// Adds @xsdAny keyword to schema
    /// </summary>
    [SchemaKeyword(Name)]
    [SchemaPriority(int.MinValue)]
    [SchemaDraft(Draft.Unspecified)]
    [JsonConverter(typeof(XsdAnyKeywordJsonConverter))]
    public class XsdAnyKeyword : IJsonSchemaKeyword, IEquatable<XsdAnyKeyword>
    {
        /// <summary>
        /// The name of the keyword
        /// </summary>
        internal const string Name = "@xsdAny";

        /// <summary>
        /// The value
        /// </summary>
        public List<string> Value { get; }

        /// <summary>
        /// Create a new instance of XsdAnyKeyword with the specified value
        /// </summary>
        /// <param name="value">info value</param>
        public XsdAnyKeyword(IEnumerable<string> value)
        {
            Value = new List<string>(value);
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
        public bool Equals(XsdAnyKeyword other)
        {
            if (other is null)
            {
                return false;
            }

            return ReferenceEquals(this, other) || Value.SequenceEqual(other.Value);
        }

        /// <summary>Determines whether the specified object is equal to the current object.</summary>
        /// <param name="obj">The object to compare with the current object.</param>
        /// <returns>true if the specified object  is equal to the current object; otherwise, false.</returns>
        public override bool Equals(object obj)
        {
            return Equals(obj as XsdAnyKeyword);
        }

        /// <summary>Serves as the default hash function.</summary>
        /// <returns>A hash code for the current object.</returns>
        public override int GetHashCode()
        {
            return Value.GetHashCode();
        }

        /// <summary>
        /// Serializer for @xsdAny info keyword
        /// </summary>
        internal class XsdAnyKeywordJsonConverter : JsonConverter<XsdAnyKeyword>
        {
            /// <summary>
            /// Read @xsdAny keyword from json schema
            /// </summary>
            public override XsdAnyKeyword Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
            {
                if (reader.TokenType != JsonTokenType.StartArray)
                {
                    throw new JsonException("Expected array");
                }

                List<string> parts = new List<string>();
                while (reader.Read() && reader.TokenType != JsonTokenType.EndArray)
                {
                    if (reader.TokenType != JsonTokenType.String)
                    {
                        throw new JsonException("Expected all elements of array to be string");
                    }

                    parts.Add(reader.GetString());
                }

                if (reader.TokenType != JsonTokenType.EndArray)
                {
                    throw new JsonException("Unexpected end of array");
                }

                return new XsdAnyKeyword(parts);
            }

            /// <summary>
            /// Write @xsdAny keyword to json
            /// </summary>
            public override void Write(Utf8JsonWriter writer, XsdAnyKeyword value, JsonSerializerOptions options)
            {
                writer.WriteStartArray(Name);
                foreach (string item in value.Value)
                {
                    writer.WriteStringValue(item);
                }

                writer.WriteEndArray();
            }
        }
    }
}
