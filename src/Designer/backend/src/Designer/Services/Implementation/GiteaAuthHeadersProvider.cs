using System.Collections.Generic;
using Altinn.Studio.Designer.Infrastructure.DeveloperSession;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation;

public class GiteaAuthHeadersProvider(IDeveloperContextProvider developerContextProvider)
    : IGitServerAuthHeadersProvider
{
    public Dictionary<string, string> GetAuthHeaders()
    {
        var headers = new Dictionary<string, string>();
        var context = developerContextProvider.DeveloperContext;

        if (context == null)
        {
            return headers;
        }

        headers["X-WEBAUTH-USER"] = context.Username;

        string fullName = $"{context.GivenName} {context.FamilyName}".Trim();
        if (!string.IsNullOrEmpty(fullName))
        {
            headers["X-WEBAUTH-FULLNAME"] = fullName;
        }

        return headers;
    }
}
