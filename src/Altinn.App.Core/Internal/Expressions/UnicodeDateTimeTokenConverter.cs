using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace Altinn.App.Core.Internal.Expressions;

/// <summary>
/// A class used for converting LDML/unicode date formats to .NET date formats and format a date accordingly.
/// <see href="https://www.unicode.org/reports/tr35/tr35-dates.html#dfst-era"/>
/// </summary>
internal static partial class UnicodeDateTimeTokenConverter
{
    /// <summary>
    /// A mapping table from LDML date format tokens to .NET date format tokens
    /// </summary>
    private static string? ToDotnetToken(string ldmlToken) =>
        ldmlToken switch
        {
            // Era
            "G" => "gg",
            "GG" => "gg",
            "GGG" => "gg",
            "GGGG" => "gg",
            "GGGGG" => "gg",
            // Year
            "y" => "yyyy",
            "yy" => "yyyy",
            "yyy" => "yyyy",
            "yyyy" => "yyyy",
            // Extended year (we just map it to the same as year)
            "u" => "yyyy",
            "uu" => "yyyy",
            "uuu" => "yyy",
            "uuuu" => "yyyy",
            // Month
            "M" => "MM",
            "MM" => "MM",
            "MMM" => "MMM",
            "MMMM" => "MMMM",
            // Day of month
            "d" => "dd",
            "dd" => "dd",
            // Day of week (names, not numbers)
            "E" => "ddd",
            "EE" => "ddd",
            "EEE" => "ddd",
            "EEEE" => "dddd",
            "EEEEE" => "ddd", // This one probably needs special treatment
            // AM/PM
            "a" => "tt",
            // Hour
            "h" => "hh",
            "hh" => "hh",
            "H" => "HH",
            "HH" => "HH",
            // Minute
            "m" => "mm",
            "mm" => "mm",
            // Second
            "s" => "ss",
            "ss" => "ss",
            // Fractional second
            "S" => "ff",
            "SS" => "ff",
            "SSS" => "fff",
            _ => null,
        };

    public static string? Format(DateTimeOffset? when, string? ldmlFormat, string? language)
    {
        if (when is null)
        {
            return null;
        }

        if (string.IsNullOrEmpty(ldmlFormat))
        {
            ldmlFormat = language switch
            {
                "nb" => "dd.MM.yyyy",
                "nn" => "dd.MM.yyyy",
                _ => "M/d/yy",
            };
        }

        var culture = GetCultureInfoFromLang(language);
        StringBuilder sb = new StringBuilder();
        int i = 0;
        while (i < ldmlFormat.Length)
        {
            // Seek forwards to find the longest chain of consecutive identical characters
            int j = i;
            while (j < ldmlFormat.Length && ldmlFormat[j] == ldmlFormat[i])
            {
                j++;
            }

            string token = ldmlFormat.Substring(i, j - i);
            string? dotNetToken = ToDotnetToken(token);
            if (dotNetToken is not null)
            {
                var converted = when.Value.ToString(dotNetToken, culture);
                converted = token switch
                {
                    // Localization of AM/PM is very locale dependent the nynorsk translations does not have wide recognition
                    "a" when language is "nb" or "nn" => when.Value.Hour <= 12 ? "a.m." : "p.m.",
                    "a" => when.Value.Hour <= 12 ? "AM" : "PM",
                    // This does not exist in .NET, but it's just the first letter of the day name.
                    "EEEEE" => converted.Substring(0, 1).ToUpper(culture),
                    // Remove the century from the year
                    "yy" => converted.Substring(converted.Length - 2),
                    // Only show one digit of fractional seconds
                    "S" => converted.Substring(0, 1),
                    // If the token is single-length, in the LDML format that means it should not have leading
                    // zeroes, but in .NET it means a standard format. Let's trim the leading zeroes here.
                    { Length: 1 } when dotNetToken.Length > 1 => converted.TrimStart('0'),
                    "GGGG" => language switch
                    {
                        "nb" => when.Value.Year > 0 ? "etter Kristus" : "før Kristus",
                        "nn" => when.Value.Year > 0 ? "etter Kristus" : "før Kristus",
                        _ => when.Value.Year > 0 ? "Anno Domini" : "Before Christ",
                    },

                    // At this point, even the JS library we use gives up. Only the english era names support a narrow
                    // format, so we'll just hard-code those.
                    "GGGGG" when language == "en" => when.Value.Year > 0 ? "A" : "B",
                    _ => converted,
                };
                if (dotNetToken == "ddd")
                {
                    // The LDML format does not produce trailing periods for day names, but .NET does.
                    converted = converted.TrimEnd('.');
                }

                sb.Append(converted);
            }
            else
            {
                sb.Append(token);
            }

            i = j;
        }

        return sb.ToString();
    }

    private static CultureInfo GetCultureInfoFromLang(string? language)
    {
        CultureInfo culture = CultureInfo.InvariantCulture;
        if (language is not null)
        {
            try
            {
                culture = new CultureInfo(language);
            }
            catch (CultureNotFoundException)
            {
                // If the language is not recognized, we'll just use the invariant culture.
            }
        }

        return culture;
    }

    [GeneratedRegex(
        @"^[0-9]{4}-[0-9]{2}-[0-9]{2}(?:[ Tt][0-9]{2}:[0-9]{2}(?::[0-9]{2}(?:\.[0-9]{1,9})?)?([Zz]|[+-][0-9]{2}:[0-9]{2})?)?$",
        RegexOptions.CultureInvariant,
        matchTimeoutMilliseconds: 100
    )]
    internal static partial Regex DateVerificationRegex();

    public static DateTimeOffset? Parse(string rawString, out bool hasTimeZone)
    {
        Match match = DateVerificationRegex().Match(rawString);
        if (!match.Success)
        {
            throw new ExpressionEvaluatorTypeErrorException($"Unable to parse date \"{rawString}\": Unknown format");
        }

        string offsetString = match.Groups[1].Value;
        hasTimeZone = !string.IsNullOrEmpty(offsetString);

        if (
            DateTimeOffset.TryParse(
                rawString,
                CultureInfo.InvariantCulture,
                DateTimeStyles.RoundtripKind,
                out DateTimeOffset result
            )
        )
        {
            return result;
        }

        throw new ExpressionEvaluatorTypeErrorException(
            $"Unable to parse date \"{rawString}\": Format was recognized, but the date/time is invalid"
        );
    }
}
