using System;
using System.IO;
using System.Reflection;
using Altinn.App.Api.Controllers;
using Altinn.App.Api.Filters;
using Altinn.App.Api.Middleware;
using Altinn.App.PlatformServices.Extensions;
using Altinn.App.Services.Interface;
using Altinn.Common.PEP.Authorization;
using Altinn.Common.PEP.Clients;
using AltinnCore.Authentication.JwtCookie;
using Altinn.App.services.options;
using Altinn.App.PlatformServices.Options;

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

namespace Altinn.App
{
    /// <summary>
    /// This class is responsible for configuration of the built in service provider and setting up all middleware.
    /// </summary>
    public class Startup
    {
        private readonly IWebHostEnvironment _env;

        /// <summary>
        /// Initialize a new instance of the <see cref="Startup"/> class with the given configuration
        /// and host environment information.
        /// </summary>
        /// <param name="configuration">The current configuration.</param>
        /// <param name="env">Information about the host environment.</param>
        public Startup(IConfiguration configuration, IWebHostEnvironment env)
        {
            Configuration = configuration;
            _env = env;
        }

        /// <summary>
        /// Gets the application configuration object.
        /// </summary>
        public IConfiguration Configuration { get; }

        /// <summary>
        /// Adds any configuration to the service provider.
        /// </summary>
        /// <param name="services">The current service provider.</param>
        public void ConfigureServices(IServiceCollection services)
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

            // Dot net services
            services.AddSingleton<IAuthorizationHandler, AppAccessHandler>();
            services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();

            // HttpClients for platform functionality. Registered as HttpClients so default HttpClientFactory is used
            services.AddHttpClient<AuthorizationApiClient>();
            services.AddAppServices(Configuration, _env);
            services.AddPlatformServices(Configuration, _env);

            // Altinn App implementation service (The concrete implementation of logic from Application repository)
            services.AddTransient<IAltinnApp, AppLogic.App>();
            services.AddTransient<IAppOptionsProvider, ReferenceOptions>();

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

        /// <summary>
        /// Configure the Http request pipeline middleware.
        /// </summary>
        /// <param name="app">The current application builder.</param>
        /// <param name="env">The current host environment.</param>
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (env.IsDevelopment())
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
            app.UseAuthentication();
            app.UseAuthorization();
            app.UseStaticFiles("/ttd/frontend-test");

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
            });
        }

        private void IncludeXmlComments(SwaggerGenOptions options)
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

        private string GetApplicationId()
        {
            string appMetadataString = File.ReadAllText("config/applicationmetadata.json");
            JObject appMetadataJObject = JObject.Parse(appMetadataString);
            return appMetadataJObject.SelectToken("id").Value<string>();
        }
    }
}
