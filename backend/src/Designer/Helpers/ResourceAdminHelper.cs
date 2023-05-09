using System;
using System.Collections.Generic;
using System.Text;
using Altinn.Studio.Designer.Models;
using Microsoft.CodeAnalysis.VisualBasic.Syntax;

namespace Altinn.Studio.Designer.Helpers
{
    public static class ResourceAdminHelper
    {
        public static string ValidateServiceResource(ServiceResource resourceToValidate, bool strictMode = false)
        {
            List<string> missingResourceAttributes = new List<string>();

            if (!ValidDictionaryAttribute(resourceToValidate.Title))
            {
                missingResourceAttributes.Add("Title");
            }

            if (!ValidDictionaryAttribute(resourceToValidate.Description))
            {
                missingResourceAttributes.Add("Description");
            }

            if (resourceToValidate.ResourceType == null)
            {
                missingResourceAttributes.Add("ResourceType");
            }

            if (strictMode)
            {
                if (resourceToValidate.ThematicArea == null || string.IsNullOrEmpty(resourceToValidate.ThematicArea))
                {
                    missingResourceAttributes.Add("ThematicArea");
                }
            }

            if (missingResourceAttributes.Count > 0)
            {
                return $"Validation of resource failed because of missing attribute(s)";
            }
            else
            {
                return $"Validation of resource completed. Resource is valid";
            }
        }

        private static bool ValidDictionaryAttribute(Dictionary<string, string> titleToValidate)
        {
            if (titleToValidate != null)
            {
                string enTitle = titleToValidate.ContainsKey("en") ? titleToValidate["en"] : string.Empty;
                string nbTitle = titleToValidate.ContainsKey("nb") ? titleToValidate["nb"] : string.Empty;
                string nnTitle = titleToValidate.ContainsKey("nn") ? titleToValidate["nn"] : string.Empty;

                return !string.IsNullOrWhiteSpace(enTitle) && !string.IsNullOrWhiteSpace(nbTitle) && !string.IsNullOrWhiteSpace(nnTitle) ? true : false;
            }
            else
            {
                return false;
            }
        }
    }
}
