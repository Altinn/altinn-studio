using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Altinn.Studio.Designer.Infrastructure.StudioOidc;

/// <summary>
/// An additional restriction, never a substitute for the normal team/repository authorization.
/// Unscoped operations require explicit review before being exposed to shared test identities.
/// </summary>
public sealed class MockportenAccessFilter : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        if (StudioAuthenticationProviders.IsMockporten(context.HttpContext.User) && !IsAllowed(context))
        {
            context.Result = new ObjectResult(
                new ProblemDetails
                {
                    Status = StatusCodes.Status403Forbidden,
                    Title = "Operation unavailable for test accounts",
                    Detail =
                        "Mockporten accounts are limited to ttd. Account administration, starting builds/deployments and operations requiring Ansattporten organisation authorisation are unavailable.",
                }
            )
            {
                StatusCode = StatusCodes.Status403Forbidden,
            };
            return;
        }

        await next();
    }

    internal static bool IsAllowed(ActionExecutingContext context)
    {
        if (context.ActionDescriptor is not ControllerActionDescriptor action)
        {
            return false;
        }

        if (
            action.ControllerName is "AppScopes" or "ApiKeys" or "BotAccounts" or "ResourceAdm" or "ControlPlane"
            || action.ControllerName.Contains("Admin", StringComparison.OrdinalIgnoreCase)
            || action.ControllerTypeInfo?.Namespace?.Contains(".Controllers.Admin", StringComparison.Ordinal) == true
            || (
                action.ControllerName is "Releases" or "Deployments"
                && !HttpMethods.IsGet(context.HttpContext.Request.Method)
            )
            || (action.ControllerName == "Repository" && action.ActionName == "CopyApp")
        )
        {
            return false;
        }

        if (context.RouteData.Values.TryGetValue("org", out var org))
        {
            return string.Equals(
                org?.ToString(),
                StudioAuthenticationProviders.TestOrganization,
                StringComparison.Ordinal
            );
        }

        if (action.ControllerName == "Repository" && action.ActionName == "CreateApp")
        {
            return context.ActionArguments.TryGetValue("request", out var request)
                && request is CreateAppRequest { Org: StudioAuthenticationProviders.TestOrganization, Template: null };
        }

        return (action.ControllerName, action.ActionName) switch
        {
            ("Home", "StartPage" or "Login" or "Logout") => true,
            ("StudioOidc", "UserInfo") => true,
            ("User", "Current" or "UserRepos" or "GetStarredRepos") => true,
            ("Organization", "Organizations") => true,
            ("Repository", "Search") => true,
            ("Environments", "Environments") => true,
            ("AppTemplate", "GetAppTemplates") => true,
            _ => false,
        };
    }
}
