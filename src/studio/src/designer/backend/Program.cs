using System;
using System.IO;
using System.Reflection;
using System.Threading.Tasks;
using Altinn.Common.AccessToken.Configuration;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Health;
using Altinn.Studio.Designer.Infrastructure;
using Altinn.Studio.Designer.Infrastructure.Authorization;
using Altinn.Studio.Designer.TypedHttpClients;
using Microsoft.ApplicationInsights.Extensibility;
using Microsoft.ApplicationInsights.Extensibility.EventCounterCollector;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Headers;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.Azure.KeyVault;
using Microsoft.Azure.KeyVault.Models;
using Microsoft.Azure.Services.AppAuthentication;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Configuration.AzureKeyVault;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Net.Http.Headers;
using Microsoft.OpenApi.Models;
using Yuniql.AspNetCore;
using Yuniql.PostgreSql;

ILogger logger;

string applicationInsightsKey = string.Empty;

ConfigureSetupLogging();

var builder = WebApplication.CreateBuilder(args);

await SetConfigurationProviders(builder.Configuration, builder.Environment);

ConfigureLogging(builder.Logging);

ConfigureServices(builder.Services, builder.Configuration, builder.Environment);

var app = builder.Build();

Configure(builder.Configuration);

app.Run();

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

    logger = logFactory.CreateLogger<Program>();
}

async Task SetConfigurationProviders(ConfigurationManager config, IWebHostEnvironment hostingEnvironment)
{
    logger.LogInformation($"// Program.cs // SetConfigurationProviders // Attempting to configure providers.");
    string basePath = Directory.GetParent(Directory.GetCurrentDirectory()).FullName;
    config.SetBasePath(basePath);
    config.AddJsonFile(basePath + "app/altinn-appsettings/altinn-appsettings-secret.json", optional: true, reloadOnChange: true);
    string envName = hostingEnvironment.EnvironmentName;

    if (basePath == "/")
    {
        config.AddJsonFile(basePath + "app/appsettings.json", optional: false, reloadOnChange: true);
    }
    else
    {
        config.AddJsonFile(Directory.GetCurrentDirectory() + "/appsettings.json", optional: false, reloadOnChange: true);
    }

    config.AddEnvironmentVariables();
    config.AddCommandLine(args);

    KeyVaultSettings keyVaultSettings = new KeyVaultSettings();
    config.GetSection("kvSetting").Bind(keyVaultSettings);

    if (!string.IsNullOrEmpty(keyVaultSettings.ClientId) &&
        !string.IsNullOrEmpty(keyVaultSettings.TenantId) &&
        !string.IsNullOrEmpty(keyVaultSettings.ClientSecret) &&
        !string.IsNullOrEmpty(keyVaultSettings.SecretUri))
    {
        logger.LogInformation($"// Program.cs // SetConfigurationProviders // Attempting to configure KeyVault.");
        AzureServiceTokenProvider azureServiceTokenProvider = new AzureServiceTokenProvider($"RunAs=App;AppId={keyVaultSettings.ClientId};TenantId={keyVaultSettings.TenantId};AppKey={keyVaultSettings.ClientSecret}");
        KeyVaultClient keyVaultClient = new KeyVaultClient(
            new KeyVaultClient.AuthenticationCallback(
                azureServiceTokenProvider.KeyVaultTokenCallback));
        config.AddAzureKeyVault(
            keyVaultSettings.SecretUri, keyVaultClient, new DefaultKeyVaultSecretManager());
        try
        {
            string secretId = "ApplicationInsights--InstrumentationKey";
            SecretBundle secretBundle = await keyVaultClient.GetSecretAsync(
                keyVaultSettings.SecretUri, secretId);

            applicationInsightsKey = secretBundle.Value;
        }
        catch (Exception vaultException)
        {
            logger.LogError(vaultException, $"Could not find secretBundle for application insights");
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

    logger.LogInformation($"// Program.cs // SetConfigurationProviders // Configured providers.");
}

void ConfigureLogging(ILoggingBuilder builder)
{
    // The default ASP.NET Core project templates call CreateDefaultBuilder, which adds the following logging providers:
    // Console, Debug, EventSource
    // https://docs.microsoft.com/en-us/aspnet/core/fundamentals/logging/?view=aspnetcore-3.1

    // Clear log providers
    builder.ClearProviders();

    // Setup up application insight if ApplicationInsightsKey is available
    if (!string.IsNullOrEmpty(applicationInsightsKey))
    {
        // Add application insights https://docs.microsoft.com/en-us/azure/azure-monitor/app/ilogger
        // Providing an instrumentation key here is required if you're using
        // standalone package Microsoft.Extensions.Logging.ApplicationInsights
        // or if you want to capture logs from early in the application startup
        // pipeline from Startup.cs or Program.cs itself.
        builder.AddApplicationInsights(applicationInsightsKey);

        // Optional: Apply filters to control what logs are sent to Application Insights.
        // The following configures LogLevel Information or above to be sent to
        // Application Insights for all categories.
        builder.AddFilter<Microsoft.Extensions.Logging.ApplicationInsights.ApplicationInsightsLoggerProvider>(string.Empty, LogLevel.Warning);

        // Adding the filter below to ensure logs of all severity from Program.cs
        // is sent to ApplicationInsights.
        builder.AddFilter<Microsoft.Extensions.Logging.ApplicationInsights.ApplicationInsightsLoggerProvider>(typeof(Program).FullName, LogLevel.Trace);
    }
    else
    {
        // If not application insight is available log to console
        builder.AddFilter("Microsoft", LogLevel.Warning);
        builder.AddFilter("System", LogLevel.Warning);
        builder.AddConsole();
    }
}

void ConfigureServices(IServiceCollection services, IConfiguration configuration, IWebHostEnvironment env)
{
    logger.LogInformation($"// Program.cs // ConfigureServices // Attempting to configure services.");

    services.Configure<KestrelServerOptions>(options =>
    {
        options.AllowSynchronousIO = true;
    });

    services.RegisterServiceImplementations(configuration);

    services.AddHttpContextAccessor();
    services.AddMemoryCache();
    services.AddResponseCompression();
    services.AddHealthChecks().AddCheck<HealthCheck>("designer_health_check");

    CreateDirectory(configuration);

    services.ConfigureDataProtection(configuration, logger);
    services.ConfigureMvc();
    services.ConfigureSettings(configuration);

    services.RegisterTypedHttpClients(configuration);
    services.ConfigureAuthentication(configuration, env);

    // Add application insight telemetry
    if (!string.IsNullOrEmpty(applicationInsightsKey))
    {
        services.AddApplicationInsightsTelemetry(applicationInsightsKey);
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

    services.AddLocalization(options => options.ResourcesPath = "Resources");

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

void Configure(IConfiguration configuration)
{
    logger.LogInformation($"// Program.cs // Configure // Attempting to configure env.");
    if (app.Environment.IsDevelopment() || app.Environment.IsStaging())
    {
        app.UseExceptionHandler("/error-local-development");
    }
    else
    {
        app.UseExceptionHandler("/error");
    }

    if (configuration.GetValue<bool>("PostgreSQLSettings:EnableDBConnection"))
    {
        ConsoleTraceService traceService = new ConsoleTraceService { IsDebugEnabled = true };

        string connectionString = string.Format(
            configuration.GetValue<string>("PostgreSQLSettings:AdminConnectionString"),
            configuration.GetValue<string>("PostgreSQLSettings:DesignerDbAdminPwd"));
        app.UseYuniql(
            new PostgreSqlDataService(traceService),
            new PostgreSqlBulkImportService(traceService),
            traceService,
            new Yuniql.AspNetCore.Configuration
            {
                Workspace = Path.Combine(Environment.CurrentDirectory, configuration.GetValue<string>("PostgreSQLSettings:WorkspacePath")),
                ConnectionString = connectionString,
                IsAutoCreateDatabase = false,
                IsDebug = true
            });
    }

    app.UseStaticFiles(new StaticFileOptions
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
    app.UseSwagger(c =>
    {
        c.RouteTemplate = swaggerRoutePrefix + "/{documentName}/swagger.json";
    });
    app.UseSwaggerUI(c =>
    {
        c.RoutePrefix = swaggerRoutePrefix;
        c.SwaggerEndpoint($"/{swaggerRoutePrefix}/v1/swagger.json", "Altinn Designer API V1");
    });

    app.UseRouting();

    if (!app.Environment.IsDevelopment())
    {
        app.UseHsts();
        app.UseHttpsRedirection();
    }

    app.UseAuthentication();
    app.UseAuthorization();

    app.UseResponseCompression();
    app.UseRequestLocalization();

    app.UseEndpoints(endpoints =>
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

void CreateDirectory(IConfiguration configuration)
{
    Console.WriteLine($"// Program.cs // CreateDirectory // Trying to create directory");

    // TODO: Figure out how appsettings.json parses values and merges with environment variables and use these here.
    // Since ":" is not valid in environment variables names in kubernetes, we can't use current docker-compose environment variables
    string repoLocation = Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") ??
                         configuration["ServiceRepositorySettings:RepositoryLocation"];

    if (!Directory.Exists(repoLocation))
    {
        Directory.CreateDirectory(repoLocation);
        Console.WriteLine($"// Program.cs // CreateDirectory // Successfully created directory");
    }
}

static string GetXmlCommentsPathForControllers()
{
    // locate the xml file being generated by .NET
    string xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.XML";
    string xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);

    return xmlPath;
}
