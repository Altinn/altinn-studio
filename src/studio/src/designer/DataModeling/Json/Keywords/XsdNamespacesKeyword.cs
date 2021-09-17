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
    /// Handles `@xsdNamespaces`.
    /// </summary>
    [SchemaKeyword(Name)]
    [SchemaDraft(Draft.Unspecified)]
    [JsonConverter(typeof(XsdNamespacesKeywordJsonConverter))]
    public sealed class XsdNamespacesKeyword : IJsonSchemaKeyword, IEquatable<XsdNamespacesKeyword>
    {
        /// <summary>
        /// The name of the keyword
        /// </summary>
        internal const string Name = "@xsdNamespaces";

        /// <summary>
        /// The xsd namespace properties in order.
        /// </summary>
        public IReadOnlyList<(string prefix, string ns)> Namespaces { get; }

        /// <summary>
        /// Creates a new <see cref="XsdNamespacesKeyword"/>.
        /// </summary>
        /// <param name="namespaces">The namespaces.</param>
        public XsdNamespacesKeyword(IEnumerable<(string prefix, string ns)> namespaces)
        {
            Namespaces = namespaces as List<(string, string)> ?? namespaces.ToList();
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
        public bool Equals(XsdNamespacesKeyword other)
        {
            if (other is null)
            {
                return false;
            }

            return ReferenceEquals(this, other) || Namespaces.ContentsEqual(other.Namespaces);
        }

        /// <summary>Determines whether the specified object is equal to the current object.</summary>
        /// <param name="obj">The object to compare with the current object.</param>
        /// <returns>true if the specified object  is equal to the current object; otherwise, false.</returns>
        public override bool Equals(object obj)
        {
            return Equals(obj as XsdNamespacesKeyword);
        }

        /// <summary>Serves as the default hash function.</summary>
        /// <returns>A hash code for the current object.</returns>
        public override int GetHashCode()
        {
            return Namespaces?.GetCollectionHashCode() ?? 0;
        }

        /// <summary>
        /// Serializer for the @xsdNamespaces keyword
        /// </summary>
        internal class XsdNamespacesKeywordJsonConverter : JsonConverter<XsdNamespacesKeyword>
        {
            /// <summary>
            /// Read @xsdNamespaces keyword from json schema
            /// </summary>
            public override XsdNamespacesKeyword Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
            {
                JsonDocument document = JsonDocument.ParseValue(ref reader);

                if (document.RootElement.ValueKind != JsonValueKind.Object)
                {
                    throw new JsonException("Expected object");
                }

                return new XsdNamespacesKeyword(document.RootElement.EnumerateObject().Select(p => (p.Name, p.Value.GetString())));
            }

            /// <summary>
            /// Write @xsdNamespaces keyword to json
            /// </summary>
            public override void Write(Utf8JsonWriter writer, XsdNamespacesKeyword value, JsonSerializerOptions options)
            {
                writer.WritePropertyName(Name);
                writer.WriteStartObject();
                foreach ((string prefix, string ns) in value.Namespaces)
                {
                    writer.WriteString(prefix, ns);
                }

                writer.WriteEndObject();
            }
        }
    }
}
