using System;
using System.Collections.Specialized;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Helpers;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;

namespace Altinn.Studio.Designer.Infrastructure.StudioOidc;

public static class StudioOidcAuthenticationExtensions
{
    private const string OidcCallbackPath = "/studio-oidc-signin";
    private const string LoginPath = "/Login";

    public static IServiceCollection AddStudioOidcAuthentication(
        this IServiceCollection services,
        IConfiguration configuration,
        IWebHostEnvironment env)
    {
        bool featureEnabled = configuration
            .GetSection($"FeatureManagement:{StudioFeatureFlags.StudioOidc}")
            .Get<bool?>() ?? false;

        if (!featureEnabled)
        {
            return services;
        }

        StudioOidcLoginSettings? oidcSettings = FetchOidcSettingsFromConfiguration(configuration, env);

        if (oidcSettings == null)
        {
            return services;
        }

        services
            .AddAuthentication(options =>
            {
                options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = OpenIdConnectDefaults.AuthenticationScheme;
            })
            .AddCookie(CookieAuthenticationDefaults.AuthenticationScheme, options =>
            {
                options.Cookie.HttpOnly = true;
                options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
                options.Cookie.SameSite = SameSiteMode.Lax;
                options.Cookie.IsEssential = true;

                options.ExpireTimeSpan = TimeSpan.FromMinutes(oidcSettings.CookieExpiryTimeInMinutes);
                options.SlidingExpiration = false;

                options.Cookie.Name = General.DesignerCookieName;

                options.Events.OnRedirectToAccessDenied = context =>
                {
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    return Task.CompletedTask;
                };
            })
            .AddOpenIdConnect(OpenIdConnectDefaults.AuthenticationScheme, options =>
            {
                options.Authority = oidcSettings.Authority;
                options.ClientId = oidcSettings.ClientId;
                options.ClientSecret = oidcSettings.ClientSecret;

                options.ResponseType = OpenIdConnectResponseType.Code;
                options.SignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;
                options.AuthenticationMethod = OpenIdConnectRedirectBehavior.RedirectGet;

                options.Scope.Clear();
                foreach (string scope in oidcSettings.Scopes)
                {
                    options.Scope.Add(scope);
                }

                options.CallbackPath = OidcCallbackPath;

                // Temporarily disabled to support the same client that Gitea uses
                options.UsePkce = false;
                // Temporarily disabled to support the same client that Gitea uses
                options.PushedAuthorizationBehavior = PushedAuthorizationBehavior.Disable;
                options.GetClaimsFromUserInfoEndpoint = true;
                options.SaveTokens = true;
                options.MapInboundClaims = false;
                options.RequireHttpsMetadata = oidcSettings.RequireHttpsMetadata;

                options.ClaimActions.MapJsonKey("pid", "pid");
                options.ClaimActions.MapJsonKey("sub", "sub");
                options.ClaimActions.MapJsonKey("given_name", "given_name");
                options.ClaimActions.MapJsonKey("family_name", "family_name");

                options.Events.OnRedirectToIdentityProvider = context =>
                {
                    if (!context.Request.Path.StartsWithSegments(LoginPath))
                    {
                        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                        context.HandleResponse();
                        return Task.CompletedTask;
                    }

                    if (!string.IsNullOrWhiteSpace(oidcSettings.AcrValues))
                    {
                        context.ProtocolMessage.SetParameters(
                            new NameValueCollection
                            {
                                ["acr_values"] = oidcSettings.AcrValues
                            });
                    }

                    return Task.CompletedTask;
                };

                // Temporarily using client_secret_basic (Authorization header) instead of client_secret_post to support the same client that Gitea uses
                options.Events.OnAuthorizationCodeReceived = context =>
                {
                    var credentials = Convert.ToBase64String(
                        System.Text.Encoding.UTF8.GetBytes($"{oidcSettings.ClientId}:{oidcSettings.ClientSecret}"));
                    context.Backchannel.DefaultRequestHeaders.Authorization =
                        new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", credentials);
                    if (context.TokenEndpointRequest != null)
                    {
                        context.TokenEndpointRequest.ClientSecret = null;
                    }
                    return Task.CompletedTask;
                };

            });

        return services;
    }

    private static StudioOidcLoginSettings? FetchOidcSettingsFromConfiguration(
        IConfiguration configuration,
        IWebHostEnvironment env)
    {
        var oidcSettings = configuration
            .GetSection(nameof(StudioOidcLoginSettings))
            .Get<StudioOidcLoginSettings>();

        if (oidcSettings == null)
        {
            return null;
        }

        if (!string.IsNullOrWhiteSpace(oidcSettings.ClientId) &&
            !string.IsNullOrWhiteSpace(oidcSettings.ClientSecret))
        {
            return oidcSettings;
        }

        if (env.IsDevelopment() && oidcSettings.FetchClientIdAndSecretFromRootEnvFile)
        {
            TryGetClientSecretFromRootDotEnvFile(out string? clientId, out string? clientSecret);
            oidcSettings.ClientId = clientId;
            oidcSettings.ClientSecret = clientSecret;
        }

        if (string.IsNullOrWhiteSpace(oidcSettings.ClientId) ||
            string.IsNullOrWhiteSpace(oidcSettings.ClientSecret))
        {
            throw new ArgumentException("ClientId or ClientSecret is missing in the configuration");
        }

        return oidcSettings;
    }

    private static void TryGetClientSecretFromRootDotEnvFile(out string? clientId, out string? clientSecret)
    {
        var keys = DotNetEnv.Env.Load(
            AltinnStudioRepositoryScanner.FindDotEnvFilePath(),
            new DotNetEnv.LoadOptions(false, false, false)).ToList();

        clientId = keys.FirstOrDefault(k => k.Key == "STUDIO_OIDC_CLIENT_ID").Value;
        clientSecret = keys.FirstOrDefault(k => k.Key == "STUDIO_OIDC_CLIENT_SECRET").Value;
    }
}
