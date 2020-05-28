using System;
using System.Globalization;

namespace Altinn.Platform.Storage.Helpers
{
    /// <summary>
    /// Date time helper methods
    /// </summary>
    public static class DateTimeHelper
    {
        /// <summary>
        /// The standard date format to excpect in input data.
        /// </summary>
        public static readonly string Iso8601Format = "yyyy-MM-ddTHH:mm:ss.sss";

        /// <summary>
        /// The standard date format with UTC timezone (Zulu)
        /// </summary>
        public static readonly string Iso8601UtcFormat = Iso8601Format + "Z";

        /// <summary>
        /// Converts a date to universal time. If unspecified timezone we want to interpret it as Utc time and not the local culture of the microservice.
        /// </summary>
        /// <param name="date">the date to convert</param>
        /// <returns>the converted date or null if no input</returns>
        public static DateTime? ConvertToUniversalTime(DateTime? date)
        {
            if (date.HasValue)
            {
                DateTime timestamp = date.Value;

                if (timestamp.Kind == DateTimeKind.Utc)
                {
                    return timestamp;
                }
                else if (timestamp.Kind == DateTimeKind.Local)
                {
                    return timestamp.ToUniversalTime();
                }
                else if (timestamp.Kind == DateTimeKind.Unspecified)
                {
                    // force unspecified timezone to be interpreted as UTC
                    string unspecifiedTimezoneDateTime = timestamp.ToString(Iso8601Format, CultureInfo.InvariantCulture);
                    DateTime utc = DateTime.ParseExact(unspecifiedTimezoneDateTime + "Z", Iso8601UtcFormat, CultureInfo.InvariantCulture);
                    return utc.ToUniversalTime();
                }
            }

            return null;
        }

        /// <summary>
        /// Parses a date and converts it to UTC.
        /// </summary>
        /// <param name="serializedDateTime">The date expressed in a string</param>
        /// <returns>The parsed DateTime value.</returns>
        public static DateTime ParseAndConvertToUniversalTime(string serializedDateTime)
        {
            return DateTime.Parse(serializedDateTime, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal);
        }

        /// <summary>
        /// Formats date time to string according to Iso8691 utc.
        /// </summary>
        /// <param name="date">the date to format</param>
        /// <returns>The input serialized to ISO 8691 UTC format.</returns>
        public static string RepresentAsIso8601Utc(DateTime date)
        {
            return date.ToString(Iso8601UtcFormat, CultureInfo.InvariantCulture);
        }
    }
}
