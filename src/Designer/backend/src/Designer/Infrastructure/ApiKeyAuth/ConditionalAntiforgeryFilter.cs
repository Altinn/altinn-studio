using System.Threading.Tasks;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.ViewFeatures;

namespace Altinn.Studio.Designer.Infrastructure.ApiKeyAuth;

public class ConditionalAntiforgeryFilter : IAsyncAuthorizationFilter, IAntiforgeryPolicy
{
    private readonly IAntiforgery _antiforgery;

    public ConditionalAntiforgeryFilter(IAntiforgery antiforgery)
    {
        _antiforgery = antiforgery;
    }

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        string? authType = context.HttpContext.User.Identity?.AuthenticationType;
        if (authType == ApiKeyAuthenticationDefaults.AuthenticationScheme)
        {
            return;
        }

        if (!await _antiforgery.IsRequestValidAsync(context.HttpContext))
        {
            context.Result = new AntiforgeryValidationFailedResult();
        }
    }
}
