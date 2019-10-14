using System;
using System.Security.Cryptography.X509Certificates;
using Altinn.Platform.Authentication.Configuration;
using AltinnCore.Authentication.Constants;
using AltinnCore.Authentication.JwtCookie;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.Platform.Authentication
{
    /// <summary>
    /// Authentication startup
    /// </summary>
    public class Startup
    {
        /// <summary>
        ///  Initializes a new instance of the <see cref="Startup"/> class
        /// </summary>
        /// <param name="configuration">The configuration for the authentication component</param>
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        /// <summary>
        /// Gets authentication project configuration
        /// </summary>
        public IConfiguration Configuration { get; }

        /// <summary>
        /// Configure authentication setttings for the service
        /// </summary>
        /// <param name="services">the service configuration</param>
        public void ConfigureServices(IServiceCollection services)
        {
            // Configure Authentication
            X509Certificate2 cert = new X509Certificate2("JWTValidationCert.cer");
            SecurityKey key = new X509SecurityKey(cert);

            services.AddControllers();
            services.AddMvc().AddControllersAsServices();
            services.AddSingleton(Configuration);
            services.Configure<GeneralSettings>(Configuration.GetSection("GeneralSettings"));
            services.Configure<KeyVaultSettings>(Configuration.GetSection("kvSetting"));
            services.Configure<CertificateSettings>(Configuration);
            services.Configure<CertificateSettings>(Configuration.GetSection("CertificateSettings"));
            services.AddAuthentication(JwtCookieDefaults.AuthenticationScheme)
                .AddJwtCookie(JwtCookieDefaults.AuthenticationScheme, options =>
                    {
                        options.ExpireTimeSpan = new TimeSpan(0, 30, 0);
                        options.Cookie.Name = "AltinnStudioRuntime";
                        options.Cookie.Domain = "at21.altinn.cloud";
                        options.TokenValidationParameters = new TokenValidationParameters
                        {
                            ValidateIssuerSigningKey = true,
                            IssuerSigningKey = key,
                            ValidateIssuer = false,
                            ValidateAudience = false,
                            RequireExpirationTime = true,
                            ValidateLifetime = true
                        };
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
            }
            else
            {
                app.UseExceptionHandler("/Error");
            }

            app.UseRouting();
            app.UseAuthentication();
            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
            });
        }
    }
}
