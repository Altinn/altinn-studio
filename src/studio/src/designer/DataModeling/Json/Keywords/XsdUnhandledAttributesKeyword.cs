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
    /// Handles `@xsdUnhandledAttributes`.
    /// </summary>
    [SchemaKeyword(Name)]
    [SchemaDraft(Draft.Unspecified)]
    [JsonConverter(typeof(XsdUnhandledAttributesKeywordJsonConverter))]
    public sealed class XsdUnhandledAttributesKeyword : IJsonSchemaKeyword, IEquatable<XsdUnhandledAttributesKeyword>
    {
        /// <summary>
        /// The name of the keyword
        /// </summary>
        internal const string Name = "@xsdUnhandledAttributes";

        /// <summary>
        /// The all the unhandled attributes in order.
        /// </summary>
        public IReadOnlyList<(string Name, string Value)> Properties { get; }

        /// <summary>
        /// Creates a new <see cref="XsdUnhandledAttributesKeyword"/>.
        /// </summary>
        /// <param name="values">The the unhandled attributes in order.</param>
        public XsdUnhandledAttributesKeyword(params (string Name, string Value)[] values)
        {
            Properties = values.ToList();
        }

        /// <summary>
        /// Creates a new <see cref="XsdUnhandledAttributesKeyword"/>.
        /// </summary>
        /// <param name="values">The unhandled attributes in order.</param>
        public XsdUnhandledAttributesKeyword(IEnumerable<(string Name, string Value)> values)
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
        public bool Equals(XsdUnhandledAttributesKeyword other)
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
            return Equals(obj as XsdUnhandledAttributesKeyword);
        }

        /// <summary>Serves as the default hash function.</summary>
        /// <returns>A hash code for the current object.</returns>
        public override int GetHashCode()
        {
            return Properties?.GetCollectionHashCode() ?? 0;
        }

        /// <summary>
        /// Serializer for the @xsdUnhandledAttributes keyword
        /// </summary>
        internal class XsdUnhandledAttributesKeywordJsonConverter : JsonConverter<XsdUnhandledAttributesKeyword>
        {
            /// <summary>
            /// Read @xsdUnhandledAttributes keyword from json schema
            /// </summary>
            public override XsdUnhandledAttributesKeyword Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
            {
                JsonDocument document = JsonDocument.ParseValue(ref reader);

                if (document.RootElement.ValueKind != JsonValueKind.Object)
                {
                    throw new JsonException("Expected object");
                }

                return new XsdUnhandledAttributesKeyword(document.RootElement.EnumerateObject().Select(p => (p.Name, p.Value.GetString())));
            }

            /// <summary>
            /// Write @xsdUnhandledAttributes keyword to json
            /// </summary>
            public override void Write(Utf8JsonWriter writer, XsdUnhandledAttributesKeyword value, JsonSerializerOptions options)
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
