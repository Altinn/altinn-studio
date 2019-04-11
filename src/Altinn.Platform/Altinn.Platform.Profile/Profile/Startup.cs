using System;
using Altinn.Platform.Profile.Configuration;
using Altinn.Platform.Profile.Services.Implementation;
using Altinn.Platform.Profile.Services.Interfaces;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
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
            services.AddMvc().SetCompatibilityVersion(CompatibilityVersion.Version_2_2);
            services.AddMvc().AddControllersAsServices();
            services.AddSingleton(Configuration);
            services.Configure<GeneralSettings>(Configuration.GetSection("GeneralSettings"));

            bool shouldUseMock = true;
            if (Environment.GetEnvironmentVariable("GeneralSettings__ShouldUseMock") != null)
            {
                shouldUseMock = bool.Parse(Environment.GetEnvironmentVariable("GeneralSettings__ShouldUseMock"));
            }
            else
            {
                shouldUseMock = bool.Parse(Configuration["GeneralSettings:ShouldUseMock"]);
            }

            if (shouldUseMock)
            {
                services.AddSingleton<IUserProfiles, UserProfilesMockWrapper>();
            }
            else
            {
                services.AddSingleton<IUserProfiles, UserProfilesWrapper>();
            }
        }

        /// <summary>
        /// Default configuration for the profile component
        /// </summary>
        /// <param name="app">the application builder</param>
        /// <param name="env">the hosting environment</param>
        public void Configure(IApplicationBuilder app, IHostingEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }
            else
            {
                app.UseExceptionHandler("/Error");
            }

            // app.UseHttpsRedirection();
            app.UseMvc();
        }
    }
}
