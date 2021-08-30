using System;
using System.IO;
using System.Reflection;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Health;
using Altinn.Studio.Designer.Infrastructure;
using Altinn.Studio.Designer.Infrastructure.Authorization;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.TypedHttpClients;
using Microsoft.ApplicationInsights.Extensibility;
using Microsoft.ApplicationInsights.Extensibility.EventCounterCollector;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Headers;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Net.Http.Headers;
using Microsoft.OpenApi.Models;
using Npgsql.Logging;
using Yuniql.AspNetCore;
using Yuniql.PostgreSql;

namespace Altinn.Studio.Designer
{
    /// <summary>
    /// This is the class that set up the application during startup
    /// <see href="https://docs.asp.net/en/latest/fundamentals/startup.html#the-startup-class"/>
    /// </summary>
    public class Startup
    {
        private IWebHostEnvironment CurrentEnvironment { get; set; }

        /// <summary>
        /// Gets the application configuration
        /// </summary>
        public IConfiguration Configuration { get; }

        private readonly ILogger<Startup> _logger;

        /// <summary>
        /// The application insights key.
        /// </summary>
        internal static string ApplicationInsightsKey { get; set; }

        /// <summary>
        /// Initializes a new instance of the <see cref="Startup"/> class
        /// </summary>
        /// <param name="configuration">The configuration for designer</param>
        /// <param name="loggerFactory">The logger factory</param>
        /// <param name="env">The environment</param>
        public Startup(IConfiguration configuration, ILoggerFactory loggerFactory, IWebHostEnvironment env)
        {
            Configuration = configuration;
            CurrentEnvironment = env;
            _logger = loggerFactory.CreateLogger<Startup>();
        }

        /// <summary>
        /// Configures the services available for the asp.net Core application
        /// <see href="https://docs.microsoft.com/en-us/aspnet/core/fundamentals/startup#the-configureservices-method"/>
        /// </summary>
        /// <param name="services">The services available for asp.net Core</param>
        public void ConfigureServices(IServiceCollection services)
        {
            Console.WriteLine($"// Program.cs // ConfigureServices // Attempting to configure services.");

            services.Configure<KestrelServerOptions>(options =>
            {
                options.AllowSynchronousIO = true;
            });

            services.RegisterServiceImplementations(Configuration);

            services.AddHttpContextAccessor();
            services.AddMemoryCache();
            services.AddResponseCompression();
            services.AddHealthChecks().AddCheck<HealthCheck>("designer_health_check");
            Console.WriteLine($"// Program.cs // ConfigureServices // Health check successfully added.");

            CreateDirectory();

            services.ConfigureDataProtection(Configuration, _logger);
            services.ConfigureMvc();
            services.ConfigureSettings(Configuration);
            
            services.RegisterTypedHttpClients(Configuration);
            services.ConfigureAuthentication(Configuration, CurrentEnvironment);
            
            Console.WriteLine($"// Program.cs // ConfigureServices // Configure authentication successfully added.");

            // Add application insight telemetry
            if (!string.IsNullOrEmpty(ApplicationInsightsKey))
            {
                services.AddApplicationInsightsTelemetry(ApplicationInsightsKey);
                services.ConfigureTelemetryModule<EventCounterCollectionModule>(
                    (module, o) =>
                    {
                        module.Counters.Clear();
                        module.Counters.Add(new EventCounterCollectionRequest("System.Runtime", "threadpool-queue-length"));
                        module.Counters.Add(new EventCounterCollectionRequest("System.Runtime", "threadpool-thread-count"));
                        module.Counters.Add(new EventCounterCollectionRequest("System.Runtime", "monitor-lock-contention-count"));
                        module.Counters.Add(new EventCounterCollectionRequest("System.Runtime", "gc-heap-size"));
                        module.Counters.Add(new EventCounterCollectionRequest("System.Runtime", "time-in-gc"));
                        module.Counters.Add(new EventCounterCollectionRequest("System.Runtime", "working-set"));
                    });
                services.AddApplicationInsightsTelemetryProcessor<HealthTelemetryFilter>();
                services.AddSingleton<ITelemetryInitializer, CustomTelemetryInitializer>();
                Console.WriteLine($"// Program.cs // ConfigureServices // Successfully added AI config.");
            }

            services.ConfigureLocalization();
            services.AddPolicyBasedAuthorization();

            services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo { Title = "Altinn Designer API", Version = "v1" });
                try
                {
                    c.IncludeXmlComments(GetXmlCommentsPathForControllers());
                }
                catch
                {
                    // Catch swashbuckle exception if it doesn't find the generated XML documentation file
                }
            });
            Console.WriteLine($"// Program.cs // ConfigureServices // Function complete. Successfully added swagger.");
        }

        /// <summary>
        /// Configure the application.
        /// <see href="https://docs.microsoft.com/en-us/aspnet/core/fundamentals/startup#the-configure-method"/>
        /// </summary>
        /// <param name="appBuilder">The application builder</param>
        /// <param name="env">Hosting environment</param>
        public void Configure(IApplicationBuilder appBuilder, IWebHostEnvironment env)
        {
            if (env.IsDevelopment() || env.IsStaging())
            {
                appBuilder.UseExceptionHandler("/error-local-development");
            }
            else
            {
                appBuilder.UseExceptionHandler("/error");
            }

            if (Configuration.GetValue<bool>("PostgreSQLSettings:EnableDBConnection"))
            {
                NpgsqlLogManager.Provider = new ConsoleLoggingProvider(NpgsqlLogLevel.Trace, true, true);

                ConsoleTraceService traceService = new ConsoleTraceService { IsDebugEnabled = true };

                string connectionString = string.Format(
                    Configuration.GetValue<string>("PostgreSQLSettings:AdminConnectionString"),
                    Configuration.GetValue<string>("PostgreSQLSettings:DesignerDbAdminPwd"));

                appBuilder.UseYuniql(
                    new PostgreSqlDataService(traceService),
                    new PostgreSqlBulkImportService(traceService),
                    traceService,
                    new Yuniql.AspNetCore.Configuration
                    {
                        Workspace = Path.Combine(Environment.CurrentDirectory, Configuration.GetValue<string>("PostgreSQLSettings:WorkspacePath")),
                        ConnectionString = connectionString,
                        IsAutoCreateDatabase = false,
                        IsDebug = true
                    });
            }
            
            Console.WriteLine($"// Program.cs // Configure // Trying to use static files.");

            appBuilder.UseStaticFiles(new StaticFileOptions
            {
                OnPrepareResponse = context =>
                {
                    ResponseHeaders headers = context.Context.Response.GetTypedHeaders();
                    headers.CacheControl = new CacheControlHeaderValue
                    {
                        Public = true,
                        MaxAge = TimeSpan.FromMinutes(60),
                    };
                },
            });

            Console.WriteLine($"// Program.cs // Configure // Successfully using static files.");

            const string swaggerRoutePrefix = "designer/swagger";
            appBuilder.UseSwagger(c =>
            {
                c.RouteTemplate = swaggerRoutePrefix + "/{documentName}/swagger.json";
            });
            appBuilder.UseSwaggerUI(c =>
            {
                c.RoutePrefix = swaggerRoutePrefix;
                c.SwaggerEndpoint($"/{swaggerRoutePrefix}/v1/swagger.json", "Altinn Designer API V1");
            });

            appBuilder.UseRouting();

            if (!env.IsDevelopment())
            {
                appBuilder.UseHsts();
                appBuilder.UseHttpsRedirection();
            }

            appBuilder.UseAuthentication();
            appBuilder.UseAuthorization();

            appBuilder.UseResponseCompression();
            appBuilder.UseRequestLocalization();

            Console.WriteLine($"// Program.cs // Configure // Attempting to add endpoints.");

            appBuilder.UseEndpoints(endpoints =>
            {
                // ------------------------- DEV ----------------------------- //
                endpoints.MapControllerRoute(
                    name: "orgRoute",
                    pattern: "designer/{org}/{controller}/{action=Index}/",
                    defaults: new { controller = "Config" },
                    constraints: new
                    {
                        controller = "Config|Datamodels",
                    });

                endpoints.MapControllerRoute(
                        name: "serviceDevelopmentRoute",
                        pattern: "designer/{org}/{app}",
                        defaults: new { controller = "ServiceDevelopment", action = "index" },
                        constraints: new
                        {
                            app = "^[a-z]+[a-zA-Z0-9-]+[a-zA-Z0-9]$",
                        });

                endpoints.MapControllerRoute(
                        name: "designerApiRoute",
                        pattern: "designerapi/{controller}/{action=Index}/{id?}",
                        defaults: new { controller = "Repository" },
                        constraints: new
                        {
                            controller = @"(Repository|Language|User)",
                        });
                endpoints.MapControllerRoute(
                          name: "serviceRoute",
                          pattern: "designer/{org}/{app}/{controller}/{action=Index}/{id?}",
                          defaults: new { controller = "Service" },
                          constraints: new
                          {
                              controller = @"(Config|RuntimeAPI|ManualTesting|Model|Rules|ServiceMetadata|Text|UI|UIEditor|ServiceDevelopment)",
                              app = "^[a-z]+[a-zA-Z0-9-]+[a-zA-Z0-9]$",
                              id = "[a-zA-Z0-9_\\-\\.]{1,30}",
                          });

                endpoints.MapControllerRoute(
                       name: "applicationMetadataApiRoute",
                       pattern: "designer/api/v1/{org}/{app}",
                       defaults: new { controller = "ApplicationMetadata", action = "ApplicationMetadata" });

                endpoints.MapControllerRoute(
                        name: "reposRoute",
                        pattern: "{controller}/{action}/",
                        defaults: new { controller = "RedirectController" });

                // -------------------------- DEFAULT ------------------------- //
                endpoints.MapControllerRoute(
                   name: "defaultRoute2",
                   pattern: "{controller}/{action=StartPage}/{id?}",
                   defaults: new { controller = "Home" });

                endpoints.MapControllerRoute(
                    name: "defaultRoute",
                    pattern: "{action=StartPage}/{id?}",
                    defaults: new { controller = "Home" });

                // ---------------------- MONITORING -------------------------- //
                endpoints.MapHealthChecks("/health");
            });

            Console.WriteLine($"// Program.cs // Configure // Successfully added endpoints.");
        }

        private void CreateDirectory()
        {
            Console.WriteLine($"// Program.cs // CreateDirectory // Trying to create directory");

            // TODO: Figure out how appsettings.json parses values and merges with environment variables and use these here.
            // Since ":" is not valid in environment variables names in kubernetes, we can't use current docker-compose environment variables
            string repoLocation = Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") ??
                                 Configuration["ServiceRepositorySettings:RepositoryLocation"];

            if (!Directory.Exists(repoLocation))
            {
                Directory.CreateDirectory(repoLocation);
                Console.WriteLine($"// Program.cs // CreateDirectory // Successfully created directory");
            }
        }

        private static string GetXmlCommentsPathForControllers()
        {
            // locate the xml file being generated by .NET
            string xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.XML";
            string xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);

            return xmlPath;
        }
    }
}
