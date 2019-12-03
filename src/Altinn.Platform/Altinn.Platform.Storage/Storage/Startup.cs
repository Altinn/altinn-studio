using System;
using System.IO;
using System.Reflection;
using Altinn.Platform.Storage.Configuration;
using Altinn.Platform.Storage.Repository;
using AltinnCore.Authentication.JwtCookie;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Authorization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.OpenApi.Models;

namespace Altinn.Platform.Storage
{
    /// <summary>
    /// The database startup
    /// </summary>
    public class Startup
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="Startup"/> class
        /// </summary>
        /// <param name="configuration">the configuration for the database</param>
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
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
            services.AddControllers(config =>
            {
                ////AuthorizationPolicy policy = new AuthorizationPolicyBuilder()
                ////    .AddAuthenticationSchemes(JwtCookieDefaults.AuthenticationScheme)
                ////    .RequireAuthenticatedUser()
                ////    .Build();
                ////config.Filters.Add(new AuthorizeFilter(policy));
            }).AddNewtonsoftJson();
            services.Configure<AzureCosmosSettings>(Configuration.GetSection("AzureCosmosSettings"));
            services.Configure<AzureStorageConfiguration>(Configuration.GetSection("AzureStorageConfiguration"));
            services.Configure<GeneralSettings>(Configuration.GetSection("GeneralSettings"));

            ////GeneralSettings generalSettings = Configuration.GetSection("GeneralSettings").Get<GeneralSettings>();

            ////services.AddAuthentication(JwtCookieDefaults.AuthenticationScheme)
            ////    .AddJwtCookie(JwtCookieDefaults.AuthenticationScheme, options =>
            ////    {
            ////        options.ExpireTimeSpan = new TimeSpan(0, 30, 0);
            ////        options.Cookie.Name = generalSettings.RuntimeCookieName;
            ////        options.Cookie.Domain = generalSettings.Hostname;
            ////        options.MetadataAddress = generalSettings.OpenIdWellKnownEndpoint;
            ////    });

            services.AddSingleton<IDataRepository, DataRepository>();
            services.AddSingleton<IInstanceRepository, InstanceRepository>();
            services.AddSingleton<IApplicationRepository, ApplicationRepository>();
            services.AddSingleton<IInstanceEventRepository, InstanceEventRepository>();            

            string applicationInsightTelemetryKey = GetApplicationInsightsKeyFromEnvironment();
            if (!string.IsNullOrEmpty(applicationInsightTelemetryKey))
            {
                services.AddApplicationInsightsTelemetry(applicationInsightTelemetryKey);
            }

            // Add Swagger support (Swashbuckle)
            services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo { Title = "Altinn Platform Storage", Version = "v1" });
                ////c.AddSecurityDefinition(JwtCookieDefaults.AuthenticationScheme, new OpenApiSecurityScheme
                ////{
                ////    Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\". Remember to add \"Bearer\" to the input below before your token.",
                ////    Name = "Authorization",
                ////    In = ParameterLocation.Header,
                ////    Type = SecuritySchemeType.ApiKey,
                ////});
                ////c.AddSecurityRequirement(new OpenApiSecurityRequirement
                ////{
                ////    {
                ////        new OpenApiSecurityScheme
                ////        {
                ////            Reference = new OpenApiReference
                ////            {
                ////                Id = JwtCookieDefaults.AuthenticationScheme,
                ////                Type = ReferenceType.SecurityScheme
                ////            }
                ////        },
                ////        new string[] { }
                ////    }
                ////});
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
        }

        private string GetXmlCommentsPathForControllers()
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
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }
            else
            {
                app.UseExceptionHandler("/Error");

                // app.UseHsts();
            }

            app.UseSwagger(o => o.RouteTemplate = "storage/swagger/{documentName}/swagger.json");

            app.UseSwaggerUI(c =>
            {
                c.SwaggerEndpoint("/storage/swagger/v1/swagger.json", "Altinn Platform Storage API");
                c.RoutePrefix = "storage/swagger";
            });

            // app.UseHttpsRedirection();
            app.UseRouting();
            ////app.UseAuthentication();
            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
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
