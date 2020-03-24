using System.Reflection;
using Altinn.Authorization.ABAC.Interface;
using Altinn.Platform.Authorization.Clients;
using Altinn.Platform.Authorization.Configuration;
using Altinn.Platform.Authorization.ModelBinding;
using Altinn.Platform.Authorization.Repositories;
using Altinn.Platform.Authorization.Repositories.Interface;
using Altinn.Platform.Authorization.Services.Implementation;
using Altinn.Platform.Authorization.Services.Interface;
using Altinn.Platform.Telemetry;
using Microsoft.ApplicationInsights.Channel;
using Microsoft.ApplicationInsights.Extensibility;
using Microsoft.ApplicationInsights.WindowsServer.TelemetryChannel;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.OpenApi.Models;

namespace Altinn.Platform.Authorization
{
    /// <summary>
    /// Authorization startup.
    /// </summary>
    public class Startup
    {
        /// <summary>
        /// The key valt key for application insights.
        /// </summary>
        internal static readonly string VaultApplicationInsightsKey = "ApplicationInsights--InstrumentationKey";

        /// <summary>
        /// The application insights key.
        /// </summary>
        internal static string ApplicationInsightsKey { get; set; }

        private readonly ILogger<Startup> _logger;

        /// <summary>
        ///  Initializes a new instance of the <see cref="Startup"/> class
        /// </summary>
        public Startup(ILogger<Startup> logger, IConfiguration configuration)
        {
            Configuration = configuration;
            _logger = logger;
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
            _logger.LogInformation("Startup // ConfigureServices");

            services.AddControllers().AddXmlSerializerFormatters(); 
            services.AddSingleton(Configuration);
            services.AddSingleton<IParties, PartiesWrapper>();
            services.AddSingleton<IRoles, RolesWrapper>();
            services.AddSingleton<IContextHandler, ContextHandler>();
            services.AddSingleton<IPolicyRetrievalPoint, PolicyRetrievalPoint>();
            services.AddSingleton<IPolicyRepository, PolicyRepository>();
            services.AddSingleton<IPolicyInformationRepository, PolicyInformationRepository>();
            services.Configure<GeneralSettings>(Configuration.GetSection("GeneralSettings"));
            services.Configure<AzureStorageConfiguration>(Configuration.GetSection("AzureStorageConfiguration"));
            services.Configure<AzureCosmosSettings>(Configuration.GetSection("AzureCosmosSettings"));
            services.AddHttpClient<PartyClient>();
            services.AddHttpClient<RolesClient>();
            services.AddHttpClient<SBLClient>();
            services.TryAddSingleton<IHttpContextAccessor, HttpContextAccessor>();

            services.Configure<KestrelServerOptions>(options =>
            {
                options.AllowSynchronousIO = true;
            });

            if (!string.IsNullOrEmpty(ApplicationInsightsKey))
            {
                services.AddSingleton(typeof(ITelemetryChannel), new ServerTelemetryChannel() { StorageFolder = "/tmp/logtelemetry" });
                services.AddApplicationInsightsTelemetry(ApplicationInsightsKey);
                services.AddSingleton<ITelemetryInitializer, CustomTelemetryInitializer>();

                _logger.LogInformation($"Startup // ApplicationInsightsTelemetryKey = {ApplicationInsightsKey}");
            }

            services.AddMvc(options =>
            {
                // Adding custom modelbinders
                options.ModelBinderProviders.Insert(0, new XacmlRequestApiModelBinderProvider());
                options.RespectBrowserAcceptHeader = true;
            });

            // Add Swagger support (Swashbuckle)
            services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo { Title = "Altinn Platform Authorization", Version = "v1" });

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

        private string GetXmlCommentsPathForControllers()
        {
            // locate the xml file being generated by .NET
            string xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
            return xmlFile;
        }

        /// <summary>
        /// Default configuration for the authorization component.
        /// </summary>
        /// <param name="app">the application builder.</param>
        /// <param name="env">the hosting environment.</param>
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            _logger.LogInformation("Startup // Configure");

            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
                _logger.LogInformation("IsDevelopment");
            }
            else
            {
                app.UseExceptionHandler("/Error");
            }

            app.UseSwagger(o => o.RouteTemplate = "authorization/swagger/{documentName}/swagger.json");

            app.UseSwaggerUI(c =>
            {
                c.SwaggerEndpoint("/authorization/swagger/v1/swagger.json", "Altinn Platform Authorization API");
                c.RoutePrefix = "authorization/swagger";
            });

            app.UseRouting();
            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
            });
        }
    }
}
