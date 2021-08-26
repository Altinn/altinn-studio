using System;
using System.IO;
using System.Reflection;

using Altinn.Common.AccessToken;
using Altinn.Common.AccessToken.Configuration;
using Altinn.Common.AccessToken.Services;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Common.PEP.Clients;
using Altinn.Common.PEP.Implementation;
using Altinn.Common.PEP.Interfaces;

using Altinn.Platform.Events.Configuration;
using Altinn.Platform.Events.Filters;
using Altinn.Platform.Events.Health;
using Altinn.Platform.Events.Repository;
using Altinn.Platform.Events.Services;
using Altinn.Platform.Events.Services.Interfaces;
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
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

using Npgsql.Logging;
using Swashbuckle.AspNetCore.SwaggerGen;
using Yuniql.AspNetCore;
using Yuniql.PostgreSql;

namespace Altinn.Platform.Events
{
    /// <summary>
    /// Config startup.
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
        ///  Initializes a new instance of the <see cref="Startup"/> class
        /// </summary>
        public Startup(IConfiguration configuration, IWebHostEnvironment env)
        {
            Configuration = configuration;
            _env = env;
        }

        /// <summary>
        /// Gets config project configuration.
        /// </summary>
        public IConfiguration Configuration { get; }

        /// <summary>
        /// Configure config setttings for the service.
        /// </summary>
        /// <param name="services">the service configuration.</param>
        public void ConfigureServices(IServiceCollection services)
        {
            // Setup logging for the web host creation
            var logFactory = LoggerFactory.Create(builder =>
            {
                builder
                    .AddFilter("Altinn.Platform.Events.Startup", LogLevel.Debug)
                    .AddConsole();
            });

            _logger = logFactory.CreateLogger<Program>();

            _logger.LogInformation("Startup // ConfigureServices");

            services.AddControllers().AddJsonOptions(options =>
               {
                   options.JsonSerializerOptions.IgnoreNullValues = true;
                   options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
               });

            services.AddMemoryCache();
            services.AddHealthChecks().AddCheck<HealthCheck>("events_health_check");

            services.AddSingleton(Configuration);
            services.Configure<PostgreSQLSettings>(Configuration.GetSection("PostgreSQLSettings"));
            services.Configure<GeneralSettings>(Configuration.GetSection("GeneralSettings"));
            services.Configure<QueueStorageSettings>(Configuration.GetSection("QueueStorageSettings"));
            services.Configure<PlatformSettings>(Configuration.GetSection("PlatformSettings"));
            services.Configure<KeyVaultSettings>(Configuration.GetSection("kvSetting"));
            services.Configure<Altinn.Common.PEP.Configuration.PlatformSettings>(Configuration.GetSection("PlatformSettings"));

            services.AddSingleton<IAuthorizationHandler, AccessTokenHandler>();
            services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();
            services.AddSingleton<ISigningKeysResolver, SigningKeysResolver>();
            services.AddSingleton<IAccessTokenGenerator, AccessTokenGenerator>();
            services.AddTransient<ISigningCredentialsResolver, SigningCredentialsResolver>();

            services.AddHttpClient<AuthorizationApiClient>();

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

            services.AddHttpClient<IRegisterService, RegisterService>();
            services.AddHttpClient<IProfile, ProfileService>();
            services.AddSingleton<IEventsService, EventsService>();
            services.AddSingleton<ISubscriptionService, SubscriptionService>();
            services.AddSingleton<ICloudEventRepository, CloudEventRepository>();
            services.AddSingleton<ISubscriptionRepository, SubscriptionRepository>();
            services.AddSingleton<IQueueService, QueueService>();
            services.AddSingleton<IPDP, PDPAppSI>();

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
                c.SwaggerDoc("v1", new OpenApiInfo { Title = "Altinn Platform Events", Version = "v1" });
                IncludeXmlComments(c);
            });
        }

        /// <summary>
        /// Default configuration for the config component.
        /// </summary>
        /// <param name="app">the application builder.</param>
        /// <param name="env">the hosting environment.</param>
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            _logger.LogInformation("Startup // Configure");

            if (env.IsDevelopment() || env.IsStaging())
            {
                app.UseDeveloperExceptionPage();
            }
            else
            {
                app.UseExceptionHandler("/events/api/v1/error");
            }

            if (Configuration.GetValue<bool>("PostgreSQLSettings:EnableDBConnection"))
            {
                NpgsqlLogManager.Provider = new ConsoleLoggingProvider(NpgsqlLogLevel.Trace, true, true);

                ConsoleTraceService traceService = new ConsoleTraceService { IsDebugEnabled = true };

                string connectionString = string.Format(
                    Configuration.GetValue<string>("PostgreSQLSettings:AdminConnectionString"),
                    Configuration.GetValue<string>("PostgreSQLSettings:EventsDbAdminPwd"));

                app.UseYuniql(
                    new PostgreSqlDataService(traceService),
                    new PostgreSqlBulkImportService(traceService),
                    traceService,
                    new Yuniql.AspNetCore.Configuration
                    {
                        Workspace = Path.Combine(Environment.CurrentDirectory, Configuration.GetValue<string>("PostgreSQLSettings:WorkspacePath")),
                        ConnectionString = connectionString,
                        IsAutoCreateDatabase = false,
                        IsDebug = true
                    });
            }

            app.UseSwagger(o => o.RouteTemplate = "events/swagger/{documentName}/swagger.json");

            app.UseSwaggerUI(c =>
            {
                c.SwaggerEndpoint("/events/swagger/v1/swagger.json", "Altinn Platform Events API");
                c.RoutePrefix = "events/swagger";
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
                _logger.LogWarning(e, "Failed to include the XmlComment file into Swagger for Events.");
            }
        }
    }
}
