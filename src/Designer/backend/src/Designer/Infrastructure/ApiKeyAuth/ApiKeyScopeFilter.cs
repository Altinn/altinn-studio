using System.Linq;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Altinn.Studio.Designer.Infrastructure.ApiKeyAuth;

public class ApiKeyScopeFilter : IAuthorizationFilter
{
    public void OnAuthorization(AuthorizationFilterContext context)
    {
        string? authType = context.HttpContext.User.Identity?.AuthenticationType;
        if (authType != ApiKeyAuthenticationDefaults.AuthenticationScheme)
        {
            return;
        }

        bool isAllowed = context.ActionDescriptor.EndpointMetadata.Any(m => m is AllowApiKeyAttribute);

        if (!isAllowed)
        {
            context.Result = new ForbidResult();
        }
    }
}
