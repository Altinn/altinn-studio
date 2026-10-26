using System;
using System.Globalization;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository.ORMImplementation.Data;
using Altinn.Studio.Designer.Services.Implementation;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.Studio.Designer.Infrastructure.StudioOidc;

internal static class MockportenAuthentication
{
    public static void Configure(OpenIdConnectOptions options, MockportenSettings settings)
    {
        options.MetadataAddress = settings.MetadataAddress;
        options.ClientId = settings.ClientId;
        options.CallbackPath = "/mockporten-signin";
        options.SignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;
        options.ResponseType = OpenIdConnectResponseType.Code;
        options.UsePkce = true;
        options.PushedAuthorizationBehavior = PushedAuthorizationBehavior.Disable;
        options.RequireHttpsMetadata = true;
        options.GetClaimsFromUserInfoEndpoint = false;
        options.MapInboundClaims = false;
        options.SaveTokens = true;
        options.UseTokenLifetime = true;
        options.Scope.Clear();
        options.Scope.Add("openid");
        // Mockporten advertises a different discovery issuer. Pin the token issuer, never disable validation.
        options.TokenValidationParameters.IssuerValidator = (issuer, _, _) =>
            issuer == settings.Issuer
                ? issuer
                : throw new SecurityTokenInvalidIssuerException("Unexpected Mockporten issuer.");
        options.Events.OnRedirectToIdentityProvider = context =>
        {
            if (!context.Request.Path.Equals(new PathString("/Login")))
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                context.HandleResponse();
            }
            return Task.CompletedTask;
        };
        options.Events.OnTicketReceived = ResolveIdentity;
        options.Events.OnRemoteFailure = context =>
        {
            context.HandleResponse();
            context.Response.Redirect("/?loginError=mockporten");
            return Task.CompletedTask;
        };
    }

    internal static async Task ResolveIdentity(TicketReceivedContext context)
    {
        var services = context.HttpContext.RequestServices;
        string? pid = context.Principal?.FindFirstValue("pid");
        if (
            !SyntheticPid.IsValid(pid)
            || context.Properties is null
            || !TryGetExpiry(context.Properties, out var expiry)
            || expiry <= services.GetRequiredService<TimeProvider>().GetUtcNow()
        )
        {
            RejectLogin(context);
            return;
        }

        if (context.Properties.ExpiresUtc is { } tokenExpiry && tokenExpiry < expiry)
        {
            expiry = tokenExpiry;
        }

        string hash = PidHash.FromPid(pid!, services.GetRequiredService<DeveloperMappingSettings>()).Value;
        string username;
        try
        {
            username = await services.GetRequiredService<MockportenAccountService>().ResolveAsync(hash);
        }
        catch (UnauthorizedAccessException)
        {
            RejectLogin(context);
            return;
        }

        context.Principal = new ClaimsPrincipal(
            new ClaimsIdentity(
                [
                    new Claim(ClaimTypes.Name, username),
                    new Claim(StudioAuthenticationProviders.ClaimType, StudioAuthenticationProviders.Mockporten),
                    new Claim(StudioAuthenticationProviders.MockportenPidHashClaim, hash),
                ],
                CookieAuthenticationDefaults.AuthenticationScheme
            )
        );
        context.Properties.ExpiresUtc = expiry;
        context.Properties.AllowRefresh = false;
        // Mockporten's refresh token is not usable; its access token must never be sent to Samarbeid API.
        context.Properties.StoreTokens([
            new AuthenticationToken { Name = "expires_at", Value = expiry.ToString("o", CultureInfo.InvariantCulture) },
        ]);
    }

    internal static async Task ValidateSession(CookieValidatePrincipalContext context, MockportenSettings settings)
    {
        string? hash = context.Principal?.FindFirstValue(StudioAuthenticationProviders.MockportenPidHashClaim);
        string? username = context.Principal?.Identity?.Name;
        var services = context.HttpContext.RequestServices;
        if (
            !settings.Enabled
            || !TryGetExpiry(context.Properties, out var expiry)
            || expiry <= services.GetRequiredService<TimeProvider>().GetUtcNow()
            || !settings.Users.Any(user => user.PidHash == hash && user.Username == username)
        )
        {
            context.RejectPrincipal();
            return;
        }

        bool active = await services
            .GetRequiredService<DesignerdbContext>()
            .UserAccounts.AnyAsync(user =>
                user.PidHash == hash
                && user.Username == username
                && !user.Deactivated
                && user.AuthenticationProvider == StudioAuthenticationProviders.Mockporten
            );
        if (!active)
        {
            context.RejectPrincipal();
        }
    }

    private static void RejectLogin(TicketReceivedContext context)
    {
        context.HandleResponse();
        context.Response.Redirect("/?loginError=mockporten");
    }

    private static bool TryGetExpiry(AuthenticationProperties properties, out DateTimeOffset expiry) =>
        DateTimeOffset.TryParse(
            properties.GetTokenValue("expires_at"),
            CultureInfo.InvariantCulture,
            DateTimeStyles.RoundtripKind,
            out expiry
        );
}
