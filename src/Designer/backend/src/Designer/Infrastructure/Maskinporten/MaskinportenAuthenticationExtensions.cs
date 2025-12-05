using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Constants;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Primitives;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.Studio.Designer.Infrastructure.Maskinporten;

internal static class MaskinportenAuthenticationExtensions
{
    public static IServiceCollection AddMaskinportenAuthentication(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        bool featureEnabled = configuration
            .GetSection($"FeatureManagement:{StudioFeatureFlags.Maskinporten}")
            .Get<bool>();
        if (!featureEnabled)
        {
            services
                .AddAuthorizationBuilder()
                .AddPolicy(
                    MaskinportenConstants.AuthorizationPolicy,
                    policy => policy.RequireAssertion(_ => true)
                );
            return services;
        }

        string[]? metadataAddresses = configuration
            .GetSection("Maskinporten:MetadataAddresses")
            .Get<string[]>();

        if (metadataAddresses is null || metadataAddresses.Length == 0)
        {
            throw new InvalidOperationException(
                "Maskinporten:MetadataAddresses configuration is required and must contain at least one address"
            );
        }

        string? requiredScope = configuration.GetValue<string>("Maskinporten:RequiredScope");

        if (string.IsNullOrEmpty(requiredScope))
        {
            throw new InvalidOperationException(
                "Maskinporten:RequiredScope configuration is required"
            );
        }

        services.AddHttpClient();
        services.AddSingleton<IssuerSchemeCache>();
        services.AddHostedService<IssuerSchemeCacheInitializer>();

        var schemeNames = new List<string>(metadataAddresses.Length);

        for (int i = 0; i < metadataAddresses.Length; i++)
        {
            string metadataAddress = metadataAddresses[i];
            string schemeName = $"Maskinporten_{i}";
            schemeNames.Add(schemeName);

            bool requireHttpsMetadata = !metadataAddress.StartsWith(
                "http://",
                StringComparison.OrdinalIgnoreCase
            );

            services
                .AddAuthentication()
                .AddJwtBearer(
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
                            var issuerCache =
                                context.RequestServices.GetRequiredService<IssuerSchemeCache>();
                            string? tokenIssuer = ExtractIssuerFromToken(
                                context.Request.Headers.Authorization
                            );
                            if (
                                tokenIssuer is not null
                                && issuerCache.TryGetScheme(tokenIssuer, out string? targetScheme)
                            )
                            {
                                return targetScheme;
                            }

                            return defaultForwardSelector?.Invoke(context);
                        };

                        options.Events = CreateJwtBearerEvents(schemeName);
                    }
                );
        }

        string[] schemeNamesArray = schemeNames.ToArray();
        services
            .AddAuthorizationBuilder()
            .AddPolicy(
                MaskinportenConstants.AuthorizationPolicy,
                policy =>
                {
                    policy.AddAuthenticationSchemes(schemeNamesArray);
                    policy.RequireAuthenticatedUser();
                    policy.RequireAssertion(context =>
                    {
                        var scopeClaim = context.User.FindFirst(
                            MaskinportenConstants.ScopeClaimType
                        );
                        if (scopeClaim is null)
                        {
                            return false;
                        }

                        string[] scopes = scopeClaim.Value.Split(
                            ' ',
                            StringSplitOptions.RemoveEmptyEntries
                        );
                        return scopes.Contains(requiredScope);
                    });
                }
            );

        return services;
    }

    private static JwtBearerEvents CreateJwtBearerEvents(string schemeName)
    {
        return new JwtBearerEvents
        {
            OnAuthenticationFailed = context =>
            {
                ILogger<JwtBearerHandler> logger =
                    context.HttpContext.RequestServices.GetRequiredService<
                        ILogger<JwtBearerHandler>
                    >();

                (bool tokenPresent, string? issuer, DateTime? expiresUtc) = ExtractTokenInfo(
                    logger,
                    context.Request.Headers.Authorization
                );

                logger.LogWarning(
                    context.Exception,
                    "Maskinporten authentication failed for scheme {Scheme}. TokenPresent={TokenPresent}, Issuer={Issuer}, ExpiresUtc={ExpiresUtc}",
                    schemeName,
                    tokenPresent,
                    issuer,
                    expiresUtc
                );

                return Task.CompletedTask;
            },
            OnTokenValidated = context =>
            {
                ILogger<JwtBearerHandler> logger =
                    context.HttpContext.RequestServices.GetRequiredService<
                        ILogger<JwtBearerHandler>
                    >();

                var claims = context.Principal?.Claims;
                string? issuer = claims?.FirstOrDefault(c => c.Type == "iss")?.Value;
                string? scope = claims
                    ?.FirstOrDefault(c => c.Type == MaskinportenConstants.ScopeClaimType)
                    ?.Value;
                string? consumer = claims?.FirstOrDefault(c => c.Type == "consumer")?.Value;

                logger.LogDebug(
                    "Maskinporten token validated for scheme {Scheme}. Issuer={Issuer}, Scope={Scope}, Consumer={Consumer}",
                    schemeName,
                    issuer,
                    scope,
                    consumer
                );

                return Task.CompletedTask;
            },
            OnChallenge = context =>
            {
                ILogger<JwtBearerHandler> logger =
                    context.HttpContext.RequestServices.GetRequiredService<
                        ILogger<JwtBearerHandler>
                    >();

                (bool tokenPresent, string? issuer, _) = ExtractTokenInfo(
                    logger,
                    context.Request.Headers.Authorization
                );

                logger.LogInformation(
                    "Maskinporten authentication challenge for scheme {Scheme}. TokenPresent={TokenPresent}, Issuer={Issuer}, Error={Error}, ErrorDescription={ErrorDescription}",
                    schemeName,
                    tokenPresent,
                    issuer,
                    context.Error,
                    context.ErrorDescription
                );

                return Task.CompletedTask;
            },
            OnForbidden = context =>
            {
                ILogger<JwtBearerHandler> logger =
                    context.HttpContext.RequestServices.GetRequiredService<
                        ILogger<JwtBearerHandler>
                    >();

                var claims = context.Principal?.Claims;
                string? issuer = claims?.FirstOrDefault(c => c.Type == "iss")?.Value;
                string? scope = claims
                    ?.FirstOrDefault(c => c.Type == MaskinportenConstants.ScopeClaimType)
                    ?.Value;

                logger.LogWarning(
                    "Maskinporten authorization forbidden for scheme {Scheme}. Issuer={Issuer}, Scope={Scope}",
                    schemeName,
                    issuer,
                    scope
                );

                return Task.CompletedTask;
            },
        };
    }

    private static (bool TokenPresent, string? Issuer, DateTime? ExpiresUtc) ExtractTokenInfo(
        ILogger logger,
        StringValues authorizationHeaderValues
    )
    {
        string headerValue =
            authorizationHeaderValues.Count == 0 ? "" : authorizationHeaderValues[0] ?? "";
        if (
            string.IsNullOrEmpty(headerValue)
            || !headerValue.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
        )
        {
            return (false, null, null);
        }

        string token = headerValue["Bearer ".Length..].Trim();
        if (string.IsNullOrEmpty(token))
        {
            return (false, null, null);
        }

        try
        {
            var handler = new JwtSecurityTokenHandler();
            if (handler.CanReadToken(token))
            {
                JwtSecurityToken jwt = handler.ReadJwtToken(token);
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
        string headerValue =
            authorizationHeaderValues.Count == 0 ? "" : authorizationHeaderValues[0] ?? "";
        if (
            string.IsNullOrEmpty(headerValue)
            || !headerValue.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
        )
        {
            return null;
        }

        string token = headerValue["Bearer ".Length..].Trim();
        if (string.IsNullOrEmpty(token))
        {
            return null;
        }

        var handler = new JwtSecurityTokenHandler();
        if (!handler.CanReadToken(token))
        {
            return null;
        }

        JwtSecurityToken jwt = handler.ReadJwtToken(token);
        return jwt.Issuer;
    }
}
