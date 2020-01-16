using System.Collections.Generic;

namespace Altinn.App.Services.Helpers
{
    /// <summary>
    /// Helper for service Text
    /// </summary>
    public static class AppTextHelper
    {
        /// <summary>
        /// Get a given app Text
        /// </summary>
        /// <param name="key">The key</param>
        /// <param name="serviceText">List of serviceText</param>
        /// <param name="textParams">Parameters for text</param>
        /// <param name="languageId">The languageId</param>
        /// <returns>The given text</returns>
        public static string GetAppText(string key, Dictionary<string, Dictionary<string, string>> serviceText, List<string> textParams, string languageId)
        {
            string text = key;
            if (serviceText != null && serviceText.ContainsKey(key))
            {
                if (serviceText[key].ContainsKey(languageId))
                {
                    text = serviceText[key][languageId];
                }

                if (textParams != null && textParams.Count > 0)
                {
                    object[] stringList = new object[textParams.Count];

                    for (int i = 0; i < textParams.Count; i++)
                    {
                        stringList[i] = textParams[i];
                    }

                    text = string.Format(text, stringList);
                }
            }

            return text;
        }
    }
}
