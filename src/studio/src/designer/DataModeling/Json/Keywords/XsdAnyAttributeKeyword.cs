using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Json.Keywords
{
    /// <summary>
    /// Adds @xsdAnyAttribute keyword to schema
    /// </summary>
    [SchemaKeyword(Name)]
    [SchemaPriority(int.MinValue)]
    [SchemaDraft(Draft.Unspecified)]
    [JsonConverter(typeof(XsdAnyAttributeKeywordJsonConverter))]
    public sealed class XsdAnyAttributeKeyword : IJsonSchemaKeyword, IEquatable<XsdAnyAttributeKeyword>
    {
        /// <summary>
        /// The name of the keyword
        /// </summary>
        internal const string Name = "@xsdAnyAttribute";

        /// <summary>
        /// The value of the id attribute on the AnyAttribute element in an XSD.
        /// </summary>
        public string Id { get; }

        /// <summary>
        /// The value of the namespacee attribute on the AnyAttribute element in an XSD.
        /// </summary>
        public string Namespace { get; }

        /// <summary>
        /// The value of the process content attribute on the AnyAttribute element in an XSD.
        /// </summary>
        public string ProcessContent { get; }

        /// <summary>
        /// Create a new instance of XsdAnyAttributeKeyword.
        /// </summary>
        /// <param name="id">The value of the Id property.</param>
        /// <param name="namespace">The value of the Namespace property.</param>
        /// <param name="processContent">The value of the ProcessContent property.</param>
        public XsdAnyAttributeKeyword(string id, string @namespace, string processContent)
        {
            Id = id;
            Namespace = @namespace;
            ProcessContent = processContent;
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
        public bool Equals(XsdAnyAttributeKeyword other)
        {
            if (other is null)
            {
                return false;
            }

            if (ReferenceEquals(this, other))
            {
                return true;
            }

            return Id == other.Id && Namespace == other.Namespace && ProcessContent == other.ProcessContent;
        }

        /// <summary>Determines whether the specified object is equal to the current object.</summary>
        /// <param name="obj">The object to compare with the current object.</param>
        /// <returns>true if the specified object  is equal to the current object; otherwise, false.</returns>
        public override bool Equals(object obj)
        {
            return Equals(obj as XsdAnyAttributeKeyword);
        }

        /// <summary>Serves as the default hash function.</summary>
        /// <returns>A hash code for the current object.</returns>
        public override int GetHashCode()
        {
            return HashCode.Combine(Id, Namespace, ProcessContent);
        }

        /// <summary>
        /// Serializer for the @xsdAnyAttribute keyword
        /// </summary>
        internal class XsdAnyAttributeKeywordJsonConverter : JsonConverter<XsdAnyAttributeKeyword>
        {
            /// <summary>
            /// Read @xsdAnyAttribute keyword from json schema
            /// </summary>
            public override XsdAnyAttributeKeyword Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
            {
                JsonDocument document = JsonDocument.ParseValue(ref reader);

                if (document.RootElement.ValueKind != JsonValueKind.Object)
                {
                    throw new JsonException("Expected object");
                }

                string id = null;
                string @namespace = null;
                string processContent = null;

                IEnumerable<(string Name, string Value)> properties = document.RootElement.EnumerateObject().Select(p => (p.Name, p.Value.GetString()));
                foreach (var property in properties)
                {
                    switch (property.Name)
                    {
                        case nameof(Id):
                            id = property.Value;
                            break;
                        case nameof(Namespace):
                            @namespace = property.Value;
                            break;
                        case nameof(ProcessContent):
                            processContent = property.Value;
                            break;
                        default:
                            break;
                    }
                }

                return new XsdAnyAttributeKeyword(id, @namespace, processContent);
            }

            /// <summary>
            /// Write @xsdAnyAttribute keyword to json
            /// </summary>
            public override void Write(Utf8JsonWriter writer, XsdAnyAttributeKeyword value, JsonSerializerOptions options)
            {
                writer.WritePropertyName(Name);
                writer.WriteStartObject();

                if (value.Id != null)
                {
                    writer.WriteString(nameof(value.Id), value.Id);
                }

                if (value.Namespace != null)
                {
                    writer.WriteString(nameof(value.Namespace), value.Namespace);
                }

                if (value.ProcessContent != null)
                {
                    writer.WriteString(nameof(value.ProcessContent), value.ProcessContent);
                }

                writer.WriteEndObject();
            }
        }
    }
}
