using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;

using Microsoft.AspNetCore;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Azure.KeyVault;
using Microsoft.Azure.KeyVault.Models;
using Microsoft.Azure.Services.AppAuthentication;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Configuration.AzureKeyVault;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

ILogger logger;

var builder = WebApplication.CreateBuilder(args);

ConfigureSetupLogging();

await SetConfigurationProviders(builder.Configuration);

ConfigureLogging(builder.Logging);

ConfigureServices(builder.Services, builder.Configuration);

var app = builder.Build();

Configure();

app.Run();

/// <summary>
/// Configure logging for setting up application. Temporary
/// </summary>
void ConfigureSetupLogging()
{
    // Setup logging for the web host creation
    var logFactory = LoggerFactory.Create(builder =>
    {
        builder
            .AddFilter("Microsoft", LogLevel.Warning)
            .AddFilter("System", LogLevel.Warning)
            .AddFilter("Altinn.Studio.Designer.Program", LogLevel.Debug)
            .AddConsole();
    });

    _logger = logFactory.CreateLogger<Program>();
}

async Task SetConfigurationProviders(ConfigurationManager config)
{
    config.AddJsonFile("altinn-appsettings/altinn-appsettings-secret.json", optional: true, reloadOnChange: true);
    IWebHostEnvironment hostingEnvironment = hostingContext.HostingEnvironment;
    string envName = hostingEnvironment.EnvironmentName;

    config.AddJsonFile("appsettings.json", optional: false, reloadOnChange: true);

    config.AddEnvironmentVariables();
    config.AddCommandLine(args);

    IConfiguration stageOneConfig = config.Build();

    string appId = stageOneConfig.GetValue<string>("KvSetting:ClientId");
    string tenantId = stageOneConfig.GetValue<string>("KvSetting:TenantId");
    string appKey = stageOneConfig.GetValue<string>("KvSetting:ClientSecret");
    string keyVaultEndpoint = stageOneConfig.GetValue<string>("KvSetting:SecretUri");

    if (!string.IsNullOrEmpty(appId) && !string.IsNullOrEmpty(tenantId)
        && !string.IsNullOrEmpty(appKey) && !string.IsNullOrEmpty(keyVaultEndpoint))
    {
        AzureServiceTokenProvider azureServiceTokenProvider = new AzureServiceTokenProvider($"RunAs=App;AppId={appId};TenantId={tenantId};AppKey={appKey}");
        KeyVaultClient keyVaultClient = new KeyVaultClient(
            new KeyVaultClient.AuthenticationCallback(
                azureServiceTokenProvider.KeyVaultTokenCallback));
        config.AddAzureKeyVault(
            keyVaultEndpoint, keyVaultClient, new DefaultKeyVaultSecretManager());
        try
        {
            string secretId = "ApplicationInsights--InstrumentationKey";
            SecretBundle secretBundle = keyVaultClient.GetSecretAsync(
                keyVaultEndpoint, secretId).Result;

            Startup.ApplicationInsightsKey = secretBundle.Value;
        }
        catch (Exception vaultException)
        {
            _logger.LogError($"Could not find secretBundle for application insights {vaultException}");
        }
    }

    if (hostingEnvironment.IsDevelopment() && !Directory.GetCurrentDirectory().Contains("app"))
    {
        config.AddJsonFile(Directory.GetCurrentDirectory() + $"/appsettings.{envName}.json", optional: true, reloadOnChange: true);
        Assembly assembly = Assembly.Load(new AssemblyName(hostingEnvironment.ApplicationName));
        if (assembly != null)
        {
            config.AddUserSecrets(assembly, true);
        }
    }
}

void ConfigureLogging(ILoggingBuilder loggingBuilder)
{
    // The default ASP.NET Core project templates call CreateDefaultBuilder, which adds the following logging providers:
    // Console, Debug, EventSource
    // https://docs.microsoft.com/en-us/aspnet/core/fundamentals/logging/?view=aspnetcore-3.1

    // Clear log providers
    builder.ClearProviders();

    // Setup up application insight if ApplicationInsightsKey is available
    if (!string.IsNullOrEmpty(Startup.ApplicationInsightsKey))
    {
        // Add application insights https://docs.microsoft.com/en-us/azure/azure-monitor/app/ilogger
        // Providing an instrumentation key here is required if you're using
        // standalone package Microsoft.Extensions.Logging.ApplicationInsights
        // or if you want to capture logs from early in the application startup
        // pipeline from Startup.cs or Program.cs itself.
        builder.AddApplicationInsights(Startup.ApplicationInsightsKey);

        // Optional: Apply filters to control what logs are sent to Application Insights.
        // The following configures LogLevel Information or above to be sent to
        // Application Insights for all categories.
        builder.AddFilter<Microsoft.Extensions.Logging.ApplicationInsights.ApplicationInsightsLoggerProvider>(string.Empty, LogLevel.Warning);

        // Adding the filter below to ensure logs of all severity from Program.cs
        // is sent to ApplicationInsights.
        builder.AddFilter<Microsoft.Extensions.Logging.ApplicationInsights.ApplicationInsightsLoggerProvider>(typeof(Program).FullName, LogLevel.Trace);

        // Adding the filter below to ensure logs of all severity from Startup.cs
        // is sent to ApplicationInsights.
        builder.AddFilter<Microsoft.Extensions.Logging.ApplicationInsights.ApplicationInsightsLoggerProvider>(typeof(Startup).FullName, LogLevel.Trace);
    }
    else
    {
        // If not application insight is available log to console
        builder.AddFilter("Microsoft", LogLevel.Warning);
        builder.AddFilter("System", LogLevel.Warning);
        builder.AddConsole();
    }
}

void ConfigureServices(IServiceCollection services, IConfiguration configuration)
{
    logger.LogInformation($"// Program.cs // ConfigureServices // Attempting to configure services.");

    services.Configure<KestrelServerOptions>(options =>
    {
        options.AllowSynchronousIO = true;
    });

    services.RegisterServiceImplementations(Configuration);

    services.AddHttpContextAccessor();
    services.AddMemoryCache();
    services.AddResponseCompression();
    services.AddHealthChecks().AddCheck<HealthCheck>("designer_health_check");

    CreateDirectory();

    services.ConfigureDataProtection(Configuration, _logger);
    services.ConfigureMvc();
    services.ConfigureSettings(Configuration);

    services.RegisterTypedHttpClients(Configuration);
    services.ConfigureAuthentication(Configuration, CurrentEnvironment);

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
    logger.LogInformation($"// Program.cs // ConfigureServices // Configuration complete");
}

void Configure()
{
    logger.LogInformation($"// Program.cs // Configure // Attempting to configure env.");
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
    logger.LogInformation($"// Program.cs // Configure // Configuration complete");
}