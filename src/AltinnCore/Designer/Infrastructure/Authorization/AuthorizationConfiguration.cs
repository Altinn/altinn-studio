using AltinnCore.Designer.ModelBinding.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.DependencyInjection;

namespace AltinnCore.Designer.Infrastructure.Authorization
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
            });
            services.AddScoped<IAuthorizationHandler, GiteaPushPermissionHandler>();

            return services;
        }
    }
}
