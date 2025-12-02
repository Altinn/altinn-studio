using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace StudioGateway.Api.Authentication;

internal static class MaskinportenAuthExtensions
{
    public const string RequiredScope = "altinn:studio-gateway";
    public const string ScopeClaimType = "scope";

    public static WebApplicationBuilder AddMaskinportenAuthentication(this WebApplicationBuilder builder)
    {
        var metadataAddresses =
            builder.Configuration.GetSection("Maskinporten:MetadataAddresses").Get<string[]>()
            ?? throw new InvalidOperationException("Maskinporten:MetadataAddresses configuration is required");

        if (metadataAddresses.Length == 0)
            throw new InvalidOperationException("Maskinporten:MetadataAddresses must contain at least one address");

        var authBuilder = builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme);
        var schemeNames = new List<string>(metadataAddresses.Length);

        for (var i = 0; i < metadataAddresses.Length; i++)
        {
            var metadataAddress = metadataAddresses[i];
            var schemeName = $"Maskinporten_{i}";
            schemeNames.Add(schemeName);

            var requireHttpsMetadata = !metadataAddress.StartsWith("http://", StringComparison.OrdinalIgnoreCase);

            authBuilder.AddJwtBearer(
                schemeName,
                options =>
                {
                    options.MetadataAddress = metadataAddress;
                    options.RequireHttpsMetadata = requireHttpsMetadata;
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
                }
            );
        }

        // Authorization policy tries all schemes - if any succeeds, user is authenticated
        var schemeNamesArray = schemeNames.ToArray();
        builder
            .Services.AddAuthorizationBuilder()
            .AddPolicy(
                "MaskinportenScope",
                policy =>
                {
                    policy.AddAuthenticationSchemes(schemeNamesArray);
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
