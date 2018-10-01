using System.Collections.Generic;
using AltinnCore.ServiceLibrary;

namespace AltinnCore.Common.Helpers
{
    /// <summary>
    /// Helper for service Text
    /// </summary>
    public static class ServiceTextHelper
    {
        /// <summary>
        /// Get a given serviceText
        /// </summary>
        /// <param name="key">The key</param>
        /// <param name="serviceText">List of serviceText</param>
        /// <param name="textParams">Parameters for text</param>
        /// <param name="languageId">The languageId</param>
        /// <returns>The given text</returns>
        public static string GetServiceText(string key, Dictionary<string, Dictionary<string, string>> serviceText, List<string> textParams, string languageId)
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

        /// <summary>
        /// Replaces the tags in service text with configured values in text from request context and service context
        /// </summary>
        /// <param name="serviceText">The service text</param>
        /// <param name="requestContext"></param>
        /// <param name="serviceContext"></param>
        /// <returns></returns>
        public static string SetTextParams(string serviceText, RequestContext requestContext, ServiceContext serviceContext)
        {
            if (serviceText.Contains("{altinncore:"))
            {
                serviceText = serviceText.Replace("{altinncore:context.UserFirstName}", requestContext.UserContext.UserParty.Person.FirstName);
                serviceText = serviceText.Replace("{altinncore:context.UserLastName}", requestContext.UserContext.UserParty.Person.LastName);
            }

            return serviceText;
        }
    }
}
