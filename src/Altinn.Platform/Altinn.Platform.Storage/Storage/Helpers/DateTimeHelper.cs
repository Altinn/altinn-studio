using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.Platform.Storage.Helpers
{
    /// <summary>
    /// Date time helper methods
    /// </summary>
    public static class DateTimeHelper
    {
        /// <summary>
        /// converts a date to universal time.
        /// </summary>
        /// <param name="date">the date to convert</param>
        /// <returns>the converted date or null if no input</returns>
        public static DateTime? ConvertToUniversalTime(DateTime? date)
        {
            if (date.HasValue)
            {
                return date.Value.ToUniversalTime();
            }

            return null;
        }

        /// <summary>
        /// parses a date and converts it to Utc.
        /// </summary>
        /// <param name="dateTimeString">the date expressed in a string</param>
        /// <returns></returns>
        public static DateTime ParseAndConvertToUniversalTime(string dateTimeString)
        {
            return DateTime.Parse(dateTimeString, null, DateTimeStyles.AdjustToUniversal);
        }        
    }
}
