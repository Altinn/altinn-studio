using System;
using System.IO;
using System.Reflection;

using Altinn.Platform.Authentication.Configuration;
using Altinn.Platform.Authentication.Maskinporten;
using Altinn.Platform.Authentication.Repositories;
using AltinnCore.Authentication.Constants;
using AltinnCore.Authentication.JwtCookie;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
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
        private readonly IWebHostEnvironment _env;

        /// <summary>
        /// Initialises a new instance of the <see cref="Startup"/> class
        /// </summary>
        /// <param name="configuration">The configuration for the authentication component</param>
        public Startup(IConfiguration configuration, IWebHostEnvironment env)
        {
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
            services.AddControllers().AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.WriteIndented = true;
                options.JsonSerializerOptions.IgnoreNullValues = true;
            });
            services.AddMvc().AddControllersAsServices();
            services.AddSingleton(Configuration);
            services.Configure<GeneralSettings>(Configuration.GetSection("GeneralSettings"));
            services.Configure<KeyVaultSettings>(Configuration.GetSection("kvSetting"));
            services.Configure<CertificateSettings>(Configuration);
            services.Configure<CertificateSettings>(Configuration.GetSection("CertificateSettings"));
            services.AddAuthentication(JwtCookieDefaults.AuthenticationScheme)
                .AddJwtCookie(JwtCookieDefaults.AuthenticationScheme, options =>
                    {
                        var generalSettings = Configuration.GetSection("GeneralSettings").Get<GeneralSettings>();
                        options.TokenValidationParameters = new TokenValidationParameters
                        {
                            ValidateIssuerSigningKey = true,
                            ValidateIssuer = false,
                            ValidateAudience = false,
                            RequireExpirationTime = true,
                            ValidateLifetime = true
                        };

                        options.ExpireTimeSpan = new TimeSpan(0, 30, 0);
                        options.Cookie.Name = "AltinnStudioRuntime";
                        options.Cookie.Domain = generalSettings.HostName;
                        options.MetadataAddress = generalSettings.OpenIdWellKnownEndpoint;

                        if (_env.IsDevelopment())
                        {
                            options.RequireHttpsMetadata = false;
                        }
                    });

            services.AddSingleton<ISigningKeysRetriever, SigningKeysRetriever>();
            services.AddSingleton<IOrganisationRepository, OrganisationRepository>();
          
            string applicationInsightTelemetryKey = GetApplicationInsightsKeyFromEnvironment();
            if (!string.IsNullOrEmpty(applicationInsightTelemetryKey))
            {
                services.AddApplicationInsightsTelemetry(applicationInsightTelemetryKey);
            }

            // Add Swagger support (Swashbuckle)
            services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo { Title = "Altinn Platform Authentication", Version = "v1" });

                try
                {
                    c.IncludeXmlComments(GetXmlCommentsPathForControllers());
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
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();

                // Enable higher level of detail in exceptions related to JWT validation
                IdentityModelEventSource.ShowPII = true;
            }
            else
            {
                app.UseExceptionHandler("/Error");
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
            string environmentKey = Environment.GetEnvironmentVariable("ApplicationInsights--InstrumentationKey");
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
