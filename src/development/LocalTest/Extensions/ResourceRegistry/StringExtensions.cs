using System;
using System.IO;
using System.Linq;

namespace Altinn.ResourceRegistry.Core.Extensions
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

                return input;
            }

            return illegalFileNameCharacters.Aggregate(input, (current, c) => current.Replace(c, '-'));
        }

        /// <summary>
        /// Sanitize the input as part of a file path 
        /// </summary>
        /// <param name="input">The input variable to be sanitized</param>
        /// <param name="throwExceptionOnInvalidCharacters">Throw exception instead of replacing invalid characters with '-'</param>
        /// <returns></returns>
        public static string AsFilePath(this string input, bool throwExceptionOnInvalidCharacters = true)
        {
            if (string.IsNullOrWhiteSpace(input))
            {
                return input;
            }

            char[] illegalFilePathCharacters = Path.GetInvalidPathChars();
            if (throwExceptionOnInvalidCharacters)
            {
                if (illegalFilePathCharacters.Any(ic => input.Any(i => ic == i)))
                {
                    throw new ArgumentOutOfRangeException(nameof(input));
                }

                return input;
            }

            return illegalFilePathCharacters.Aggregate(input, (current, c) => current.Replace(c, '-'));
        }
    }
}
