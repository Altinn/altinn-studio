using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace StudioGateway.Api.Authentication;

internal static class MaskinportenAuthExtensions
{
    public const string RequiredScope = "altinn:studio-gateway";
    public const string ScopeClaimType = "scope";

    public static WebApplicationBuilder AddMaskinportenAuthentication(this WebApplicationBuilder builder)
    {
        var metadataAddress =
            builder.Configuration["Maskinporten:MetadataAddress"]
            ?? throw new InvalidOperationException("Maskinporten:MetadataAddress configuration is required");

        builder
            .Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.MetadataAddress = metadataAddress;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
#pragma warning disable CA5404 // Maskinporten tokens don't include audience claim
                    ValidateAudience = false,
#pragma warning restore CA5404
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ClockSkew = TimeSpan.FromSeconds(30),
                };
            });

        builder
            .Services.AddAuthorizationBuilder()
            .AddPolicy(
                "MaskinportenScope",
                policy =>
                {
                    policy.RequireAuthenticatedUser();
                    policy.RequireAssertion(context =>
                    {
                        var scopeClaim = context.User.FindFirst(ScopeClaimType);
                        if (scopeClaim is null)
                            return false;

                        var scopes = scopeClaim.Value.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                        return scopes.Contains(RequiredScope);
                    });
                }
            );

        return builder;
    }
}
