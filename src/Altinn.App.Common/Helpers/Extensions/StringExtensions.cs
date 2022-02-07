using System;
using System.Linq;

namespace Altinn.App.Common.Helpers.Extensions
{
    /// <summary>
    /// Extensions to facilitate sanitization of string values
    /// </summary>
    public static class StringExtensions
    {
        /// <summary>
        /// Sanitize the input as a file name.
        /// </summary>
        /// <param name="input">The input variable to be sanitized.</param>
        /// <param name="throwExceptionOnInvalidCharacters">Throw exception instead of replacing invalid characters with '_'.</param>
        /// <returns>A filename cleaned of any impurities.</returns>
        public static string AsFileName(this string input, bool throwExceptionOnInvalidCharacters = true)
        {
            if (string.IsNullOrWhiteSpace(input))
            {
                return input;
            }

            char[] illegalFileNameCharacters = System.IO.Path.GetInvalidFileNameChars();
            if (throwExceptionOnInvalidCharacters)
            {
                if (illegalFileNameCharacters.Any(ic => input.Any(i => ic == i)))
                {
                    throw new ArgumentOutOfRangeException(nameof(input));
                }

                return input;
            }

            return illegalFileNameCharacters.Aggregate(input, (current, c) => current.Replace(c, '_'));
        }
    }
}
