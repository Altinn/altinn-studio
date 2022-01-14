using System;
using System.Text.Json;
using System.Text.Json.Serialization;
using Json.More;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Json.Keywords
{
    /// <summary>
    /// Adds info keyword to schema
    /// </summary>
    [SchemaKeyword(Name)]
    [SchemaPriority(int.MinValue)]
    [SchemaDraft(Draft.Unspecified)]
    [JsonConverter(typeof(InfoKeywordJsonConverter))]
    public sealed class InfoKeyword : IJsonSchemaKeyword, IEquatable<InfoKeyword>
    {
        /// <summary>
        /// The name of the keyword
        /// </summary>
        internal const string Name = "info";

        /// <summary>
        /// The value
        /// </summary>
        public JsonElement Value { get; }

        /// <summary>
        /// Create a new instance of InfoKeyword with the specified value
        /// </summary>
        /// <param name="value">info value</param>
        public InfoKeyword(JsonElement value)
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
        public bool Equals(InfoKeyword other)
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
            return Equals(obj as InfoKeyword);
        }

        /// <summary>Serves as the default hash function.</summary>
        /// <returns>A hash code for the current object.</returns>
        public override int GetHashCode()
        {
            return Value.GetHashCode();
        }

        /// <summary>
        /// Serializer for the info keyword
        /// </summary>
        internal class InfoKeywordJsonConverter : JsonConverter<InfoKeyword>
        {
            /// <summary>
            /// Read info keyword from json schema
            /// </summary>
            public override InfoKeyword Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
            {
                if (reader.TokenType != JsonTokenType.StartObject)
                {
                    throw new JsonException("Expected object");
                }

                JsonDocument value = JsonDocument.ParseValue(ref reader);

                return new InfoKeyword(value.RootElement);
            }

            /// <summary>
            /// Write info keyword to json
            /// </summary>
            public override void Write(Utf8JsonWriter writer, InfoKeyword value, JsonSerializerOptions options)
            {
                writer.WritePropertyName(Name);
                writer.WriteValue(value.Value);
            }
        }
    }
}
