#nullable disable
using System;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Constants;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;

namespace Altinn.Studio.Designer.Infrastructure.AnsattPorten;

public static class AnsattPortenExtensions
{
    public static IServiceCollection AddAnsattPortenAuthenticationAndAuthorization(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddAnsattPortenAuthentication(configuration);
        services.AddAnsattPortenAuthorization(configuration);
        return services;
    }
    private static IServiceCollection AddAnsattPortenAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        bool ansattPortenFeatureFlag = configuration.GetSection($"FeatureManagement:{StudioFeatureFlags.AnsattPorten}").Get<bool>();
        if (!ansattPortenFeatureFlag)
        {
            return services;
        }

        AnsattPortenLoginSettings oidcSettings = configuration.GetSection(nameof(AnsattPortenLoginSettings)).Get<AnsattPortenLoginSettings>();

        services
            .AddAuthentication(AnsattPortenConstants.AnsattpotenCookiesAuthenticationScheme)
            .AddCookie(AnsattPortenConstants.AnsattpotenCookiesAuthenticationScheme, options =>
            {
                options.Cookie.HttpOnly = true;
                options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
                options.Cookie.SameSite = SameSiteMode.Lax;
                options.Cookie.IsEssential = true;

                options.ExpireTimeSpan = TimeSpan.FromMinutes(oidcSettings.CookieExpiryTimeInMinutes);
                options.SlidingExpiration = true;

                options.Events.OnRedirectToAccessDenied = context =>
                {
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    return Task.CompletedTask;
                };
            })
            .AddOpenIdConnect(AnsattPortenConstants.AnsattportenAuthenticationScheme,
                options =>
                {
                    options.Authority = oidcSettings.Authority;
                    options.ClientId = oidcSettings.ClientId;
                    options.ClientSecret = oidcSettings.ClientSecret;

                    options.ResponseType = OpenIdConnectResponseType.Code;
                    options.SignInScheme = AnsattPortenConstants.AnsattpotenCookiesAuthenticationScheme;
                    options.AuthenticationMethod = OpenIdConnectRedirectBehavior.RedirectGet;

                    options.Scope.Clear();
                    foreach (string scope in oidcSettings.Scopes)
                    {
                        options.Scope.Add(scope);
                    }

                    options.CallbackPath = "/ansattporten-signin-oidc";

                    options.UsePkce = true;
                    options.GetClaimsFromUserInfoEndpoint = true;
                    options.SaveTokens = true;
                    options.MapInboundClaims = false;
                    options.RequireHttpsMetadata = true;

                    options.Events.OnRedirectToIdentityProvider = context =>
                    {

                        if (!context.Request.Path.StartsWithSegments("/designer/api/ansattporten/login"))
                        {
                            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                            context.HandleResponse();
                        }

                        if (oidcSettings.AuthorizationDetails is not null)
                        {
                            context.ProtocolMessage.SetParameters(
                                new System.Collections.Specialized.NameValueCollection
                                {
                                    ["authorization_details"] = JsonSerializer.Serialize(oidcSettings.AuthorizationDetails, new JsonSerializerOptions()
                                    {
                                        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                                    }),
                                    ["acr_values"] = oidcSettings.AcrValues
                                }
                            );
                        }

                        return Task.CompletedTask;
                    };
                });

        return services;
    }

    private static IServiceCollection AddAnsattPortenAuthorization(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddAuthorizationBuilder()
            .AddPolicy(AnsattPortenConstants.AnsattportenAuthorizationPolicy, policy =>
                {
                    policy.AuthenticationSchemes.Add(AnsattPortenConstants.AnsattportenAuthenticationScheme);
                    policy.RequireAuthenticatedUser();
                }
            );
        return services;
    }
}

