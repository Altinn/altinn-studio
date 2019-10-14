using System;
using Altinn.Platform.Profile.Configuration;
using Altinn.Platform.Profile.Services.Implementation;
using Altinn.Platform.Profile.Services.Interfaces;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Profile
{
    /// <summary>
    /// Profile startup
    /// </summary>
    public class Startup
    {
        /// <summary>
        ///  Initializes a new instance of the <see cref="Startup"/> class
        /// </summary>
        /// <param name="configuration">The configuration for the profile component</param>
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        /// <summary>
        /// Gets profile project configuration
        /// </summary>
        public IConfiguration Configuration { get; }

        /// <summary>
        /// Configure profile setttings for the service
        /// </summary>
        /// <param name="services">the service configuration</param>
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddControllers();
            services.AddMvc().AddControllersAsServices();

            services.Configure<GeneralSettings>(Configuration.GetSection("GeneralSettings"));
            services.AddSingleton(Configuration);
            services.AddSingleton<IUserProfiles, UserProfilesWrapper>();
        }

        /// <summary>
        /// Default configuration for the profile component
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

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
            });
        }
    }
}
