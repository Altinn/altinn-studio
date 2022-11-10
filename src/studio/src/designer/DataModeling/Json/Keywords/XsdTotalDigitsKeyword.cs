using System;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Json.More;
using Json.Schema;
using static Altinn.Studio.DataModeling.Utils.RestrictionsHelper;

namespace Altinn.Studio.DataModeling.Json.Keywords;

/// <summary>
/// Equivalent of totalDigits restriction in json schema
/// </summary>
[SchemaKeyword(Name)]
[SchemaPriority(int.MinValue)]
[SchemaDraft(Draft.Draft6)]
[SchemaDraft(Draft.Draft7)]
[SchemaDraft(Draft.Draft201909)]
[SchemaDraft(Draft.Draft202012)]
[JsonConverter(typeof(XsdTotalDigitsKeywordJsonConverter))]
public sealed class XsdTotalDigitsKeyword: IJsonSchemaKeyword, IEquatable<XsdTotalDigitsKeyword>
{
    /// <summary>
    /// The name of the keyword
    /// </summary>
    private const string Name = "totalDigits";

    /// <summary>
    /// Content
    /// </summary>
    public uint Value { get; }

    /// <summary>
    /// Creates instance with provided value
    /// </summary>
    /// <param name="value">totalDigits</param>
    public XsdTotalDigitsKeyword(uint value)
    {
        Value = value;
    }

    /// <inheritdoc />
    public void Validate(ValidationContext context)
    {
        context.EnterKeyword(Name);
        var schemaValueType = context.LocalInstance.GetSchemaValueType();
        if (schemaValueType is not (SchemaValueType.Number or SchemaValueType.Integer))
        {
            context.LocalResult.Pass();
            context.WrongValueKind(schemaValueType);
            return;
        }

        var number = context.LocalInstance!.AsValue().GetNumber();

        if (number is null)
        {
            context.LocalResult.Fail();
            context.ExitKeyword(Name, context.LocalResult.IsValid);
            return;
        }

        if (!new Regex(TotalDigitsDecimalRegexString(Value)).IsMatch(number.Value.ToString("G", NumberFormatInfo.InvariantInfo)))
        {
            context.LocalResult.Fail();
        }
        else
        {
            context.LocalResult.Pass();
        }

        context.ExitKeyword(Name, context.LocalResult.IsValid);
    }

    /// <inheritdoc />
    public bool Equals(XsdTotalDigitsKeyword other)
    {
        if (other is null)
        {
            return false;
        }

        return ReferenceEquals(this, other) || Equals(Value, other.Value);
    }

    /// <inheritdoc />
    public override bool Equals(object obj)
    {
        return Equals(obj as XsdTotalDigitsKeyword);
    }

    /// <inheritdoc />
    public override int GetHashCode()
    {
        return Value.GetHashCode();
    }

    /// <summary>
    /// Serializer for the XsdTotalDigitsKeyword keyword
    /// </summary>
    internal class XsdTotalDigitsKeywordJsonConverter : JsonConverter<XsdTotalDigitsKeyword>
    {
        /// <inheritdoc />
        public override XsdTotalDigitsKeyword Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType != JsonTokenType.Number)
            {
                throw new JsonException("Expected number");
            }

            return new XsdTotalDigitsKeyword(reader.GetUInt32());
        }

        /// <inheritdoc />
        public override void Write(Utf8JsonWriter writer, XsdTotalDigitsKeyword value, JsonSerializerOptions options)
        {
            writer.WriteNumber(Name, value.Value);
        }
    }
}
