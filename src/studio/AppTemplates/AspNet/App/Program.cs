using System;
using System.IO;
using System.Reflection;
using Altinn.App.Api.Controllers;
using Altinn.App.Api.Filters;
using Altinn.App.Api.Middleware;
using Altinn.App.Core.Health;
using Altinn.App.PlatformServices.Extensions;
using Altinn.App.Services.Interface;
using Altinn.Common.PEP.Authorization;
using Altinn.Common.PEP.Clients;
using AltinnCore.Authentication.JwtCookie;
using Microsoft.ApplicationInsights;
using Microsoft.ApplicationInsights.Extensibility;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Newtonsoft.Json.Linq;
using Swashbuckle.AspNetCore.SwaggerGen;

var builder = WebApplication.CreateBuilder(args);

ConfigureServices(builder.Services, builder.Configuration);

var app = builder.Build();

Configure();

app.Run();

void ConfigureServices(IServiceCollection services, IConfiguration config)
{
    // Add API controllers from Altinn.App.Api
    IMvcBuilder mvcBuilder = services.AddControllersWithViews();
    mvcBuilder
        .AddApplicationPart(typeof(InstancesController).Assembly)
        .AddXmlSerializerFormatters()
        .AddJsonOptions(options =>
        {
            options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        });
    services.AddMemoryCache();
    services.AddHealthChecks().AddCheck<HealthCheck>("default_health_check");

    // Dot net services
    services.AddSingleton<IAuthorizationHandler, AppAccessHandler>();
    services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();

    // HttpClients for platform functionality. Registered as HttpClients so default HttpClientFactory is used
    services.AddHttpClient<AuthorizationApiClient>();
    services.AddAppServices(config, builder.Environment);
    services.AddPlatformServices(config, builder.Environment);

    // Altinn App implementation service (The concrete implementation of logic from Application repository)
    services.AddTransient<IAltinnApp, Altinn.App.AppLogic.App>();

    services.Configure<KestrelServerOptions>(options =>
    {
        options.AllowSynchronousIO = true;
    });

    services.ConfigureDataProtection();

    services.AddAuthentication(JwtCookieDefaults.AuthenticationScheme)
        .AddJwtCookie(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                ValidateIssuer = false,
                ValidateAudience = false,
                RequireExpirationTime = true,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };
            options.JwtCookieName = Altinn.App.Services.Constants.General.RuntimeCookieName;
            options.MetadataAddress = config["AppSettings:OpenIdWellKnownEndpoint"];
            if (builder.Environment.IsDevelopment())
            {
                options.RequireHttpsMetadata = false;
            }
        });

    services.AddAuthorization(options =>
    {
        options.AddPolicy("InstanceRead", policy => policy.Requirements.Add(new AppAccessRequirement("read")));
        options.AddPolicy("InstanceWrite", policy => policy.Requirements.Add(new AppAccessRequirement("write")));
        options.AddPolicy("InstanceDelete", policy => policy.Requirements.Add(new AppAccessRequirement("delete")));
        options.AddPolicy("InstanceInstantiate", policy => policy.Requirements.Add(new AppAccessRequirement("instantiate")));
        options.AddPolicy("InstanceComplete", policy => policy.Requirements.Add(new AppAccessRequirement("complete")));
    });

    services.AddAntiforgery(options =>
    {
        // asp .net core expects two types of tokens: One that is attached to the request as header, and the other one as cookie.
        // The values of the tokens are not the same and both need to be present and valid in a "unsafe" request.

        // Axios which we are using for client-side automatically extracts the value from the cookie named XSRF-TOKEN. We are setting this cookie in the UserController.
        // We will therefore have two token cookies. One that contains the .net core cookie token; And one that is the request token and is added as a header in requests.
        // The tokens are based on the logged-in user and must be updated if the user changes.
        // https://docs.microsoft.com/en-us/aspnet/core/security/anti-request-forgery?view=aspnetcore-3.1
        // https://github.com/axios/axios/blob/master/lib/defaults.js
        options.Cookie.Name = "AS-XSRF-TOKEN";
        options.HeaderName = "X-XSRF-TOKEN";
    });

    services.TryAddSingleton<ValidateAntiforgeryTokenIfAuthCookieAuthorizationFilter>();

    // Add Swagger support (Swashbuckle)
    services.AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new OpenApiInfo { Title = "Altinn App Api", Version = "v1" });
        IncludeXmlComments(c);
    });
}

void Configure()
{
    if (app.Environment.IsDevelopment())
    {
        app.UseDeveloperExceptionPage();
    }

    string applicationId = GetApplicationId();
    if (!string.IsNullOrEmpty(applicationId))
    {
        app.UseSwagger(o => o.RouteTemplate = applicationId + "/swagger/{documentName}/swagger.json");

        app.UseSwaggerUI(c =>
        {
            c.SwaggerEndpoint($"/{applicationId}/swagger/v1/swagger.json", "Altinn App API");
            c.RoutePrefix = applicationId + "/swagger";
        });
    }

    app.UseDefaultSecurityHeaders();
    app.UseRouting();
    app.UseStaticFiles('/' + applicationId);
    app.UseAuthentication();
    app.UseAuthorization();

    app.UseEndpoints(endpoints =>
    {
        endpoints.MapControllers();
    });
    app.UseHealthChecks("/health");
}

void IncludeXmlComments(SwaggerGenOptions options)
{
    try
    {
        string fileName = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
        string fullFilePath = Path.Combine(AppContext.BaseDirectory, fileName);
        options.IncludeXmlComments(fullFilePath);
        string fullFilePathApi = Path.Combine(AppContext.BaseDirectory, "Altinn.App.Api.xml");
        options.IncludeXmlComments(fullFilePathApi);
    }
    catch
    {
        // Swagger will not have the xml-documentation to describe the api's.
    }
}

string GetApplicationId()
{
    string appMetaDataString = File.ReadAllText("config/applicationmetadata.json");
    JObject appMetadataJObject = JObject.Parse(appMetaDataString);
    return appMetadataJObject.SelectToken("id").Value<string>();
}
