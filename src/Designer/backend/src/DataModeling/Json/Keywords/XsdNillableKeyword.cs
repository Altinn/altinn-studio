using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Serialization;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Json.Keywords;

/// <summary>
/// Adds @xsdNillable keyword to schema indicating if member should be treated as XML text when serialized or deserialized.
/// </summary>
[SchemaKeyword(Name)]
[SchemaSpecVersion(SpecVersion.Draft6)]
[SchemaSpecVersion(SpecVersion.Draft7)]
[SchemaSpecVersion(SpecVersion.Draft201909)]
[SchemaSpecVersion(SpecVersion.Draft202012)]
[SchemaSpecVersion(SpecVersion.DraftNext)]
[JsonConverter(typeof(XsdNillableKeywordJsonConverter))]
public sealed class XsdNillableKeyword : IJsonSchemaKeyword, IEquatable<XsdNillableKeyword>
{
    /// <summary>
    /// The name of the keyword
    /// </summary>
    private const string Name = "@xsdNillable";

    /// <summary>
    /// Content
    /// </summary>
    public bool Value { get; }

    /// <summary>
    /// Create a new instance of <see cref="XsdNillableKeyword"/> with the specified false value.
    /// </summary>
    public XsdNillableKeyword(bool value)
    {
        Value = value;
    }

    public KeywordConstraint GetConstraint(SchemaConstraint schemaConstraint, IReadOnlyList<KeywordConstraint> localConstraints, EvaluationContext context)
    {
        return new KeywordConstraint(Name, (e, c) => { });
    }

    /// <inheritdoc/>
    public bool Equals(XsdNillableKeyword other)
    {
        if (other is null)
        {
            return false;
        }

        return ReferenceEquals(this, other) || Equals(Value, other.Value);
    }

    /// <inheritdoc/>
    public override bool Equals(object obj)
    {
        return Equals(obj as XsdNillableKeyword);
    }

    /// <inheritdoc/>
    public override int GetHashCode()
    {
        return Value.GetHashCode();
    }

    /// <summary>
    /// Serializer for the @xsdText keyword
    /// </summary>
    internal class XsdNillableKeywordJsonConverter : JsonConverter<XsdNillableKeyword>
    {
        /// <inheritdoc/>
        public override XsdNillableKeyword Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType != JsonTokenType.True && reader.TokenType != JsonTokenType.False)
            {
                throw new JsonException("Expected boolean");
            }

            return new XsdNillableKeyword(reader.GetBoolean());
        }

        /// <inheritdoc/>
        public override void Write(Utf8JsonWriter writer, XsdNillableKeyword value, JsonSerializerOptions options)
        {
            writer.WriteBoolean(Name, value.Value);
        }
    }
}
