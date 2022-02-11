#nullable enable
using System;
using System.Globalization;
using System.Text;

namespace Altinn.Platform.Register.Core
{
    /// <summary>
    /// Represents a collection of extension methods for string
    /// </summary>
    public static class StringExtensions
    {
        /// <summary>
        /// Compare to strings doing a loose compare ignoring case and diacritics
        /// </summary>
        /// <param name="text1">First text</param>
        /// <param name="text2">Second text</param>
        /// <returns>true if the texts are similar.</returns>
        public static bool IsSimilarTo(this string text1, string text2)
        {
            const int CompareLength = 4;

            text1 ??= string.Empty;
            text2 ??= string.Empty;

            text1 = text1.Trim().Length > CompareLength ? text1.Remove(CompareLength).Trim() : text1.Trim();
            text2 = text2.Trim().Length > CompareLength ? text2.Remove(CompareLength).Trim() : text2.Trim();

            text1 = text1.RemoveDiacritics();
            text2 = text2.RemoveDiacritics();

            return text1.Equals(text2, StringComparison.InvariantCultureIgnoreCase);
        }

        /// <summary>
        /// Remove diacritics from a string while normalizing it.
        /// </summary>
        /// <param name="text">The text to normalize.</param>
        /// <returns>The normalized text.</returns>
        public static string RemoveDiacritics(this string text)
        {
            string normalizedText;

            // Å is not a special character in Norwegian hence handling this character differently
            if (text.ToUpper().Contains('Å'))
            {
                StringBuilder firstPassBuilder = new StringBuilder();
                foreach (char ch in text)
                {
                    if (ch == 'Å' || ch == 'å')
                    {
                        // NormalizationForm C doesn't convert Å to A
                        firstPassBuilder.Append(ch.ToString().Normalize(NormalizationForm.FormC));
                    }
                    else
                    {
                        firstPassBuilder.Append(ch.ToString().Normalize(NormalizationForm.FormD));
                    }
                }

                normalizedText = firstPassBuilder.ToString();
            }
            else
            {
                normalizedText = text.Normalize(NormalizationForm.FormD);
            }

            StringBuilder secondPassBuilder = new StringBuilder();
            foreach (char ch in normalizedText)
            {
                // Unicode information of the characters, e.g. Uppercase, Lowercase, NonSpacingMark, etc.
                UnicodeCategory unicode = CharUnicodeInfo.GetUnicodeCategory(ch);

                if (unicode != UnicodeCategory.NonSpacingMark)
                {
                    // StringBuilder is appended with the characters that are not diacritics
                    secondPassBuilder.Append(ch);
                }
            }

            return secondPassBuilder.ToString().Normalize(NormalizationForm.FormC);
        }
    }
}
