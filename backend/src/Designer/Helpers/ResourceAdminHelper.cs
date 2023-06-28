using System;
using System.Collections.Generic;
using System.Text;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.PolicyAdmin.Models;
using IdentityModel.OidcClient;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.CodeAnalysis.VisualBasic.Syntax;

namespace Altinn.Studio.Designer.Helpers
{
    public static class ResourceAdminHelper
    {
        public static ListviewServiceResource MapServiceResourceToListView(ServiceResource resource)
        {
            ListviewServiceResource simplifiedResource = new ListviewServiceResource { Identifier = resource.Identifier, Title = resource.Title };
            return simplifiedResource;
        }

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

            if (strictMode && (resourceToValidate.ThematicArea == null || string.IsNullOrEmpty(resourceToValidate.ThematicArea)))
            {
                missingResourceAttributes.Add("ThematicArea");
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

        public static bool ValidationProblemDetailsListHasNoErrors(List<ValidationProblemDetails> validationProblemDetailsList)
        {
            foreach (ValidationProblemDetails vdp in validationProblemDetailsList)
            {
                if (vdp.Errors.Count != 0)
                {
                    return false;
                }
            }

            return true;
        }

        public static bool ValidDictionaryAttribute(Dictionary<string, string> titleToValidate)
        {
            if (titleToValidate != null)
            {
                string enTitle = titleToValidate.ContainsKey("en") ? titleToValidate["en"] : string.Empty;
                string nbTitle = titleToValidate.ContainsKey("nb") ? titleToValidate["nb"] : string.Empty;
                string nnTitle = titleToValidate.ContainsKey("nn") ? titleToValidate["nn"] : string.Empty;

                return !string.IsNullOrWhiteSpace(enTitle) && !string.IsNullOrWhiteSpace(nbTitle) && !string.IsNullOrWhiteSpace(nnTitle);
            }
            else
            {
                return false;
            }
        }
    }
}
