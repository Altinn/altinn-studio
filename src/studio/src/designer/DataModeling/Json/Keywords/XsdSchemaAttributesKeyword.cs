using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using Json.Pointer;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Json.Keywords
{
    /// <summary>
    /// Handles `@xsdSchemaAttributes`.
    /// </summary>
    [SchemaKeyword(Name)]
    [SchemaDraft(Draft.Unspecified)]
    [JsonConverter(typeof(XsdSchemaAttributesKeywordJsonConverter))]
    public sealed class XsdSchemaAttributesKeyword : IJsonSchemaKeyword, IEquatable<XsdSchemaAttributesKeyword>
    {
        /// <summary>
        /// The name of the keyword
        /// </summary>
        internal const string Name = "@xsdSchemaAttributes";

        /// <summary>
        /// The xsd schema attributes in order.
        /// </summary>
        public IReadOnlyList<(string name, string value)> Properties { get; }

        /// <summary>
        /// Creates a new <see cref="XsdSchemaAttributesKeyword"/>.
        /// </summary>
        /// <param name="values">The schema attributes.</param>
        public XsdSchemaAttributesKeyword(params (string name, string value)[] values)
        {
            Properties = values.ToList();
        }

        /// <summary>
        /// Creates a new <see cref="XsdSchemaAttributesKeyword"/>.
        /// </summary>
        /// <param name="values">The schema attributes.</param>
        public XsdSchemaAttributesKeyword(IEnumerable<(string name, string value)> values)
        {
            Properties = values as List<(string, string)> ?? values.ToList();
        }

        /// <summary>
        /// Provides validation for the keyword.
        /// </summary>
        /// <param name="context">Contextual details for the validation process.</param>
        public void Validate(ValidationContext context)
        {
            context.Ignore = true;
        }

        /// <summary>Indicates whether the current object is equal to another object of the same type.</summary>
        /// <param name="other">An object to compare with this object.</param>
        /// <returns>true if the current object is equal to the <paramref name="other">other</paramref> parameter; otherwise, false.</returns>
        public bool Equals(XsdSchemaAttributesKeyword other)
        {
            if (other is null)
            {
                return false;
            }

            return ReferenceEquals(this, other) || Properties.ContentsEqual(other.Properties);
        }

        /// <summary>Determines whether the specified object is equal to the current object.</summary>
        /// <param name="obj">The object to compare with the current object.</param>
        /// <returns>true if the specified object  is equal to the current object; otherwise, false.</returns>
        public override bool Equals(object obj)
        {
            return Equals(obj as XsdSchemaAttributesKeyword);
        }

        /// <summary>Serves as the default hash function.</summary>
        /// <returns>A hash code for the current object.</returns>
        public override int GetHashCode()
        {
            return Properties?.GetCollectionHashCode() ?? 0;
        }

        /// <summary>
        /// Serializer for the @xsdSchemaAttributes keyword
        /// </summary>
        internal class XsdSchemaAttributesKeywordJsonConverter : JsonConverter<XsdSchemaAttributesKeyword>
        {
            /// <summary>
            /// Read @xsdSchemaAttributes keyword from json schema
            /// </summary>
            public override XsdSchemaAttributesKeyword Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
            {
                JsonDocument document = JsonDocument.ParseValue(ref reader);

                if (document.RootElement.ValueKind != JsonValueKind.Object)
                {
                    throw new JsonException("Expected object");
                }

                return new XsdSchemaAttributesKeyword(document.RootElement.EnumerateObject().Select(p => (p.Name, p.Value.GetString())));
            }

            /// <summary>
            /// Write @xsdSchemaAttributes keyword to json
            /// </summary>
            public override void Write(Utf8JsonWriter writer, XsdSchemaAttributesKeyword value, JsonSerializerOptions options)
            {
                writer.WritePropertyName(Name);
                writer.WriteStartObject();
                foreach ((string name, string s) in value.Properties)
                {
                    writer.WriteString(name, s);
                }

                writer.WriteEndObject();
            }
        }
    }
}
