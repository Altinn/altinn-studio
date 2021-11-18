using System;
using System.IO;
using System.Reflection;

using Altinn.Common.AccessToken.Configuration;
using Altinn.Platform.Authentication.Configuration;
using Altinn.Platform.Authentication.Extensions;
using Altinn.Platform.Authentication.Filters;
using Altinn.Platform.Authentication.Health;
using Altinn.Platform.Authentication.Services;
using Altinn.Platform.Authentication.Services.Interfaces;
using Altinn.Platform.Telemetry;

using AltinnCore.Authentication.JwtCookie;

using Microsoft.ApplicationInsights.Channel;
using Microsoft.ApplicationInsights.Extensibility;
using Microsoft.ApplicationInsights.WindowsServer.TelemetryChannel;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Logging;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

namespace Altinn.Platform.Authentication
{
    /// <summary>
    /// Authentication startup
    /// </summary>
    public class Startup
    {
        /// <summary>
        /// The key vault key which application insights is stored.
        /// </summary>
        public static readonly string VaultApplicationInsightsKey = "ApplicationInsights--InstrumentationKey";

        /// <summary>
        /// The key vault key which application insights is stored.
        /// </summary>
        public static readonly string VaultKeysAccountName = "AzureStorageConfiguration--KeysAccountName";

        /// <summary>
        /// The key vault key which application insights is stored.
        /// </summary>
        public static readonly string VaultKeysAccountKey = "AzureStorageConfiguration--KeysAccountKey";

        /// <summary>
        /// The key vault key which application insights is stored.
        /// </summary>
        public static readonly string VaultKeysContainer = "AzureStorageConfiguration--KeysContainer";

        /// <summary>
        /// The key vault key which application insights is stored.
        /// </summary>
        public static readonly string VaultKeysBlobEndpoint = "AzureStorageConfiguration--KeysBlobEndpoint";

        /// <summary>
        /// The application insights key.
        /// </summary>
        internal static string ApplicationInsightsKey { get; set; }

        /// <summary>
        /// The storage configuration.
        /// </summary>
        internal static AzureStorageConfiguration StorageConfig { get; set; }

        private readonly IWebHostEnvironment _env;
        private readonly ILogger<Startup> _logger;

        /// <summary>
        /// Initialises a new instance of the <see cref="Startup"/> class
        /// </summary>
        public Startup(ILogger<Startup> logger, IConfiguration configuration, IWebHostEnvironment env)
        {
            _logger = logger;
            Configuration = configuration;
            _env = env;
        }

        /// <summary>
        /// Gets authentication project configuration
        /// </summary>
        public IConfiguration Configuration { get; }

        /// <summary>
        /// Configure authentication settings for the service
        /// </summary>
        /// <param name="services">the service configuration</param>
        public void ConfigureServices(IServiceCollection services)
        {
            _logger.LogInformation("Startup // ConfigureServices");

            services.AddControllers().AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.WriteIndented = _env.IsDevelopment() || _env.IsStaging();
                options.JsonSerializerOptions.IgnoreNullValues = true;
            });
            services.AddMvc().AddControllersAsServices();
            services.AddHealthChecks().AddCheck<HealthCheck>("authentication_health_check");

            services.AddSingleton(Configuration);
            services.Configure<GeneralSettings>(Configuration.GetSection("GeneralSettings"));
            services.Configure<AltinnCore.Authentication.Constants.KeyVaultSettings>(Configuration.GetSection("kvSetting"));
            services.Configure<AltinnCore.Authentication.Constants.CertificateSettings>(Configuration.GetSection("CertificateSettings"));
            services.Configure<Common.AccessToken.Configuration.KeyVaultSettings>(Configuration.GetSection("kvSetting"));
            services.Configure<AccessTokenSettings>(Configuration.GetSection("AccessTokenSettings"));
            services.ConfigureOidcProviders(Configuration.GetSection("OidcProviders"));
            services.ConfigureDataProtection(_env.IsDevelopment(), StorageConfig);

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

            services.AddSingleton(Configuration);
            services.AddHttpClient<ISblCookieDecryptionService, SblCookieDecryptionService>();
            services.AddHttpClient<IUserProfileService, UserProfileService>();
            services.AddHttpClient<IEnterpriseUserAuthenticationService, EnterpriseUserAuthenticationService>();
            services.AddHttpClient<IOrganisationsService, OrganisationsService>();
            services.AddSingleton<IJwtSigningCertificateProvider, JwtSigningCertificateProvider>();
            services.AddSingleton<ISigningKeysRetriever, SigningKeysRetriever>();
            services.AddSingleton<Common.AccessToken.Services.ISigningKeysResolver, Common.AccessToken.Services.SigningKeysResolver>();
            services.AddHttpClient<IOidcProvider, OidcProviderService>();

            if (!string.IsNullOrEmpty(ApplicationInsightsKey))
            {
                services.AddSingleton(typeof(ITelemetryChannel), new ServerTelemetryChannel() { StorageFolder = "/tmp/logtelemetry" });
                services.AddApplicationInsightsTelemetry(ApplicationInsightsKey);
                services.AddApplicationInsightsTelemetryProcessor<HealthTelemetryFilter>();
                services.AddApplicationInsightsTelemetryProcessor<IdentityTelemetryFilter>();
                services.AddSingleton<ITelemetryInitializer, CustomTelemetryInitializer>();

                _logger.LogInformation($"Startup // ApplicationInsightsTelemetryKey = {ApplicationInsightsKey}");
            }

            services.AddAntiforgery(options =>
            {
                // asp .net core expects two types of tokens: One that is attached to the request as header, and the other one as cookie.
                // The values of the tokens are not the same and both need to be present and valid in a "unsafe" request.

                // We use this for OIDC state validation. See authentication controller. 
                // https://docs.microsoft.com/en-us/aspnet/core/security/anti-request-forgery?view=aspnetcore-3.1
                // https://github.com/axios/axios/blob/master/lib/defaults.js
                options.Cookie.Name = "AS-XSRF-TOKEN";
                options.Cookie.SameSite = Microsoft.AspNetCore.Http.SameSiteMode.Lax;
                options.HeaderName = "X-XSRF-TOKEN";
            });

            // Add Swagger support (Swashbuckle)
            services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo { Title = "Altinn Platform Authentication", Version = "v1" });

                try
                {
                    string filePath = GetXmlCommentsPathForControllers();
                    _logger.LogInformation($"Swagger XML document file: {filePath}");

                    c.IncludeXmlComments(filePath);
                }
                catch
                {
                    // catch swashbuckle exception if it doesn't find the generated xml documentation file
                }
            });
        }

        /// <summary>
        /// Default configuration for the authentication component
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
                app.UseExceptionHandler("/authentication/api/v1/error");
            }

            app.UseSwagger(o => o.RouteTemplate = "authentication/swagger/{documentName}/swagger.json");

            app.UseSwaggerUI(c =>
            {
                c.SwaggerEndpoint("/authentication/swagger/v1/swagger.json", "Altinn Platform Authentication API");
                c.RoutePrefix = "authentication/swagger";
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

        private string GetXmlCommentsPathForControllers()
        {
            // locate the xml file being generated by .NET
            string xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
            string xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);

            return xmlPath;
        }

        /// <summary>
        ///  Gets telemetry instrumentation key from environment, which we set in Program.cs
        /// </summary>
        /// <returns>Telemetry instrumentation key</returns>
        public string GetApplicationInsightsKeyFromEnvironment()
        {
            string environmentKey = Environment.GetEnvironmentVariable(VaultApplicationInsightsKey);
            if (string.IsNullOrEmpty(environmentKey))
            {
                environmentKey = Environment.GetEnvironmentVariable("APPINSIGHTS_INSTRUMENTATIONKEY");

                if (string.IsNullOrEmpty(environmentKey))
                {
                    return null;
                }
            }

            return environmentKey;
        }
    }
}
