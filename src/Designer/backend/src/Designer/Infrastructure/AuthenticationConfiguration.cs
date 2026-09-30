using Altinn.Studio.Designer.Infrastructure.Authorization;
using Altinn.Studio.Designer.Infrastructure.StudioOidc;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Studio.Designer.Infrastructure;

/// <summary>
/// Contains extension methods for configuring authentication
/// </summary>
public static class AuthenticationConfiguration
{
    /// <summary>
    /// Extension method that configures authentication
    /// </summary>
    /// <param name="services">The Microsoft.Extensions.DependencyInjection.IServiceCollection for adding services.</param>
    /// <param name="config">The configuration</param>
    /// <param name="env">The web hosting environment</param>
    public static IServiceCollection ConfigureAuthentication(
        this IServiceCollection services,
        IConfiguration config,
        IWebHostEnvironment env
    )
    {
        services
            .AddAuthorizationBuilder()
            .AddPolicy(
                StudioOidcConstants.OrgAccessAuthorizationPolicy,
                policy =>
                {
                    policy.AuthenticationSchemes.Add(CookieAuthenticationDefaults.AuthenticationScheme);
                    policy.RequireAuthenticatedUser();
                    policy.Requirements.Add(new OrgAccessRequirement());
                }
            );

        services.AddScoped<IAuthorizationHandler, OrgAccessHandler>();

        return services.AddStudioOidcAuthentication(config, env);
    }
}
