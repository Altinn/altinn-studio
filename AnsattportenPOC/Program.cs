using AnsattportenPOC;
using Duende.AccessTokenManagement.OpenIdConnect;
using IdentityModel;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;

// The following ENV VARS must be available at runtime
// Config__OidcClientId
// Config__OidcClientSecret

// Load vars from root level .env file:
DotNetEnv.Env.TraversePath().Load();

// Configure application
var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration.GetSection("Config").Get<ServiceConfig>();

// Add services
builder.Services.AddRazorPages();

builder.Services.AddAuthentication(ServiceConstants.CookieScheme).AddCookie();
builder
    .Services.AddAuthentication()
    .AddOpenIdConnect(
        ServiceConstants.AnsattportenAuthenticationScheme,
        options =>
        {
            options.Authority = config.OidcAuthority;
            options.ClientId = config.OidcClientId;
            options.ClientSecret = config.OidcClientSecret;

            options.ResponseType = OidcConstants.ResponseTypes.Code;
            options.SignInScheme = ServiceConstants.CookieScheme;
            options.AuthenticationMethod = Microsoft
                .AspNetCore
                .Authentication
                .OpenIdConnect
                .OpenIdConnectRedirectBehavior
                .RedirectGet;

            options.Scope.Clear();
            foreach (var scope in config.OidcScopes)
            {
                options.Scope.Add(scope);
            }

            options.UsePkce = true;
            options.GetClaimsFromUserInfoEndpoint = true;
            options.SaveTokens = true;
            options.MapInboundClaims = false;

            options.Events.OnRedirectToIdentityProvider = context =>
            {
                context.ProtocolMessage.SetParameters(
                    new System.Collections.Specialized.NameValueCollection
                    {
                        [ServiceConstants.RequestParams.AuthorizationDetails] = config.FormatAuthorizationDetails(),
                        [ServiceConstants.RequestParams.AcrValues] = config.AcrValues
                    }
                );
                return Task.CompletedTask;
            };
        }
    );

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(
        ServiceConstants.AnsattportenAuthorizationPolicy,
        policy =>
        {
            policy.AuthenticationSchemes.Add(ServiceConstants.AnsattportenAuthenticationScheme);
            policy.RequireAuthenticatedUser();
        }
    );
});

builder.Services.AddOpenIdConnectAccessTokenManagement();
builder
    .Services.AddHttpClient<MaskinportenIntegrationsClient>(client =>
    {
        client.BaseAddress = new Uri(config.MaskinportenApiUri);
    })
    .AddUserAccessTokenHandler(
        new UserTokenRequestParameters
        {
            SignInScheme = ServiceConstants.CookieScheme,
            ChallengeScheme = ServiceConstants.AnsattportenAuthenticationScheme
        }
    );

builder.Services.AddRazorPages(options =>
{
    options.Conventions.AuthorizePage("/Protected", ServiceConstants.AnsattportenAuthorizationPolicy);
});

// Configure pipelines
var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();
app.MapGet(
    "/Logout",
    async context =>
    {
        await context.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        await context.SignOutAsync(ServiceConstants.AnsattportenAuthenticationScheme);
        // context.Response.Redirect("/");
    }
);

app.UseAuthorization();
app.UseAuthentication();
app.MapRazorPages();

app.Run();
