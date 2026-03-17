using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Infrastructure.DeveloperSession;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.Middleware;

public class DeveloperContextMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext httpContext, IDeveloperContextProvider developerContextProvider)
    {
        string username = AuthenticationHelper.GetDeveloperUserName(httpContext);
        if (!string.IsNullOrEmpty(username))
        {
            string? givenName = httpContext.User.FindFirst("given_name")?.Value;
            string? familyName = httpContext.User.FindFirst("family_name")?.Value;
            developerContextProvider.Initialize(new DeveloperContext(username, givenName, familyName));
        }

        await next(httpContext);
    }
}
