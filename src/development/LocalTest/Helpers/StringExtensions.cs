using System;
using System.IO;
using System.Linq;

namespace LocalTest.Helpers
{
    /// <summary>
    /// Extensions to facilitate sanitization of string values
    /// </summary>
    public static class StringExtensions
    {
        /// <summary>
        /// Sanitize the input as a file name.
        /// </summary>
        /// <param name="input">The input variable to be sanitized</param>
        /// <param name="throwExceptionOnInvalidCharacters">Throw exception instead of replacing invalid characters with '-'</param>
        /// <returns></returns>
        public static string AsFileName(this string input, bool throwExceptionOnInvalidCharacters = true)
        {
            if (string.IsNullOrWhiteSpace(input))
            {
                return input;
            }

            char[] illegalFileNameCharacters = Path.GetInvalidFileNameChars();
            if (throwExceptionOnInvalidCharacters)
            {
                if (illegalFileNameCharacters.Any(ic => input.Any(i => ic == i)))
                {
                    throw new ArgumentOutOfRangeException(nameof(input));
                }

                if (input == "..")
                {
                    throw new ArgumentOutOfRangeException(nameof(input));
                }

                return input;
            }

            if (input == "..")
            {
               return "-";
            }

            return illegalFileNameCharacters.Aggregate(input, (current, c) => current.Replace(c, '-'));
        }
    }
}
