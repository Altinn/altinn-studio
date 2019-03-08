using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Configuration;
using Altinn.Platform.Storage.Models;
using Altinn.Platform.Storage.Repository;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.HttpsPolicy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Storage
{
    /// <summary>
    /// database startup
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
        /// configure database setttings for the service
        /// </summary>
        /// <param name="services">the service configuration</param>        
        public void ConfigureServices(IServiceCollection services)
        {
            services.Configure<AzureCosmosSettings>(Configuration.GetSection("AzureCosmosSettings"));
            services.Configure<AzureStorageConfiguration>(Configuration.GetSection("AzureStorageConfiguration"));
            services.AddSingleton<IDataRepository, DataRepository>();
            services.AddSingleton<IInstanceRepository, InstanceRepository>();

            services.AddMvc().SetCompatibilityVersion(CompatibilityVersion.Version_2_1);
            services.AddMvc().AddControllersAsServices();
        }

        /// <summary>
        /// default configuration
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

                //app.UseHsts();
            }

            //app.UseHttpsRedirection();
            app.UseMvc();
        }
    }
}
