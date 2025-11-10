#nullable disable
using System.Collections.Generic;
using System.Linq;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Helpers
{
    public static class ResourceAdminHelper
    {
        public static ListviewServiceResource MapServiceResourceToListView(ServiceResource resource)
        {
            ListviewServiceResource simplifiedResource = new ListviewServiceResource { Identifier = resource.Identifier, Title = resource.Title };
            return simplifiedResource;
        }

        public static bool ValidDictionaryAttribute(Dictionary<string, string> titleToValidate)
        {
            if (titleToValidate != null)
            {
                string enTitle = titleToValidate.ContainsKey("en") ? titleToValidate["en"] : string.Empty;
                string nbTitle = titleToValidate.ContainsKey("nb") ? titleToValidate["nb"] : string.Empty;
                string nnTitle = titleToValidate.ContainsKey("nn") ? titleToValidate["nn"] : string.Empty;

                return !string.IsNullOrWhiteSpace(enTitle.Trim()) && !string.IsNullOrWhiteSpace(nbTitle.Trim()) && !string.IsNullOrWhiteSpace(nnTitle.Trim());
            }
            else
            {
                return false;
            }
        }

        public static bool ValidFilePath(string input)
        {
            char[] illegalFileNameCharacters = GetInvalidFileNameChars();
            if (illegalFileNameCharacters.Any(ic => input.Any(i => ic == i)) || input == "..")
            {
                return false;
            }
            else
            {
                return true;
            }
        }

        public static char[] GetInvalidFileNameChars() => new char[]
        {
            '\"', '<', '>', '|', '*', '?'
        };
    }
}
