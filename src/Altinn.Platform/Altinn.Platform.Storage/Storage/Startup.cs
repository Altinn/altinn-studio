using System;
using System.IO;
using System.Reflection;

using Altinn.Common.PEP.Authorization;
using Altinn.Common.PEP.Clients;
using Altinn.Common.PEP.Implementation;
using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Storage.Authorization;
using Altinn.Platform.Storage.Clients;
using Altinn.Platform.Storage.Configuration;
using Altinn.Platform.Storage.Filters;
using Altinn.Platform.Storage.Health;
using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Repository;
using Altinn.Platform.Storage.Wrappers;
using Altinn.Platform.Telemetry;

using AltinnCore.Authentication.Constants;
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

namespace Altinn.Platform.Storage
{
    /// <summary>
    /// The database startup
    /// </summary>
    public class Startup
    {
        /// <summary>
        /// application insights key in keyvault
        /// </summary>
        public static readonly string VaultApplicationInsightsKey = "ApplicationInsights--InstrumentationKey";

        /// <summary>
        /// The application insights key.
        /// </summary>
        internal static string ApplicationInsightsKey { get; set; }

        private readonly IWebHostEnvironment _env;

        private readonly ILogger<Startup> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="Startup"/> class
        /// </summary>
        public Startup(ILogger<Startup> logger, IConfiguration configuration, IWebHostEnvironment env)
        {
            Configuration = configuration;
            _env = env;
            _logger = logger;
        }

        /// <summary>
        /// Gets database project configuration
        /// </summary>
        public IConfiguration Configuration { get; }

        /// <summary>
        /// configure database settings for the service
        /// </summary>
        /// <param name="services">the service configuration</param>
        public void ConfigureServices(IServiceCollection services)
        {
            _logger.LogInformation("Startup // ConfigureServices");

            services.AddControllers().AddNewtonsoftJson();
            services.AddMemoryCache();
            services.AddHealthChecks().AddCheck<HealthCheck>("storage_health_check");

            services.AddHttpClient<AuthorizationApiClient>();

            services.Configure<AzureCosmosSettings>(Configuration.GetSection("AzureCosmosSettings"));
            services.Configure<AzureStorageConfiguration>(Configuration.GetSection("AzureStorageConfiguration"));
            services.Configure<GeneralSettings>(Configuration.GetSection("GeneralSettings"));
            services.Configure<KeyVaultSettings>(Configuration.GetSection("kvSetting"));
            services.Configure<Common.PEP.Configuration.PepSettings>(Configuration.GetSection("PepSettings"));
            services.Configure<Common.PEP.Configuration.PlatformSettings>(Configuration.GetSection("PlatformSettings"));

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
                options.AddPolicy(AuthzConstants.POLICY_INSTANCE_READ, policy => policy.Requirements.Add(new AppAccessRequirement("read")));
                options.AddPolicy(AuthzConstants.POLICY_INSTANCE_WRITE, policy => policy.Requirements.Add(new AppAccessRequirement("write")));
                options.AddPolicy(AuthzConstants.POLICY_INSTANCE_DELETE, policy => policy.Requirements.Add(new AppAccessRequirement("delete")));
                options.AddPolicy(AuthzConstants.POLICY_INSTANCE_COMPLETE, policy => policy.Requirements.Add(new AppAccessRequirement("complete")));
                options.AddPolicy(AuthzConstants.POLICY_SCOPE_INSTANCE_READ, policy => policy.Requirements.Add(new ScopeAccessRequirement("altinn:instances.read")));
                options.AddPolicy(AuthzConstants.POLICY_STUDIO_DESIGNER, policy => policy.Requirements.Add(new ClaimAccessRequirement("urn:altinn:app", "studio.designer")));
            });

            services.AddRepositories();

            services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();
            services.AddSingleton<ISasTokenProvider, SasTokenProvider>();
            services.AddSingleton<IKeyVaultClientWrapper, KeyVaultClientWrapper>();
            services.AddSingleton<IPDP, PDPAppSI>();

            services.AddTransient<IAuthorizationHandler, StorageAccessHandler>();
            services.AddTransient<IAuthorizationHandler, ScopeAccessHandler>();
            services.AddTransient<IAuthorizationHandler, ClaimAccessHandler>();

            services.AddHttpClient<IPartiesWithInstancesClient, PartiesWithInstancesClient>();

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
                c.SwaggerDoc("v1", new OpenApiInfo { Title = "Altinn Platform Storage", Version = "v1" });
                c.AddSecurityDefinition(JwtCookieDefaults.AuthenticationScheme, new OpenApiSecurityScheme
                {
                    Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\". Remember to add \"Bearer\" to the input below before your token.",
                    Name = "Authorization",
                    In = ParameterLocation.Header,
                    Type = SecuritySchemeType.ApiKey,
                });
                c.AddSecurityRequirement(new OpenApiSecurityRequirement
                {
                    {
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference
                            {
                                Id = JwtCookieDefaults.AuthenticationScheme,
                                Type = ReferenceType.SecurityScheme
                            }
                        },
                        new string[] { }
                    }
                });
                try
                {
                    c.IncludeXmlComments(GetXmlCommentsPathForControllers());

                    // hardcoded since nuget restore does not export the xml file.
                    c.IncludeXmlComments("Altinn.Platform.Storage.Interface.xml");
                }
                catch
                {
                    // catch swashbuckle exception if it doesn't find the generated xml documentation file
                }
            });
            services.AddSwaggerGenNewtonsoftSupport();
        }

        private static string GetXmlCommentsPathForControllers()
        {
            // locate the xml file being generated by .NET
            string xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
            string xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);

            return xmlPath;
        }

        /// <summary>
        /// default configuration
        /// </summary>
        /// <param name="app">the application builder</param>
        /// <param name="env">the hosting environment</param>
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            _logger.LogInformation("Startup // Configure");
            _logger.LogInformation($"Environment: {env.EnvironmentName}");

            if (env.IsDevelopment() || env.IsStaging())
            {
                app.UseDeveloperExceptionPage();
            }
            else
            {
                app.UseExceptionHandler("/storage/api/v1/error");
            }

            app.UseSwagger(o => o.RouteTemplate = "storage/swagger/{documentName}/swagger.json");

            app.UseSwaggerUI(c =>
            {
                c.SwaggerEndpoint("/storage/swagger/v1/swagger.json", "Altinn Platform Storage API");
                c.RoutePrefix = "storage/swagger";
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

        /// <summary>
        ///  Gets telemetry instrumentation key from environment, which we set in Program.cs
        /// </summary>
        /// <returns>Telemetry instrumentation key</returns>
        public string GetApplicationInsightsKeyFromEnvironment()
        {
            string environmentKey = Environment.GetEnvironmentVariable("ApplicationInsights--InstrumentationKey");
            if (string.IsNullOrEmpty(environmentKey))
            {
                return null;
            }

            return environmentKey;
        }
    }
}
