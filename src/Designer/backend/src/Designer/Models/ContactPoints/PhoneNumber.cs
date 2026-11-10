using System.Diagnostics.CodeAnalysis;
using System.Text.RegularExpressions;

namespace Altinn.Studio.Designer.Models.ContactPoints;

/// <summary>
/// Phone numbers in the E.164 format that Altinn Notifications requires for SMS recipients, such as +4712345678.
/// </summary>
public static partial class PhoneNumber
{
    private const string InternationalPrefix = "00";
    private const string NorwegianCountryCode = "+47";

    /// <summary>
    /// Removes spaces and dashes, replaces a leading 00 with +, and adds +47 to Norwegian mobile numbers.
    /// </summary>
    /// <returns>Whether the value is a phone number with a country code.</returns>
    public static bool TryNormalize(string value, [NotNullWhen(true)] out string? normalized)
    {
        string number = FormattingCharacters().Replace(value, "");
        if (number.StartsWith(InternationalPrefix))
        {
            number = $"+{number[InternationalPrefix.Length..]}";
        }
        else if (NorwegianMobileNumber().IsMatch(number))
        {
            number = $"{NorwegianCountryCode}{number}";
        }

        normalized = InternationalNumber().IsMatch(number) ? number : null;
        return normalized is not null;
    }

    [GeneratedRegex(@"[\s-]")]
    private static partial Regex FormattingCharacters();

    [GeneratedRegex(@"^[49][0-9]{7}$")]
    private static partial Regex NorwegianMobileNumber();

    // A Norwegian number must be a mobile number to receive SMS
    [GeneratedRegex(@"^\+(?:47[49][0-9]{7}|(?!47)[1-9][0-9]{6,14})$")]
    private static partial Regex InternationalNumber();
}
