using System;
using System.Globalization;
using System.Text.Json;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Json.Formats
{
    /// <summary>
    /// Support for 'year' as a format when parsing the format keyword in a Json Schema.
    /// </summary>
    public static class CustomFormats
    {
        /// <summary>
        /// DateMonth format (yyyy-MM) example 2021-11
        /// </summary>
        public static readonly Format YearMonth = new PredicateFormat("year-month", CheckDate);

        /// <summary>
        /// Year format (yyyy) example 2020
        /// </summary>
        public static readonly Format Year = new RegexFormat("year", @"^\d{4}$");

        private static bool CheckDate(JsonElement element)
        {
            return CheckDateFormat(element, "yyyy-MM");
        }

        private static bool CheckDateFormat(JsonElement element, params string[] formats)
        {
            if (element.ValueKind != JsonValueKind.String)
            {
                return true;
            }

            return DateTimeOffset.TryParseExact(element.GetString(), formats, CultureInfo.InvariantCulture, DateTimeStyles.None, out _);
        }
    }
}
