using Altinn.Studio.Designer.ModelBinding.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Studio.Designer.Infrastructure.Authorization
{
    /// <summary>
    /// Contains extension methods for authorization
    /// </summary>
    public static class AuthorizationConfiguration
    {
        /// <summary>
        /// Adds authorization and policies to the application
        /// </summary>
        /// <param name="services">IServiceCollection</param>
        public static IServiceCollection AddPolicyBasedAuthorization(this IServiceCollection services)
        {
            services.AddAuthorization(options =>
            {
                options.AddPolicy(
                    AltinnPolicy.MustHaveGiteaPushPermission,
                    policy =>
                    {
                        policy.RequireAuthenticatedUser();
                        policy.Requirements.Add(new GiteaPushPermissionRequirement());
                    });

                options.AddPolicy(
                    AltinnPolicy.MustHaveGiteaDeployPermission,
                    policy =>
                    {
                        policy.RequireAuthenticatedUser();
                        policy.Requirements.Add(new GiteaDeployPermissionRequirement());
                    });

                options.AddPolicy(
                    AltinnPolicy.MustHaveGiteaPublishResourcePermission,
                    policy =>
                    {
                        policy.RequireAuthenticatedUser();
                        policy.Requirements.Add(new GiteaPublishResourcePermissionRequirement());
                    });

                options.AddPolicy(
                    AltinnPolicy.MustHaveGiteaResourceAccessListPermission,
                    policy =>
                    {
                        policy.RequireAuthenticatedUser();
                        policy.Requirements.Add(new GiteaResourceAccessListPermissionRequirement());
                    });

                options.AddPolicy(AltinnPolicy.MustBelongToOrganization, policy =>
                {
                    policy.RequireAuthenticatedUser();
                    policy.Requirements.Add(new BelongsToOrganizationRequirement());
                });
            });

            services.AddScoped<IAuthorizationHandler, GiteaPushPermissionHandler>();
            services.AddScoped<IAuthorizationHandler, GiteaDeployPermissionHandler>();
            services.AddScoped<IAuthorizationHandler, GiteaPublishResourcePermissionHandler>();
            services.AddScoped<IAuthorizationHandler, GiteaResourceAccessListPermissionHandler>();
            services.AddScoped<IAuthorizationHandler, BelongsToOrganizationHandler>();

            return services;
        }
    }
}
