using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.Helpers
{
    /// <summary>
    /// helper class for authentication
    /// </summary>
    public static class AuthenticationHelper
    {
        /// <summary>
        /// Gets the app developer's user name
        /// </summary>
        /// <param name="context">the http context</param>
        /// <returns>The developer user name</returns>
        public static string GetDeveloperUserName(HttpContext context)
        {
            return context.User.Identity?.Name;
        }

        /// <summary>
        /// Gets the developer's organization number from Ansattporten claims
        /// </summary>
        /// <param name="context">the http context</param>
        /// <returns>The organization number or null</returns>
        public static string GetDeveloperOrgNr(HttpContext context)
        {
            Claim authDetailsClaim = context.User.FindFirst("authorization_details");

            if (authDetailsClaim == null)
            {
                return null;
            }

            try
            {
                using var document = JsonDocument.Parse(authDetailsClaim.Value);
                JsonElement root = document.RootElement;

                if (root.ValueKind != JsonValueKind.Array)
                {
                    return null;
                }

                foreach (JsonElement detail in root.EnumerateArray())
                {
                    if (detail.TryGetProperty("type", out JsonElement typeElement) is false)
                    {
                        continue;
                    }

                    string type = typeElement.GetString();

                    // Employer organization number
                    if (type == "ansattporten:orgno" &&
                            detail.TryGetProperty("orgno", out JsonElement orgnoClaim) &&
                            orgnoClaim.TryGetProperty("ID", out JsonElement orgId))
                    {
                        return ExtractOrgNumber(orgId.GetString());
                    }
                    // Altinn service representation
                    else if (type == "ansattporten:altinn:service" &&
                        detail.TryGetProperty("reportees", out JsonElement reportees))
                    {
                        JsonElement firstReportee = reportees.EnumerateArray().FirstOrDefault();
                        if (firstReportee.TryGetProperty("ID", out JsonElement id))
                        {
                            return ExtractOrgNumber(id.GetString());
                        }
                    }
                    // Altinn resource representation
                    else if (type == "ansattporten:altinn:resource" &&
                            detail.TryGetProperty("authorized_parties", out JsonElement parties))
                    {
                        JsonElement firstParty = parties.EnumerateArray().FirstOrDefault();
                        if (firstParty.TryGetProperty("orgno", out JsonElement orgno) &&
                            orgno.TryGetProperty("ID", out JsonElement id))
                        {
                            return ExtractOrgNumber(id.GetString());
                        }
                    }
                }
            }
            catch (JsonException)
            {
                return null;
            }

            return null;
        }

        private static string ExtractOrgNumber(string orgWithPrefix)
        {
            if (string.IsNullOrEmpty(orgWithPrefix))
            {
                return null;
            }

            // Format is "0192:987464291"
            int colonIndex = orgWithPrefix.IndexOf(':');
            if (colonIndex >= 0 && colonIndex < orgWithPrefix.Length - 1)
            {
                return orgWithPrefix.Substring(colonIndex + 1);
            }

            // If no colon found, return as-is (might already be just the number)
            return orgWithPrefix;
        }

        public static Task<string> GetDeveloperAppTokenAsync(this HttpContext context)
        {
            return context.GetTokenAsync("access_token");
        }

        public static bool IsAuthenticated(HttpContext context)
        {
            return context.User.Identity?.IsAuthenticated ?? false;
        }
    }
}
