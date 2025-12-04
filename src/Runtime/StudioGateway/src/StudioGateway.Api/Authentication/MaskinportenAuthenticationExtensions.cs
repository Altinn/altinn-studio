using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Primitives;
using Microsoft.IdentityModel.Tokens;

namespace StudioGateway.Api.Authentication;

internal static class MaskinportenAuthenticationExtensions
{
    private const string ScopeClaimType = "scope";

    public static WebApplicationBuilder AddMaskinportenAuthentication(this WebApplicationBuilder builder)
    {
        builder.Services.Configure<MaskinportenSettings>(builder.Configuration.GetSection("Maskinporten"));
        builder.Services.Configure<MaskinportenClientSettings>(
            builder.Configuration.GetSection("MaskinportenClientForDesigner")
        );

        var settings =
            builder.Configuration.GetSection("Maskinporten").Get<MaskinportenSettings>()
            ?? throw new InvalidOperationException("Maskinporten configuration section is required");

        if (settings.MetadataAddresses.Length == 0)
            throw new InvalidOperationException("Maskinporten:MetadataAddresses must contain at least one address");

        builder.Services.AddHttpClient();
        builder.Services.AddSingleton<IssuerSchemeCache>();
        builder.Services.AddHostedService<IssuerSchemeCacheInitializer>();

        builder.Services.AddSingleton<MaskinportenClient>();
        builder.Services.AddHostedService(sp => sp.GetRequiredService<MaskinportenClient>());

        var authBuilder = builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme);
        var schemeNames = new List<string>(settings.MetadataAddresses.Length);

        for (var i = 0; i < settings.MetadataAddresses.Length; i++)
        {
            var metadataAddress = settings.MetadataAddresses[i];
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

                    // Route to correct scheme based on token issuer to avoid validation attempts against wrong issuers
                    var defaultForwardSelector = options.ForwardDefaultSelector;
                    options.ForwardDefaultSelector = context =>
                    {
                        var issuerCache = context.RequestServices.GetRequiredService<IssuerSchemeCache>();
                        var tokenIssuer = ExtractIssuerFromToken(context.Request.Headers.Authorization);
                        if (tokenIssuer is not null && issuerCache.TryGetScheme(tokenIssuer, out var targetScheme))
                            return targetScheme;

                        if (defaultForwardSelector is not null)
                            return defaultForwardSelector(context);
                        return null;
                    };

                    options.Events = new JwtBearerEvents
                    {
                        OnAuthenticationFailed = context =>
                        {
                            var logger = context.HttpContext.RequestServices.GetRequiredService<
                                ILogger<JwtBearerHandler>
                            >();

                            var tokenInfo = ExtractTokenInfo(logger, context.Request.Headers.Authorization);

                            logger.LogWarning(
                                context.Exception,
                                "Authentication failed for scheme {Scheme}. TokenPresent={TokenPresent}, Issuer={Issuer}, ExpiresUtc={ExpiresUtc}, Exception={ExceptionType}: {ExceptionMessage}",
                                schemeName,
                                tokenInfo.TokenPresent,
                                tokenInfo.Issuer,
                                tokenInfo.ExpiresUtc,
                                context.Exception.GetType().Name,
                                context.Exception.Message
                            );

                            return Task.CompletedTask;
                        },
                        OnTokenValidated = context =>
                        {
                            var logger = context.HttpContext.RequestServices.GetRequiredService<
                                ILogger<JwtBearerHandler>
                            >();

                            var claims = context.Principal?.Claims;
                            var issuer = claims?.FirstOrDefault(c => c.Type == "iss")?.Value;
                            var scope = claims?.FirstOrDefault(c => c.Type == ScopeClaimType)?.Value;
                            var consumer = claims?.FirstOrDefault(c => c.Type == "consumer")?.Value;

                            logger.LogDebug(
                                "Token validated for scheme {Scheme}. Issuer={Issuer}, Scope={Scope}, Consumer={Consumer}",
                                schemeName,
                                issuer,
                                scope,
                                consumer
                            );

                            return Task.CompletedTask;
                        },
                        OnChallenge = context =>
                        {
                            var logger = context.HttpContext.RequestServices.GetRequiredService<
                                ILogger<JwtBearerHandler>
                            >();

                            var tokenInfo = ExtractTokenInfo(logger, context.Request.Headers.Authorization);

                            logger.LogInformation(
                                "Authentication challenge for scheme {Scheme}. TokenPresent={TokenPresent}, Issuer={Issuer}, Error={Error}, ErrorDescription={ErrorDescription}",
                                schemeName,
                                tokenInfo.TokenPresent,
                                tokenInfo.Issuer,
                                context.Error,
                                context.ErrorDescription
                            );

                            return Task.CompletedTask;
                        },
                        OnForbidden = context =>
                        {
                            var logger = context.HttpContext.RequestServices.GetRequiredService<
                                ILogger<JwtBearerHandler>
                            >();

                            var claims = context.Principal?.Claims;
                            var issuer = claims?.FirstOrDefault(c => c.Type == "iss")?.Value;
                            var scope = claims?.FirstOrDefault(c => c.Type == ScopeClaimType)?.Value;

                            logger.LogWarning(
                                "Authorization forbidden for scheme {Scheme}. Issuer={Issuer}, Scope={Scope}, RequiredScope={RequiredScope}",
                                schemeName,
                                issuer,
                                scope,
                                settings.RequiredScope
                            );

                            return Task.CompletedTask;
                        },
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
                        return scopes.Contains(settings.RequiredScope);
                    });
                }
            );

        return builder;
    }

    private static (bool TokenPresent, string? Issuer, DateTime? ExpiresUtc) ExtractTokenInfo(
        ILogger<JwtBearerHandler> logger,
        StringValues authorizationHeaderValues
    )
    {
        var headerValue = authorizationHeaderValues.Count == 0 ? "" : authorizationHeaderValues[0];
        if (string.IsNullOrEmpty(headerValue) || !headerValue.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return (false, null, null);

        var token = headerValue["Bearer ".Length..].Trim();
        if (string.IsNullOrEmpty(token))
            return (false, null, null);

        try
        {
            var handler = new JwtSecurityTokenHandler();
            if (handler.CanReadToken(token))
            {
                var jwt = handler.ReadJwtToken(token);
                return (true, jwt.Issuer, jwt.ValidTo == DateTime.MinValue ? null : jwt.ValidTo);
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to extract token info for logging purposes");
        }

        return (true, null, null);
    }

    private static string? ExtractIssuerFromToken(StringValues authorizationHeaderValues)
    {
        var headerValue = authorizationHeaderValues.Count == 0 ? null : authorizationHeaderValues[0];
        if (string.IsNullOrEmpty(headerValue) || !headerValue.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return null;

        var token = headerValue["Bearer ".Length..].Trim();
        if (string.IsNullOrEmpty(token))
            return null;

        var handler = new JwtSecurityTokenHandler();
        if (!handler.CanReadToken(token))
            return null;

        var jwt = handler.ReadJwtToken(token);
        return jwt.Issuer;
    }
}
