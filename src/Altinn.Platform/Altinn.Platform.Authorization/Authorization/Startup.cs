using System;
using System.IO;
using System.Reflection;
using Altinn.Authorization.ABAC.Interface;
using Altinn.Common.PEP.Authorization;
using Altinn.Platform.Authorization.Clients;
using Altinn.Platform.Authorization.Configuration;
using Altinn.Platform.Authorization.Constants;
using Altinn.Platform.Authorization.Filters;
using Altinn.Platform.Authorization.Health;
using Altinn.Platform.Authorization.ModelBinding;
using Altinn.Platform.Authorization.Repositories;
using Altinn.Platform.Authorization.Repositories.Interface;
using Altinn.Platform.Authorization.Services.Implementation;
using Altinn.Platform.Authorization.Services.Interface;
using Altinn.Platform.Telemetry;
using AltinnCore.Authentication.JwtCookie;
using Microsoft.ApplicationInsights.Channel;
using Microsoft.ApplicationInsights.Extensibility;
using Microsoft.ApplicationInsights.WindowsServer.TelemetryChannel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Logging;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Npgsql.Logging;
using Swashbuckle.AspNetCore.SwaggerGen;
using Yuniql.AspNetCore;
using Yuniql.PostgreSql;

namespace Altinn.Platform.Authorization
{
    /// <summary>
    /// Authorization startup.
    /// </summary>
    public class Startup
    {
        /// <summary>
        /// The key valt key for application insights.
        /// </summary>
        internal static readonly string VaultApplicationInsightsKey = "ApplicationInsights--InstrumentationKey";

        private readonly IWebHostEnvironment _env;

        /// <summary>
        /// The application insights key.
        /// </summary>
        internal static string ApplicationInsightsKey { get; set; }

        private readonly ILogger<Startup> _logger;

        /// <summary>
        ///  Initializes a new instance of the <see cref="Startup"/> class
        /// </summary>
        public Startup(ILogger<Startup> logger, IConfiguration configuration, IWebHostEnvironment env)
        {
            Configuration = configuration;
            _logger = logger;
            _env = env;
        }

        /// <summary>
        /// Gets authorization project configuration.
        /// </summary>
        public IConfiguration Configuration { get; }

        /// <summary>
        /// Configure authorization settings for the service.
        /// </summary>
        /// <param name="services">the service configuration.</param>
        public void ConfigureServices(IServiceCollection services)
        {
            _logger.LogInformation("Startup // ConfigureServices");

            services.AddControllers().AddXmlSerializerFormatters();
            services.AddHealthChecks().AddCheck<HealthCheck>("authorization_health_check");
            services.AddSingleton(Configuration);
            services.AddSingleton<IParties, PartiesWrapper>();
            services.AddSingleton<IRoles, RolesWrapper>();
            services.AddSingleton<IContextHandler, ContextHandler>();
            services.AddSingleton<IPolicyRetrievalPoint, PolicyRetrievalPoint>();
            services.AddSingleton<Services.Interface.IPolicyInformationPoint, PolicyInformationPoint>();
            services.AddSingleton<IPolicyAdministrationPoint, PolicyAdministrationPoint>();
            services.AddSingleton<IPolicyRepository, PolicyRepository>();
            services.AddSingleton<IPolicyInformationRepository, PolicyInformationRepository>();
            services.AddSingleton<IPolicyDelegationRepository, PolicyDelegationRepository>();
            services.Configure<GeneralSettings>(Configuration.GetSection("GeneralSettings"));
            services.Configure<AzureStorageConfiguration>(Configuration.GetSection("AzureStorageConfiguration"));
            services.Configure<AzureCosmosSettings>(Configuration.GetSection("AzureCosmosSettings"));
            services.Configure<PostgreSQLSettings>(Configuration.GetSection("PostgreSQLSettings"));
            services.AddHttpClient<PartyClient>();
            services.AddHttpClient<RolesClient>();
            services.AddHttpClient<SBLClient>();
            services.TryAddSingleton<IHttpContextAccessor, HttpContextAccessor>();

            GeneralSettings generalSettings = Configuration.GetSection("GeneralSettings").Get<GeneralSettings>();
            services.AddAuthentication(JwtCookieDefaults.AuthenticationScheme)
                .AddJwtCookie(JwtCookieDefaults.AuthenticationScheme, options =>
                {
                    options.JwtCookieName = generalSettings.RuntimeCookieName;
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
                options.AddPolicy(AuthzConstants.POLICY_STUDIO_DESIGNER, policy => policy.Requirements.Add(new ClaimAccessRequirement("urn:altinn:app", "studio.designer")));
            });

            services.AddTransient<IAuthorizationHandler, ClaimAccessHandler>();

            services.Configure<KestrelServerOptions>(options =>
            {
                options.AllowSynchronousIO = true;
            });           

            if (!string.IsNullOrEmpty(ApplicationInsightsKey))
            {
                services.AddSingleton(typeof(ITelemetryChannel), new ServerTelemetryChannel() { StorageFolder = "/tmp/logtelemetry" });
                services.AddApplicationInsightsTelemetry(ApplicationInsightsKey);
                services.AddApplicationInsightsTelemetryProcessor<HealthTelemetryFilter>();
                services.AddApplicationInsightsTelemetryProcessor<IdentityTelemetryFilter>();
                services.AddSingleton<ITelemetryInitializer, CustomTelemetryInitializer>();

                _logger.LogInformation($"Startup // ApplicationInsightsTelemetryKey = {ApplicationInsightsKey}");
            }

            services.AddMvc(options =>
            {
                // Adding custom model binders
                options.ModelBinderProviders.Insert(0, new XacmlRequestApiModelBinderProvider());
                options.RespectBrowserAcceptHeader = true;
            });

            // Add Swagger support (Swashbuckle)
            services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo { Title = "Altinn Platform Authorization", Version = "v1" });
                IncludeXmlComments(c);
            });
        }

        /// <summary>
        /// Default configuration for the authorization component.
        /// </summary>
        /// <param name="app">the application builder.</param>
        /// <param name="env">the hosting environment.</param>
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
                app.UseExceptionHandler("/authorization/api/v1/error");
            }

            if (Configuration.GetValue<bool>("PostgreSQLSettings:EnableDBConnection"))
            {
                NpgsqlLogManager.Provider = new ConsoleLoggingProvider(NpgsqlLogLevel.Trace, true, true);

                ConsoleTraceService traceService = new ConsoleTraceService { IsDebugEnabled = true };

                string connectionString = string.Format(
                    Configuration.GetValue<string>("PostgreSQLSettings:AdminConnectionString"),
                    Configuration.GetValue<string>("PostgreSQLSettings:authorizationDbAdminPwd"));

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

            app.UseSwagger(o => o.RouteTemplate = "authorization/swagger/{documentName}/swagger.json");

            app.UseSwaggerUI(c =>
            {
                c.SwaggerEndpoint("/authorization/swagger/v1/swagger.json", "Altinn Platform Authorization API");
                c.RoutePrefix = "authorization/swagger";
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
