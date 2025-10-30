using System.Diagnostics.CodeAnalysis;

namespace Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;

internal static class AltinnExtensionConfigValidationExtensions
{
    internal static bool IsNullOrWhitespace(
        [NotNullWhen(false)] this string? value,
        [NotNullWhen(true)] ref List<string>? errors,
        string error
    )
    {
        var result = string.IsNullOrWhiteSpace(value);
        if (result)
        {
            errors ??= new List<string>(1);
            errors.Add(error);
        }

        return result;
    }

    internal static bool IsEmpty(
        [NotNullWhen(false)] this IEnumerable<object>? value,
        [NotNullWhen(true)] ref List<string>? errors,
        string error
    )
    {
        bool isEmpty = value?.Any() == false;
        if (isEmpty)
        {
            errors ??= new List<string>(1);
            errors.Add(error);
        }

        return isEmpty;
    }
}
