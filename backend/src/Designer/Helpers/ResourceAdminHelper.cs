using System.Collections.Generic;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Helpers
{
    public static class ResourceAdminHelper
    {
        public static string ValidateServiceResource(ServiceResource resourceToValidate, bool strictMode = false)
        {
            List<string> missingResourceAttributes = new List<string>();

            if (resourceToValidate.Title == null)
            {
                missingResourceAttributes.Add("Title");
            }

            if (resourceToValidate.Description == null)
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
                return $"Validation of resource failed because of missing attribute(s): {missingResourceAttributes}";
            }
            else
            {
                return $"Validation of resource completed. Resource is valid";
            }
        }
    }
}
