using System.Text.RegularExpressions;

namespace Altinn.Platform.Storage.Helpers
{
    /// <summary>
    /// Helper methods for text.
    /// </summary>
    public static class LanguageHelper
    {
        /// <summary>
        /// Checks if a string contains two letters as expected by the ISO 3166 language code
        /// </summary>
        /// <param name="language">the language to check</param>
        /// <returns>true if it is valid, false otherwise</returns>
        public static bool IsTwoLetters(string language)
        {
            if (language == null)
            {
                return false;
            }

            return Regex.IsMatch(language, "^[A-Za-z]{2}$");
        }
    }
}
