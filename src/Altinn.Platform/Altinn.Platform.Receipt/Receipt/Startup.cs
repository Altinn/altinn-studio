using System;
using System.Net;
using Altinn.Platform.Receipt.Configuration;
using AltinnCore.Authentication.JwtCookie;
using Microsoft.ApplicationInsights.Channel;
using Microsoft.ApplicationInsights.WindowsServer.TelemetryChannel;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using Serilog.Core;

namespace Altinn.Platform.Receipt
{
    /// <summary>
    /// Config startup.
    /// </summary>
    public class Startup
    {
        /// <summary>
        /// The key valt key for application insights.
        /// </summary>
        internal static readonly string VaultApplicationInsightsKey = "ApplicationInsights--InstrumentationKey--Receipt";

        /// <summary>
        /// The application insights key.
        /// </summary>
        internal static string ApplicationInsightsKey { get; set; }

        private readonly IWebHostEnvironment _env;

        private static readonly Logger _logger = new LoggerConfiguration()
           .WriteTo.Console()
           .CreateLogger();

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
            _logger.Information("Startup // ConfigureServices");

            services.AddControllersWithViews();
            GeneralSettings generalSettings = Configuration.GetSection("GeneralSettings").Get<GeneralSettings>();

            services.AddAuthentication(JwtCookieDefaults.AuthenticationScheme)
                .AddJwtCookie(JwtCookieDefaults.AuthenticationScheme, options =>
                {
                    options.ExpireTimeSpan = new TimeSpan(0, 30, 0);
                    options.Cookie.Name = generalSettings.RuntimeCookieName;
                    options.Cookie.Domain = generalSettings.Hostname;
                    options.MetadataAddress = generalSettings.OpenIdWellKnownEndpoint;
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuerSigningKey = true,
                        ValidateIssuer = false,
                        ValidateAudience = false,
                        RequireExpirationTime = true,
                        ValidateLifetime = true
                    };

                    if (_env.IsDevelopment())
                    {
                        options.RequireHttpsMetadata = false;
                    }
                });

            services.AddSingleton(Configuration);
            services.Configure<PlatformSettings>(Configuration.GetSection("PlatformSettings"));

            if (!string.IsNullOrEmpty(ApplicationInsightsKey))
            {
                services.AddSingleton(typeof(ITelemetryChannel), new ServerTelemetryChannel() { StorageFolder = "/tmp/logtelemetry" });
                services.AddApplicationInsightsTelemetry(ApplicationInsightsKey);

                _logger.Information($"Startup // ApplicationInsightsTelemetryKey = {ApplicationInsightsKey}");
            }
        }

        /// <summary>
        /// Default configuration for the config component.
        /// </summary>
        /// <param name="app">the application builder.</param>
        /// <param name="env">the hosting environment.</param>
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            _logger.Information("Startup // Configure");

            string authenticationEndpoint = string.Empty;
            if (Environment.GetEnvironmentVariable("PlatformSettings__ApiAuthenticationEndpoint") != null)
            {
                authenticationEndpoint = Environment.GetEnvironmentVariable("PlatformSettings__ApiAuthenticationEndpoint");
            }
            else
            {
                authenticationEndpoint = Configuration["PlatformSettings:ApiAuthenticationEndpoint"];
            }

            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }
            else
            {
                app.UseExceptionHandler("/Error");
            }

            app.UseStaticFiles();
            app.UseStatusCodePages(async context =>
            {
                var request = context.HttpContext.Request;
                var response = context.HttpContext.Response;
                string url = $"https://{request.Host.ToString()}{request.Path.ToString()}";

                // you may also check requests path to do this only for specific methods
                // && request.Path.Value.StartsWith("/specificPath")
                if (response.StatusCode == (int)HttpStatusCode.Unauthorized)
                {
                    response.Redirect($"{authenticationEndpoint}authentication?goto={url}");
                }
            });

            app.UseRouting();
            app.UseAuthentication();
            app.UseAuthorization();
            app.UseEndpoints(endpoints =>
              {
                  endpoints.MapControllers();
                  endpoints.MapControllerRoute(
                      name: "languageRoute",
                      pattern: "receipt/api/v1/{controller}/{action=Index}",
                      defaults: new { controller = "Language" },
                      constraints: new
                      {
                          controller = "Language",
                      });
              });
        }
    }
}
