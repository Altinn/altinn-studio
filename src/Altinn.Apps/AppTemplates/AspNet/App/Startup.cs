using System;

using Altinn.App.Api.Controllers;
using Altinn.App.Api.Filters;
using Altinn.App.PlatformServices.Extensions;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Implementation;
using Altinn.App.Services.Interface;
using Altinn.Common.AccessTokenClient.Configuration;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Common.PEP.Authorization;
using Altinn.Common.PEP.Clients;
using Altinn.Common.PEP.Implementation;
using Altinn.Common.PEP.Interfaces;
using AltinnCore.Authentication.JwtCookie;

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

namespace Altinn.App
{
    public class Startup
    {
        private readonly IWebHostEnvironment _env;

        public Startup(IConfiguration configuration, IWebHostEnvironment env)
        {
            Configuration = configuration;
            _env = env;
        }

        public IConfiguration Configuration { get; }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            // Add API controllers from Altinn.App.Api
            services.AddControllersWithViews().AddApplicationPart(typeof(InstancesController).Assembly).AddXmlSerializerFormatters()
            .AddJsonOptions(options =>
            {
                // Use camel casing.
                options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
            });
            services.AddMemoryCache();

            // Dot net services
            services.AddSingleton<IAuthorizationHandler, AppAccessHandler>();
            services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();

            // Internal Application services
            services.AddSingleton<IAppResources, AppResourcesSI>();

            // Services for Altinn Platform components
            services.AddTransient<IPDP, PDPAppSI>();
            services.AddTransient<IValidation, ValidationAppSI>();
            services.AddTransient<IPrefill, PrefillSI>();
            services.AddTransient<IAccessTokenGenerator, AccessTokenGenerator>();
            services.AddTransient<ISigningCredentialsResolver, SigningCredentialsResolver>();

            // HttpClients for platform functionality. Registred as httpclients so default httpclientfactory is used
            services.AddHttpClient<AuthorizationApiClient>();
            services.AddHttpClient<IApplication, ApplicationAppSI>();
            services.AddHttpClient<IAuthentication, AuthenticationAppSI>();
            services.AddHttpClient<IAuthorization, AuthorizationAppSI>();
            services.AddHttpClient<IData, DataAppSI>();
            services.AddHttpClient<IDSF, RegisterDSFAppSI>();
            services.AddHttpClient<IER, RegisterERAppSI>();
            services.AddHttpClient<IInstance, InstanceAppSI>();
            services.AddHttpClient<IInstanceEvent, InstanceEventAppSI>();
            services.AddHttpClient<IPDF, PDFSI>();
            services.AddHttpClient<IProcess, ProcessAppSI>();
            services.AddHttpClient<IProfile, ProfileAppSI>();
            services.AddHttpClient<IRegister, RegisterAppSI>();
            services.AddHttpClient<IText, TextAppSI>();

            // Altinn App implementation service (The concrete implementation of logic from Application repsitory)
            services.AddTransient<IAltinnApp, AppLogic.App>();

            services.Configure<KestrelServerOptions>(options =>
            {
                options.AllowSynchronousIO = true;
            });

            // Application Settings
            services.Configure<AppSettings>(Configuration.GetSection("AppSettings"));
            services.Configure<GeneralSettings>(Configuration.GetSection("GeneralSettings"));
            services.Configure<PlatformSettings>(Configuration.GetSection("PlatformSettings"));
            services.Configure<Altinn.Common.PEP.Configuration.PepSettings>(Configuration.GetSection("PEPSettings"));
            services.Configure<Altinn.Common.PEP.Configuration.PlatformSettings>(Configuration.GetSection("PlatformSettings"));
            services.Configure<AccessTokenSettings>(Configuration.GetSection("AccessTokenSettings"));

            AppSettings appSettings = Configuration.GetSection("AppSettings").Get<AppSettings>();

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
                    options.JwtCookieName = Services.Constants.General.RuntimeCookieName;
                    options.MetadataAddress = Configuration["AppSettings:OpenIdWellKnownEndpoint"];
                    if (_env.IsDevelopment())
                    {
                        options.RequireHttpsMetadata = false;
                    }
                });

            services.AddAuthorization(options =>
            {
                options.AddPolicy("InstanceRead", policy => policy.Requirements.Add(new AppAccessRequirement("read")));
                options.AddPolicy("InstanceWrite", policy => policy.Requirements.Add(new AppAccessRequirement("write")));
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

            // Set up application insights
            string applicationInsightsKey = GetApplicationInsightsKey();
            if (!string.IsNullOrEmpty(applicationInsightsKey))
            {
                services.AddApplicationInsightsTelemetry(applicationInsightsKey);   // Enables Application Insights
                services.AddSingleton<ITelemetryInitializer, CustomTelemetryInitializer>();
            }
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }

            app.UseRouting();
            app.UseAuthentication();
            app.UseAuthorization();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
            });
        }

        private string GetApplicationInsightsKey()
        {
            if (_env.IsDevelopment())
            {
                return Configuration["ApplicationInsights:InstrumentationKey"];
            }

            return Environment.GetEnvironmentVariable("ApplicationInsights__InstrumentationKey");
        }
    }
}
