using System;
using System.Collections.Generic;
using System.Collections.Specialized;
using System.Diagnostics;
using System.Globalization;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Infrastructure.ApiKeyAuth;
using Altinn.Studio.Designer.Telemetry;
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
        IWebHostEnvironment env
    )
    {
        bool featureEnabled =
            configuration.GetSection($"FeatureManagement:{StudioFeatureFlags.StudioOidc}").Get<bool?>() ?? false;

        if (!featureEnabled)
        {
            return services;
        }

        StudioOidcLoginSettings? oidcSettings = FetchOidcSettingsFromConfiguration(configuration, env);

        if (oidcSettings == null)
        {
            return services;
        }

        const string DynamicScheme = "DynamicScheme";

        services
            .AddAuthentication(options =>
            {
                options.DefaultScheme = DynamicScheme;
                options.DefaultChallengeScheme = OpenIdConnectDefaults.AuthenticationScheme;
            })
            .AddPolicyScheme(
                DynamicScheme,
                "Dynamic Auth",
                options =>
                {
                    options.ForwardDefaultSelector = context =>
                        context.Request.Headers.ContainsKey(ApiKeyAuthenticationDefaults.HeaderName)
                            ? ApiKeyAuthenticationDefaults.AuthenticationScheme
                            : CookieAuthenticationDefaults.AuthenticationScheme;
                }
            )
            .AddScheme<AuthenticationSchemeOptions, ApiKeyAuthenticationHandler>(
                ApiKeyAuthenticationDefaults.AuthenticationScheme,
                null
            )
            .AddCookie(
                CookieAuthenticationDefaults.AuthenticationScheme,
                options =>
                {
                    options.Cookie.HttpOnly = true;
                    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
                    options.Cookie.SameSite = SameSiteMode.Lax;
                    options.Cookie.IsEssential = true;

                    options.ExpireTimeSpan = TimeSpan.FromMinutes(oidcSettings.CookieExpiryTimeInMinutes);
                    options.SlidingExpiration = true;

                    options.Cookie.Name = General.DesignerCookieName;

                    options.Events.OnRedirectToAccessDenied = context =>
                    {
                        context.Response.StatusCode = StatusCodes.Status403Forbidden;
                        return Task.CompletedTask;
                    };

                    options.Events.OnValidatePrincipal = context => RefreshAccessTokenIfExpired(context, oidcSettings);
                }
            )
            .AddOpenIdConnect(
                OpenIdConnectDefaults.AuthenticationScheme,
                options =>
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
                                new NameValueCollection { ["acr_values"] = oidcSettings.AcrValues }
                            );
                        }

                        return Task.CompletedTask;
                    };

                    // Temporarily using client_secret_basic (Authorization header) instead of client_secret_post to support the same client that Gitea uses
                    options.Events.OnAuthorizationCodeReceived = context =>
                    {
                        var credentials = Convert.ToBase64String(
                            System.Text.Encoding.UTF8.GetBytes($"{oidcSettings.ClientId}:{oidcSettings.ClientSecret}")
                        );
                        context.Backchannel.DefaultRequestHeaders.Authorization =
                            new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", credentials);
                        if (context.TokenEndpointRequest != null)
                        {
                            context.TokenEndpointRequest.ClientSecret = null;
                        }
                        return Task.CompletedTask;
                    };
                }
            );

        return services;
    }

    private static StudioOidcLoginSettings? FetchOidcSettingsFromConfiguration(
        IConfiguration configuration,
        IWebHostEnvironment env
    )
    {
        var oidcSettings = configuration.GetSection(nameof(StudioOidcLoginSettings)).Get<StudioOidcLoginSettings>();

        if (oidcSettings == null)
        {
            return null;
        }

        if (!string.IsNullOrWhiteSpace(oidcSettings.ClientId) && !string.IsNullOrWhiteSpace(oidcSettings.ClientSecret))
        {
            return oidcSettings;
        }

        if (env.IsDevelopment() && oidcSettings.FetchClientIdAndSecretFromRootEnvFile)
        {
            TryGetClientSecretFromRootDotEnvFile(out string? clientId, out string? clientSecret);
            oidcSettings.ClientId = clientId;
            oidcSettings.ClientSecret = clientSecret;
        }

        if (string.IsNullOrWhiteSpace(oidcSettings.ClientId) || string.IsNullOrWhiteSpace(oidcSettings.ClientSecret))
        {
            throw new ArgumentException("ClientId or ClientSecret is missing in the configuration");
        }

        return oidcSettings;
    }

    private static void TryGetClientSecretFromRootDotEnvFile(out string? clientId, out string? clientSecret)
    {
        var keys = DotNetEnv
            .Env.Load(
                AltinnStudioRepositoryScanner.FindDotEnvFilePath(),
                new DotNetEnv.LoadOptions(false, false, false)
            )
            .ToList();

        clientId = keys.FirstOrDefault(k => k.Key == "STUDIO_OIDC_CLIENT_ID").Value;
        clientSecret = keys.FirstOrDefault(k => k.Key == "STUDIO_OIDC_CLIENT_SECRET").Value;
    }

    private static async Task RefreshAccessTokenIfExpired(
        CookieValidatePrincipalContext context,
        StudioOidcLoginSettings oidcSettings
    )
    {
        AuthenticationProperties properties = context.Properties;
        string? expiresAtValue = properties.GetTokenValue("expires_at");

        if (string.IsNullOrEmpty(expiresAtValue))
        {
            return;
        }

        if (
            !DateTimeOffset.TryParse(
                expiresAtValue,
                CultureInfo.InvariantCulture,
                DateTimeStyles.RoundtripKind,
                out var expiresAt
            )
        )
        {
            return;
        }

        var timeProvider = context.HttpContext.RequestServices.GetRequiredService<TimeProvider>();

        const int RefreshBufferSeconds = 60;
        if (timeProvider.GetUtcNow() < expiresAt.AddSeconds(-RefreshBufferSeconds))
        {
            return;
        }

        string? refreshToken = properties.GetTokenValue("refresh_token");
        if (string.IsNullOrEmpty(refreshToken))
        {
            context.RejectPrincipal();
            return;
        }

        using var activity = ServiceTelemetry.Source.StartActivity("oidc.token_refresh");
        activity?.SetTag("auth.authority", oidcSettings.Authority);
        activity?.SetTag("auth.previous_expires_at", expiresAtValue);
        activity.SetAlwaysSample();

        try
        {
            using var httpClient = new HttpClient();

            string credentials = Convert.ToBase64String(
                Encoding.UTF8.GetBytes($"{oidcSettings.ClientId}:{oidcSettings.ClientSecret}")
            );
            httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", credentials);

            string discoveryUrl = $"{oidcSettings.Authority.TrimEnd('/')}/.well-known/openid-configuration";
            string discoveryJson = await httpClient.GetStringAsync(discoveryUrl);
            using var discoveryDoc = JsonDocument.Parse(discoveryJson);
            string tokenUrl = discoveryDoc.RootElement.GetProperty("token_endpoint").GetString()!;

            activity?.SetTag("auth.token_endpoint", tokenUrl);

            var requestContent = new FormUrlEncodedContent(
                new Dictionary<string, string> { ["grant_type"] = "refresh_token", ["refresh_token"] = refreshToken }
            );

            var response = await httpClient.PostAsync(tokenUrl, requestContent);

            activity?.SetTag("auth.refresh_status_code", (int)response.StatusCode);

            if (!response.IsSuccessStatusCode)
            {
                activity?.SetStatus(ActivityStatusCode.Error, $"Refresh failed: {response.StatusCode}");
                context.RejectPrincipal();
                return;
            }

            string responseBody = await response.Content.ReadAsStringAsync();
            using var tokenResponse = JsonDocument.Parse(responseBody);
            var root = tokenResponse.RootElement;

            string newAccessToken = root.GetProperty("access_token").GetString()!;
            int expiresIn = root.GetProperty("expires_in").GetInt32();
            bool newRefreshTokenIssued = root.TryGetProperty("refresh_token", out var rt);
            string resolvedRefreshToken = newRefreshTokenIssued ? rt.GetString()! : refreshToken;

            var newExpiresAt = timeProvider
                .GetUtcNow()
                .AddSeconds(expiresIn)
                .ToString("o", CultureInfo.InvariantCulture);

            properties.StoreTokens([
                new AuthenticationToken { Name = "access_token", Value = newAccessToken },
                new AuthenticationToken { Name = "refresh_token", Value = resolvedRefreshToken },
                new AuthenticationToken { Name = "expires_at", Value = newExpiresAt },
            ]);

            context.ShouldRenew = true;

            activity?.SetTag("auth.new_expires_at", newExpiresAt);
            activity?.SetTag("auth.new_refresh_token_issued", newRefreshTokenIssued);
            activity?.SetStatus(ActivityStatusCode.Ok);
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.AddEvent(
                new ActivityEvent(
                    "token_refresh_exception",
                    tags: new ActivityTagsCollection { { "exception.message", ex.Message } }
                )
            );
            context.RejectPrincipal();
        }
    }
}
