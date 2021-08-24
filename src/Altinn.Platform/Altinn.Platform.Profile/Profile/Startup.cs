using System;
using System.IO;
using System.Reflection;
using Altinn.Common.AccessToken;
using Altinn.Common.AccessToken.Configuration;
using Altinn.Common.AccessToken.Services;
using Altinn.Platform.Profile.Configuration;
using Altinn.Platform.Profile.Filters;
using Altinn.Platform.Profile.Health;
using Altinn.Platform.Profile.Services.Implementation;
using Altinn.Platform.Profile.Services.Interfaces;
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

namespace Altinn.Platform.Profile
{
    /// <summary>
    /// Profile startup
    /// </summary>
    public class Startup
    {
        /// <summary>
        /// The key vault key for application insights.
        /// </summary>
        internal static readonly string VaultApplicationInsightsKey = "ApplicationInsights--InstrumentationKey";

        /// <summary>
        /// The application insights key.
        /// </summary>
        internal static string ApplicationInsightsKey { get; set; }

        private readonly ILogger<Startup> _logger;

        private readonly IWebHostEnvironment _env;

        /// <summary>
        ///  Initializes a new instance of the <see cref="Startup"/> class
        /// </summary>
        public Startup(ILogger<Startup> logger, IConfiguration configuration, IWebHostEnvironment env)
        {
            _logger = logger;
            Configuration = configuration;
            _env = env;
        }

        /// <summary>
        /// Gets profile project configuration
        /// </summary>
        public IConfiguration Configuration { get; }

        /// <summary>
        /// Configure profile settings for the service
        /// </summary>
        /// <param name="services">the service configuration</param>
        public void ConfigureServices(IServiceCollection services)
        {
            _logger.LogInformation("Startup // ConfigureServices");

            services.AddControllers();
            services.AddMemoryCache();
            services.AddHealthChecks().AddCheck<HealthCheck>("profile_health_check");
            services.Configure<GeneralSettings>(Configuration.GetSection("GeneralSettings"));
            services.Configure<KeyVaultSettings>(Configuration.GetSection("kvSetting"));
            services.Configure<AccessTokenSettings>(Configuration.GetSection("AccessTokenSettings"));
            services.AddSingleton(Configuration);

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

            services.AddHttpClient<IUserProfiles, UserProfilesWrapper>();

            if (!string.IsNullOrEmpty(ApplicationInsightsKey))
            {
                services.AddSingleton(typeof(ITelemetryChannel), new ServerTelemetryChannel { StorageFolder = "/tmp/logtelemetry" });
                services.AddApplicationInsightsTelemetry(ApplicationInsightsKey);
                services.AddApplicationInsightsTelemetryProcessor<HealthTelemetryFilter>();
                services.AddApplicationInsightsTelemetryProcessor<IdentityTelemetryFilter>();
                services.AddSingleton<ITelemetryInitializer, CustomTelemetryInitializer>();

                _logger.LogInformation($"Startup // ApplicationInsightsTelemetryKey = {ApplicationInsightsKey}");
            }

            // Add Swagger support (Swashbuckle)
            services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo { Title = "Altinn Platform Profile", Version = "v1" });
                IncludeXmlComments(c);
            });
        }

        /// <summary>
        /// Default configuration for the profile component
        /// </summary>
        /// <param name="app">the application builder</param>
        /// <param name="env">the hosting environment</param>
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            _logger.LogInformation($"Startup // Configure {env.ApplicationName}");

            if (env.IsDevelopment() || env.IsStaging())
            {
                _logger.LogInformation("IsDevelopment || IsStaging");

                app.UseDeveloperExceptionPage();

                // Enable higher level of detail in exceptions related to JWT validation
                IdentityModelEventSource.ShowPII = true;
            }
            else
            {
                app.UseExceptionHandler("/profile/api/v1/error");
            }

            app.UseSwagger(o => o.RouteTemplate = "profile/swagger/{documentName}/swagger.json");

            app.UseSwaggerUI(c =>
            {
                c.SwaggerEndpoint("/profile/swagger/v1/swagger.json", "Altinn Platform Profile API");
                c.RoutePrefix = "profile/swagger";
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

        private void IncludeXmlComments(SwaggerGenOptions options)
        {
            try
            {
                string fileName = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
                string fullFilePath = Path.Combine(AppContext.BaseDirectory, fileName);
                options.IncludeXmlComments(fullFilePath);
            }
            catch (Exception e)
            {
                _logger.LogWarning(e, "Failed to include the XmlComment file into Swagger for Profile.");
            }
        }
    }
}
