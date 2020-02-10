using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using KubernetesWrapper.Services.Implementation;
using KubernetesWrapper.Services.Interfaces;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.HttpsPolicy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace KubernetesWrapper
{
    /// <summary>
    /// This is the class that set up the application during startup
    /// <see href="https://docs.microsoft.com/en-us/aspnet/core/fundamentals/startup#the-startup-class"/>
    /// </summary>
    public class Startup
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="Startup"/> class
        /// </summary>
        /// <param name="configuration">the configuration for designer</param>
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        /// <summary>
        /// Gets the application configuration
        /// </summary>
        public IConfiguration Configuration { get; }

        /// <summary>
        /// Configures the services available for the asp.net Core application
        /// <see href="https://docs.microsoft.com/en-us/aspnet/core/fundamentals/startup#the-configureservices-method"/>
        /// </summary>
        /// <param name="services">The services available for asp.net Core</param>
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddCors(options =>
            {
                options.AddDefaultPolicy(builder =>
                {
                    builder.AllowAnyOrigin();
                    builder.WithMethods("GET");
                    builder.AllowAnyHeader();
                });
            });
            services.AddControllers();

            // dependency injection
            services.AddSingleton<IKubernetesApiWrapper, KubernetesApiWrapper>();
        }

        /// <summary>
        /// Configure the application.
        /// <see href="https://docs.microsoft.com/en-us/aspnet/core/fundamentals/startup#the-configure-method"/>
        /// </summary>
        /// <param name="app">The application builder</param>
        /// <param name="env">Hosting environment</param>
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (env.EnvironmentName.Equals("Development"))
            {
                app.UseDeveloperExceptionPage();
            }
            else
            {
                app.UseHsts();
            }

            app.UseRouting();
            app.UseCors();
            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
            });
        }
    }
}
