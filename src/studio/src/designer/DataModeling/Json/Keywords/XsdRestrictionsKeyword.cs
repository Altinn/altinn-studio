using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using Json.More;
using Json.Pointer;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Json.Keywords
{
    /// <summary>
    /// Handles `@xsdRestrictions`.
    /// </summary>
    [SchemaKeyword(Name)]
    [SchemaDraft(Draft.Unspecified)]
    [JsonConverter(typeof(XsdRestrictionsKeywordJsonConverter))]
    public sealed class XsdRestrictionsKeyword : IJsonSchemaKeyword, IEquatable<XsdRestrictionsKeyword>
    {
        /// <summary>
        /// The name of the keyword
        /// </summary>
        internal const string Name = "@xsdRestrictions";

        /// <summary>
        /// The xsd restrictions in order.
        /// </summary>
        public IReadOnlyList<(string name, JsonElement value)> Restrictions { get; }

        /// <summary>
        /// Creates a new <see cref="XsdRestrictionsKeyword"/>.
        /// </summary>
        /// <param name="restrictions">The restrictions.</param>
        public XsdRestrictionsKeyword(params (string name, JsonElement value)[] restrictions)
        {
            Restrictions = restrictions.ToList();
        }

        /// <summary>
        /// Creates a new <see cref="XsdRestrictionsKeyword"/>.
        /// </summary>
        /// <param name="restrictions">The restrictions.</param>
        public XsdRestrictionsKeyword(IEnumerable<(string name, JsonElement value)> restrictions)
        {
            Restrictions = restrictions as List<(string, JsonElement)> ?? restrictions.ToList();
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
        public bool Equals(XsdRestrictionsKeyword other)
        {
            if (other is null)
            {
                return false;
            }

            return ReferenceEquals(this, other) || Restrictions.ContentsEqual(other.Restrictions);
        }

        /// <summary>Determines whether the specified object is equal to the current object.</summary>
        /// <param name="obj">The object to compare with the current object.</param>
        /// <returns>true if the specified object  is equal to the current object; otherwise, false.</returns>
        public override bool Equals(object obj)
        {
            return Equals(obj as XsdRestrictionsKeyword);
        }

        /// <summary>Serves as the default hash function.</summary>
        /// <returns>A hash code for the current object.</returns>
        public override int GetHashCode()
        {
            return Restrictions?.GetCollectionHashCode() ?? 0;
        }

        /// <summary>
        /// Serializer for the @xsdRestrictions keyword
        /// </summary>
        internal class XsdRestrictionsKeywordJsonConverter : JsonConverter<XsdRestrictionsKeyword>
        {
            /// <summary>
            /// Read @xsdRestrictions keyword from json schema
            /// </summary>
            public override XsdRestrictionsKeyword Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
            {
                JsonDocument document = JsonDocument.ParseValue(ref reader);

                if (document.RootElement.ValueKind != JsonValueKind.Object)
                {
                    throw new JsonException("Expected object");
                }

                return new XsdRestrictionsKeyword(document.RootElement.EnumerateObject().Select(p => (p.Name, p.Value)));
            }

            /// <summary>
            /// Write @xsdRestrictions keyword to json
            /// </summary>
            public override void Write(Utf8JsonWriter writer, XsdRestrictionsKeyword value, JsonSerializerOptions options)
            {
                writer.WritePropertyName(Name);
                writer.WriteStartObject();
                foreach ((string name, JsonElement jsonElement) in value.Restrictions)
                {
                    writer.WritePropertyName(name);
                    writer.WriteValue(jsonElement);
                }

                writer.WriteEndObject();
            }
        }
    }
}
