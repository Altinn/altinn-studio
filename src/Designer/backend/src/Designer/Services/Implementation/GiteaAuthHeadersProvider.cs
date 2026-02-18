using System.Collections.Generic;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.Services.Implementation;

public class GiteaAuthHeadersProvider(IHttpContextAccessor httpContextAccessor) : IGitServerAuthHeadersProvider
{
    public Dictionary<string, string> GetAuthHeaders()
    {
        var headers = new Dictionary<string, string>();

        var httpContext = httpContextAccessor.HttpContext;
        if (httpContext == null)
        {
            return headers;
        }

        string username = AuthenticationHelper.GetDeveloperUserName(httpContext);
        if (!string.IsNullOrEmpty(username))
        {
            headers["X-WEBAUTH-USER"] = username;
        }

        string? givenName = httpContext.User.FindFirst("given_name")?.Value;
        string? familyName = httpContext.User.FindFirst("family_name")?.Value;
        string fullName = $"{givenName} {familyName}".Trim();
        if (!string.IsNullOrEmpty(fullName))
        {
            headers["X-WEBAUTH-FULLNAME"] = fullName;
        }

        return headers;
    }
}
