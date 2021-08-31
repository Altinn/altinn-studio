using System;
using System.IO;
using System.Reflection;

using Altinn.Common.AccessToken;
using Altinn.Common.AccessToken.Configuration;
using Altinn.Common.AccessToken.Services;
using Altinn.Platform.Register.Configuration;
using Altinn.Platform.Register.Filters;
using Altinn.Platform.Register.Health;
using Altinn.Platform.Register.Services.Implementation;
using Altinn.Platform.Register.Services.Interfaces;
using Altinn.Platform.Telemetry;

using AltinnCore.Authentication.JwtCookie;

using Microsoft.ApplicationInsights.Channel;
using Microsoft.ApplicationInsights.Extensibility;
using Microsoft.ApplicationInsights.WindowsServer.TelemetryChannel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Logging;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

using Swashbuckle.AspNetCore.SwaggerGen;

namespace Altinn.Platform.Register
{
    /// <summary>
    /// Register startup
    /// </summary>
    public class Startup
    {
        private ILogger _logger;

        /// <summary>
        /// The key valt key for application insights.
        /// </summary>
        internal static readonly string VaultApplicationInsightsKey = "ApplicationInsights--InstrumentationKey";

        /// <summary>
        /// The application insights key.
        /// </summary>
        internal static string ApplicationInsightsKey { get; set; }

        private readonly IWebHostEnvironment _env;

        /// <summary>
        ///  Initializes a new instance of the <see cref="Startup"/> class.
        /// </summary>
        /// <param name="configuration">The configuration for the register component.</param>
        /// <param name="env">The current WebHostEnvironment.</param>
        public Startup(IConfiguration configuration, IWebHostEnvironment env)
        {
            Configuration = configuration;
            _env = env;
        }

        /// <summary>
        /// Gets register project configuration
        /// </summary>
        public IConfiguration Configuration { get; }

        /// <summary>
        /// Configure register setttings for the service
        /// </summary>
        /// <param name="services">the service configuration</param>
        public void ConfigureServices(IServiceCollection services)
        {
            // Setup logging for the web host creation
            var logFactory = LoggerFactory.Create(builder =>
            {
                builder
                    .AddFilter("Altinn.Platform.Register.Program", LogLevel.Debug)
                    .AddConsole();
            });

            _logger = logFactory.CreateLogger<Startup>();

            _logger.LogInformation("Startup // ConfigureServices");

            services.AddControllers().AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.WriteIndented = true;
                options.JsonSerializerOptions.IgnoreNullValues = true;
            });
            services.AddMemoryCache();
            services.AddHealthChecks().AddCheck<HealthCheck>("register_health_check");

            services.AddSingleton(Configuration);
            services.Configure<GeneralSettings>(Configuration.GetSection("GeneralSettings"));
            services.Configure<KeyVaultSettings>(Configuration.GetSection("kvSetting"));
            services.Configure<AccessTokenSettings>(Configuration.GetSection("AccessTokenSettings"));
            services.Configure<PlatformSettings>(Configuration.GetSection("PlatformSettings"));

            services.AddSingleton<IAuthorizationHandler, AccessTokenHandler>();
            services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();
            services.AddSingleton<ISigningKeysResolver, SigningKeysResolver>();

            services.AddAuthentication(JwtCookieDefaults.AuthenticationScheme)
                  .AddJwtCookie(JwtCookieDefaults.AuthenticationScheme, options =>
                  {
                      GeneralSettings generalSettings = Configuration.GetSection("GeneralSettings").Get<GeneralSettings>();
                      options.JwtCookieName = generalSettings.JwtCookieName;
                      options.MetadataAddress = generalSettings.OpenIdWellKnownEndpoint;
                      options.TokenValidationParameters = new TokenValidationParameters
                      {
                          ValidateIssuerSigningKey = true,
                          ValidateIssuer = false,
                          ValidateAudience = false,
                          RequireExpirationTime = true,
                          ValidateLifetime = true,
                          ClockSkew = TimeSpan.Zero
                      };

                      if (_env.IsDevelopment())
                      {
                          options.RequireHttpsMetadata = false;
                      }
                  });

            services.AddAuthorization(options =>
            {
                options.AddPolicy("PlatformAccess", policy => policy.Requirements.Add(new AccessTokenRequirement()));
            });

            services.AddHttpClient<IOrganizations, OrganizationsWrapper>();
            services.AddHttpClient<IParties, PartiesWrapper>();
            services.AddHttpClient<IAuthorization, AuthorizationWrapper>();

            if (!string.IsNullOrEmpty(ApplicationInsightsKey))
            {
                services.AddSingleton(typeof(ITelemetryChannel), new ServerTelemetryChannel() { StorageFolder = "/tmp/logtelemetry" });
                services.AddApplicationInsightsTelemetry(ApplicationInsightsKey);
                services.AddApplicationInsightsTelemetryProcessor<HealthTelemetryFilter>();
                services.AddApplicationInsightsTelemetryProcessor<IdentityTelemetryFilter>();
                services.AddSingleton<ITelemetryInitializer, CustomTelemetryInitializer>();

                _logger.LogInformation($"Startup // ApplicationInsightsTelemetryKey = {ApplicationInsightsKey}");
            }

            // Add Swagger support (Swashbuckle)
            services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo { Title = "Altinn Platform Register", Version = "v1" });
                IncludeXmlComments(c);
            });
        }

        private void IncludeXmlComments(SwaggerGenOptions swaggerGenOptions)
        {
            try
            {
                string xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
                string xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
                swaggerGenOptions.IncludeXmlComments(xmlPath);
            }
            catch (Exception e)
            {
                _logger.LogWarning("Exception when attempting to include the XML comments file(s): " + e.Message);
            }
        }

        /// <summary>
        /// Default configuration for the register component
        /// </summary>
        /// <param name="app">the application builder</param>
        /// <param name="env">the hosting environment</param>
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            _logger.LogInformation("Startup // Configure");

            if (env.IsDevelopment() || env.IsStaging())
            {
                _logger.LogInformation("IsDevelopment || IsStaging");

                app.UseDeveloperExceptionPage();

                // Enable higher level of detail in exceptions related to JWT validation
                IdentityModelEventSource.ShowPII = true;
            }
            else
            {
                app.UseExceptionHandler("/register/api/v1/error");
            }

            app.UseSwagger(o => o.RouteTemplate = "register/swagger/{documentName}/swagger.json");

            app.UseSwaggerUI(c =>
            {
                c.SwaggerEndpoint("/register/swagger/v1/swagger.json", "Altinn Platform Register API");
                c.RoutePrefix = "register/swagger";
            });

            app.UseRouting();
            app.UseAuthentication();
            app.UseAuthorization();
            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
                endpoints.MapHealthChecks("/health");
            });
        }
    }
}
