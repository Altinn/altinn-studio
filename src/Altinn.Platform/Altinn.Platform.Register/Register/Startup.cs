using Altinn.Platform.Register.Configuration;
using Altinn.Platform.Register.Services.Implementation;
using Altinn.Platform.Register.Services.Interfaces;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Altinn.Platform.Register
{
    /// <summary>
    /// Register startup
    /// </summary>
    public class Startup
    {
        /// <summary>
        ///  Initializes a new instance of the <see cref="Startup"/> class
        /// </summary>
        /// <param name="configuration">The configuration for the register component</param>
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        /// <summary>
        /// Gets register project configuration
        /// </summary>
        public IConfiguration Configuration { get; }

        /// <summary>
        /// Configure register setttings for the service
        /// </summary>
        /// <param name="services">the service configuration</param>
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddControllers();
            services.AddSingleton(Configuration);
            services.Configure<GeneralSettings>(Configuration.GetSection("GeneralSettings"));
            services.AddSingleton<IOrganizations, OrganizationsWrapper>();
            services.AddSingleton<IPersons, PersonsWrapper>();
            services.AddSingleton<IParties, PartiesWrapper>();
        }

        /// <summary>
        /// Default configuration for the register component
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
