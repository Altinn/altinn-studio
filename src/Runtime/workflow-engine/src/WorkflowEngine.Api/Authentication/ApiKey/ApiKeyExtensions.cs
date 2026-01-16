using Microsoft.AspNetCore.Authentication;

namespace WorkflowEngine.Api.Authentication.ApiKey;

internal static class ApiKeyExtensions
{
    extension(IServiceCollection services)
    {
        /// <summary>
        /// Adds API key authentication and policy to the runtime.
        /// </summary>
        public IServiceCollection AddApiKeyAuthentication()
        {
            services
                .AddAuthentication()
                .AddScheme<AuthenticationSchemeOptions, ApiKeyAuthenticationHandler>(
                    ApiKeyAuthenticationHandler.SchemeName,
                    null
                );

            services
                .AddAuthorizationBuilder()
                .AddDefaultPolicy(
                    ApiKeyAuthenticationHandler.PolicyName,
                    policy =>
                    {
                        policy.AddAuthenticationSchemes(ApiKeyAuthenticationHandler.SchemeName);
                        policy.RequireAuthenticatedUser();
                    }
                );

            return services;
        }
    }

    extension(RouteHandlerBuilder builder)
    {
        /// <summary>
        /// Requires API key authentication for the specified endpoint
        /// </summary>
        public RouteHandlerBuilder RequireApiKeyAuthorization() =>
            builder
                .RequireAuthorization(ApiKeyAuthenticationHandler.PolicyName)
                .Produces(StatusCodes.Status401Unauthorized)
                .Produces(StatusCodes.Status403Forbidden)
                .WithTags(ApiKeyAuthenticationHandler.SchemeName);
    }
}
