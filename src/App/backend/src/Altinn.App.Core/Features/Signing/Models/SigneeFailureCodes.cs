using System.Text.Json;
using System.Text.Json.Serialization;

namespace Altinn.App.Core.Features.Signing.Models;

/// <summary>
/// Why access delegation failed permanently for a signee. Persisted in the signee-state data element and mapped
/// onto the signing state API; append-only, because a persisted value must always read back.
/// </summary>
[JsonConverter(typeof(LenientEnumJsonConverter<DelegationFailureCode>))]
internal enum DelegationFailureCode
{
    /// <summary>The provided signee could not be resolved to a party that can receive rights.</summary>
    InvalidParty,

    /// <summary>Access Management refused the delegation.</summary>
    Rejected,

    /// <summary>A permanent failure with no more specific code, including values written by a newer version.</summary>
    Unknown,
}

/// <summary>
/// Why the call-to-action notification failed permanently for a signee. Persisted in the signee-state data
/// element and mapped onto the signing state API; append-only, because a persisted value must always read back.
/// </summary>
[JsonConverter(typeof(LenientEnumJsonConverter<NotificationFailureCode>))]
internal enum NotificationFailureCode
{
    /// <summary>The app has no correspondence resource configured for the environment. App-wide.</summary>
    Configuration,

    /// <summary>The sending organisation could not be resolved. App-wide.</summary>
    ServiceOwnerUnavailable,

    /// <summary>Correspondence refused the message.</summary>
    Rejected,

    /// <summary>A permanent failure with no more specific code, including values written by a newer version.</summary>
    Unknown,
}

/// <summary>
/// Reads an enum from its camelCase or PascalCase name and maps any value it does not recognise to the member
/// named <c>Unknown</c>, so a rollback to an older app-lib after a newer one persisted a member, or a hand-edited
/// element, degrades to the unknown code instead of failing every read of the signee state.
/// </summary>
internal sealed class LenientEnumJsonConverter<TEnum> : JsonConverter<TEnum>
    where TEnum : struct, Enum
{
    private static readonly TEnum _unknown = Enum.TryParse("Unknown", ignoreCase: true, out TEnum unknown)
        ? unknown
        : default;

    public override TEnum Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.String)
        {
            string? value = reader.GetString();
            if (value is not null && Enum.TryParse(value, ignoreCase: true, out TEnum parsed) && Enum.IsDefined(parsed))
            {
                return parsed;
            }

            return _unknown;
        }

        if (reader.TokenType == JsonTokenType.Number && reader.TryGetInt32(out int number))
        {
            TEnum fromNumber = (TEnum)Enum.ToObject(typeof(TEnum), number);
            return Enum.IsDefined(fromNumber) ? fromNumber : _unknown;
        }

        reader.Skip();
        return _unknown;
    }

    public override void Write(Utf8JsonWriter writer, TEnum value, JsonSerializerOptions options) =>
        writer.WriteStringValue(JsonNamingPolicy.CamelCase.ConvertName(value.ToString()));
}

/// <summary>
/// Applies <see cref="LenientEnumJsonConverter{TEnum}"/> to the failure-code enums from
/// <see cref="SigneeStateSerialization.Options"/>. Registered ahead of the general string-enum converter, because
/// a converter in the options outranks a converter attribute on the enum type and would otherwise throw on a
/// value it does not recognise.
/// </summary>
internal sealed class LenientFailureCodeJsonConverterFactory : JsonConverterFactory
{
    public override bool CanConvert(Type typeToConvert) =>
        typeToConvert == typeof(DelegationFailureCode) || typeToConvert == typeof(NotificationFailureCode);

    public override JsonConverter CreateConverter(Type typeToConvert, JsonSerializerOptions options)
    {
        if (typeToConvert == typeof(DelegationFailureCode))
        {
            return new LenientEnumJsonConverter<DelegationFailureCode>();
        }

        if (typeToConvert == typeof(NotificationFailureCode))
        {
            return new LenientEnumJsonConverter<NotificationFailureCode>();
        }

        throw new NotSupportedException(
            $"{nameof(LenientFailureCodeJsonConverterFactory)} cannot convert {typeToConvert}."
        );
    }
}
