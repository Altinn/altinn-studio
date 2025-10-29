#nullable disable
using System;
using System.Linq;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Helpers.Extensions;

public static class JsonStringEnumMemberNameExtensions
{
    public static string ToStringValue(this Enum enumValue)
    {
        var memberInfo = enumValue.GetType().GetMember(enumValue.ToString()).FirstOrDefault();

        if (memberInfo != null)
        {
            var attribute = memberInfo
                .GetCustomAttributes(typeof(JsonStringEnumMemberNameAttribute), false)
                .Cast<JsonStringEnumMemberNameAttribute>()
                .FirstOrDefault();

            if (attribute != null)
            {
                return attribute.Name;
            }
        }

        throw new ArgumentException($"'{enumValue}' does not have a JsonStringEnumMemberName attribute.");
    }

    public static TEnum ToEnumValue<TEnum>(this string name) where TEnum : struct, Enum
    {
        foreach (TEnum value in Enum.GetValues<TEnum>().Cast<TEnum>())
        {
            string jsonName = value.ToStringValue();
            if (string.Equals(jsonName, name, StringComparison.OrdinalIgnoreCase))
            {
                return value;
            }
        }

        throw new ArgumentException($"'{name}' is not a valid {typeof(TEnum).Name} JSON enum name.");
    }
}
