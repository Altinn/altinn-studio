using System.Globalization;
using System.Linq;

namespace Altinn.Platform.Storage.Helpers
{
    /// <summary>
    /// Helper methods for text.
    /// </summary>
    public static class LanguageHelper
    {
        /// <summary>
        /// Checks if an language string is a valid two letter ISO name
        /// </summary>
        /// <param name="language">the language to check</param>
        /// <returns>true if it is valid, false otherwise</returns>
        public static bool IsTwoLetterISOName(string language)
        {
            if (language == null)
            {
                return false;
            }

            CultureInfo match = CultureInfo
                .GetCultures(CultureTypes.AllCultures)
                .FirstOrDefault(culture => culture.TwoLetterISOLanguageName.Equals(language));

            return match != null;
        }
    }
}
