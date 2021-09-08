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
    [JsonConverter(typeof(XsdUnhandledEnumAttributesKeywordJsonConverter))]
    public class XsdUnhandledEnumAttributesKeyword : IJsonSchemaKeyword, IEquatable<XsdUnhandledEnumAttributesKeyword>
    {
        /// <summary>
        /// The name of the keyword
        /// </summary>
        internal const string Name = "@xsdUnhandledEnumAttributes";

        /// <summary>
        /// Creates a new <see cref="XsdUnhandledEnumAttributesKeyword"/>.
        /// </summary>
        public XsdUnhandledEnumAttributesKeyword()
        {
            Properties = new List<NamedKeyValuePairs>();
        }

        /// <summary>
        /// Creates a new <see cref="XsdUnhandledEnumAttributesKeyword"/>.
        /// </summary>
        /// <param name="values">The the unhandled attributes in order.</param>
        public XsdUnhandledEnumAttributesKeyword(NamedKeyValuePairs[] values)
        {
            Properties = values.ToList();
        }

        /// <summary>
        /// Creates a new <see cref="XsdUnhandledEnumAttributesKeyword"/>.
        /// </summary>
        /// <param name="values">The unhandled attributes in order.</param>
        public XsdUnhandledEnumAttributesKeyword(IEnumerable<NamedKeyValuePairs> values)
        {
            Properties = values as List<NamedKeyValuePairs> ?? values.ToList();
        }

        /// <summary>
        /// The all the unhandled attributes in order.
        /// </summary>
        public IReadOnlyList<NamedKeyValuePairs> Properties { get; }

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
        public bool Equals(XsdUnhandledEnumAttributesKeyword other)
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
            return Equals(obj as XsdUnhandledEnumAttributesKeyword);
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
        public class XsdUnhandledEnumAttributesKeywordJsonConverter : JsonConverter<XsdUnhandledEnumAttributesKeyword>
        {
            /// <summary>
            /// Read @xsdUnhandledAttributes keyword from json schema
            /// </summary>
            public override XsdUnhandledEnumAttributesKeyword Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
            {
                JsonDocument document = JsonDocument.ParseValue(ref reader);

                if (document.RootElement.ValueKind != JsonValueKind.Object)
                {
                    throw new JsonException("Expected object");
                }

                List<NamedKeyValuePairs> namedKeyValuePairsList = new List<NamedKeyValuePairs>();
                foreach (var item in document.RootElement.GetProperty(Name).EnumerateObject())
                {
                    var namedValuedKeyPairs = new NamedKeyValuePairs(item.Name);

                    foreach (var keyPair in item.Value.EnumerateObject())
                    {
                        namedValuedKeyPairs.Add(keyPair.Name, keyPair.Value.ToString());
                    }

                    namedKeyValuePairsList.Add(namedValuedKeyPairs);
                }

                return new XsdUnhandledEnumAttributesKeyword(namedKeyValuePairsList);
            }

            /// <summary>
            /// Write @xsdUnhandledAttributes keyword to json
            /// </summary>
            public override void Write(Utf8JsonWriter writer, XsdUnhandledEnumAttributesKeyword value, JsonSerializerOptions options)
            {
                writer.WritePropertyName(Name);
                writer.WriteStartObject();

                foreach (var item in value.Properties)
                {
                    writer.WritePropertyName(item.Name);
                    writer.WriteStartObject();
                    foreach (var pair in item.Properties)
                    {
                        writer.WriteString(pair.key, pair.value);
                    }

                    writer.WriteEndObject();
                }

                writer.WriteEndObject();
            }
        }
    }
}
