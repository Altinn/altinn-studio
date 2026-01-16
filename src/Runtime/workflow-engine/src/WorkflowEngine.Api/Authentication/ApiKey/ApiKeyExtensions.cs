using Microsoft.AspNetCore.Authentication;

namespace WorkflowEngine.Api.Authentication.ApiKey;

internal static class ApiKeyExtensions
{
    public const string ApiKeyMetadataMarker = "@requires-api-key";

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
        /// Requires API key authentication for the specified endpoint.
        /// </summary>
        public RouteHandlerBuilder RequireApiKeyAuthorization() =>
            builder
                .RequireAuthorization(ApiKeyAuthenticationHandler.PolicyName)
                .Produces(StatusCodes.Status401Unauthorized)
                .Produces(StatusCodes.Status403Forbidden)
                .WithMetadata(ApiKeyMetadataMarker); // This doesn't seem to work...
    }

    extension(RouteGroupBuilder group)
    {
        /// <summary>
        /// Requires API key authentication for all endpoints in the group.
        /// </summary>
        public RouteGroupBuilder RequireApiKeyAuthorization() =>
            group
                .RequireAuthorization(ApiKeyAuthenticationHandler.PolicyName)
                .Produces(StatusCodes.Status401Unauthorized)
                .Produces(StatusCodes.Status403Forbidden)
                .WithMetadata(ApiKeyMetadataMarker); // This doesn't seem to work...

        private RouteGroupBuilder Produces(int statusCode) =>
            group.WithMetadata(new ProducesResponseTypeMetadata(statusCode, typeof(void)));
    }
}
