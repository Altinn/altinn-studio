using System.Globalization;

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

            foreach(var culture in CultureInfo.GetCultures(CultureTypes.AllCultures))
            {
                if (language.Equals(culture.TwoLetterISOLanguageName))
                {
                    return true;
                }
            }

            return false;
        }
    }
}
