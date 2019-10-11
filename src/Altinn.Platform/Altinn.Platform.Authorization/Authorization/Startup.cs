using Altinn.Authorization.ABAC.Interface;
using Altinn.Platform.Authorization.Clients;
using Altinn.Platform.Authorization.Configuration;
using Altinn.Platform.Authorization.ModelBinding;
using Altinn.Platform.Authorization.Services.Implementation;
using Altinn.Platform.Authorization.Services.Interface;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;

namespace Altinn.Platform.Authorization
{
    /// <summary>
    /// Authorization startup.
    /// </summary>
    public class Startup
    {
        /// <summary>
        ///  Initializes a new instance of the <see cref="Startup"/> class
        /// </summary>
        /// <param name="configuration">The configuration for the authorization component</param>
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        /// <summary>
        /// Gets authorization project configuration.
        /// </summary>
        public IConfiguration Configuration { get; }

        /// <summary>
        /// Configure authorization setttings for the service.
        /// </summary>
        /// <param name="services">the service configuration.</param>
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddControllers();
            services.AddSingleton(Configuration);
            services.AddSingleton<IParties, PartiesWrapper>();
            services.AddSingleton<IRoles, RolesWrapper>();
            services.AddSingleton<IContextHandler, ContextHandler>();
            services.AddSingleton<IPolicyRetrievalPoint, PolicyRetrievalPoint>();
            services.Configure<GeneralSettings>(Configuration.GetSection("GeneralSettings"));
            services.AddHttpClient<PartyClient>();
            services.AddHttpClient<RolesClient>();
            services.AddHttpClient<SBLClient>();
            services.TryAddSingleton<IHttpContextAccessor, HttpContextAccessor>();

            services.AddMvc(options =>
            {
                // Adding custom modelbinders
                options.ModelBinderProviders.Insert(0, new XacmlRequestApiModelBinderProvider());
            });
        }

        /// <summary>
        /// Default configuration for the authorization component.
        /// </summary>
        /// <param name="app">the application builder.</param>
        /// <param name="env">the hosting environment.</param>
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
