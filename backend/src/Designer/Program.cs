using System;
using System.IO;
using System.Reflection;
using System.Threading.Tasks;
using Altinn.ApiClients.Maskinporten.Extensions;
using Altinn.Common.AccessToken.Configuration;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Configuration.Extensions;
using Altinn.Studio.Designer.Configuration.Marker;
using Altinn.Studio.Designer.EventHandlers;
using Altinn.Studio.Designer.Health;
using Altinn.Studio.Designer.Hubs;
using Altinn.Studio.Designer.Infrastructure;
using Altinn.Studio.Designer.Infrastructure.AnsattPorten;
using Altinn.Studio.Designer.Infrastructure.Authorization;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization;
using Altinn.Studio.Designer.Scheduling;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Tracing;
using Altinn.Studio.Designer.TypedHttpClients;
using Microsoft.ApplicationInsights.Extensibility;
using Microsoft.ApplicationInsights.Extensibility.EventCounterCollector;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Headers;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.Azure.KeyVault;
using Microsoft.Azure.KeyVault.Models;
using Microsoft.Azure.Services.AppAuthentication;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Configuration.AzureKeyVault;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.FeatureManagement;
using Microsoft.Net.Http.Headers;

ILogger logger;

string applicationInsightsConnectionString = string.Empty;

ConfigureSetupLogging();

var builder = WebApplication.CreateBuilder(args);
{
    await SetConfigurationProviders(builder.Configuration, builder.Environment);
    ConfigureLogging(builder.Logging);
    ConfigureServices(builder.Services, builder.Configuration, builder.Environment);
}

var app = builder.Build();
{
    Configure(builder.Configuration);
    app.Run();
}

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
    logger.LogInformation("// Program.cs // SetConfigurationProviders // Attempting to configure providers");
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

    KeyVaultSettings keyVaultSettings = new();
    config.GetSection("kvSetting").Bind(keyVaultSettings);

    if (!string.IsNullOrEmpty(keyVaultSettings.ClientId) &&
        !string.IsNullOrEmpty(keyVaultSettings.TenantId) &&
        !string.IsNullOrEmpty(keyVaultSettings.ClientSecret) &&
        !string.IsNullOrEmpty(keyVaultSettings.SecretUri))
    {
        logger.LogInformation("// Program.cs // SetConfigurationProviders // Attempting to configure KeyVault");
        AzureServiceTokenProvider azureServiceTokenProvider = new($"RunAs=App;AppId={keyVaultSettings.ClientId};TenantId={keyVaultSettings.TenantId};AppKey={keyVaultSettings.ClientSecret}");
        KeyVaultClient keyVaultClient = new(
            new KeyVaultClient.AuthenticationCallback(
                azureServiceTokenProvider.KeyVaultTokenCallback));
        config.AddAzureKeyVault(
            keyVaultSettings.SecretUri, keyVaultClient, new DefaultKeyVaultSecretManager());
        try
        {
            string secretId = "ApplicationInsights--ConnectionString";
            SecretBundle secretBundle = await keyVaultClient.GetSecretAsync(
                keyVaultSettings.SecretUri, secretId);

            applicationInsightsConnectionString = secretBundle.Value;
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

    logger.LogInformation("// Program.cs // SetConfigurationProviders // Configured providers");
}

void ConfigureLogging(ILoggingBuilder builder)
{
    // The default ASP.NET Core project templates call CreateDefaultBuilder, which adds the following logging providers:
    // Console, Debug, EventSource
    // https://docs.microsoft.com/en-us/aspnet/core/fundamentals/logging/?view=aspnetcore-3.1

    // Clear log providers
    builder.ClearProviders();

    // Setup up application insight if ApplicationInsightsKey is available
    if (!string.IsNullOrEmpty(applicationInsightsConnectionString))
    {
        // Add application insights https://docs.microsoft.com/en-us/azure/azure-monitor/app/ilogger
        // Providing an instrumentation key here is required if you're using
        // standalone package Microsoft.Extensions.Logging.ApplicationInsights
        // or if you want to capture logs from early in the application startup
        // pipeline from Startup.cs or Program.cs itself.
        builder.AddApplicationInsights(configureTelemetryConfiguration: config =>
        {
            config.ConnectionString = applicationInsightsConnectionString;
        },
        configureApplicationInsightsLoggerOptions: _ => { });

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
    logger.LogInformation("// Program.cs // ConfigureServices // Attempting to configure services");

    services.Configure<KestrelServerOptions>(options =>
    {
        options.AllowSynchronousIO = true;
    });

    services.ConfigureResourceRegistryIntegrationSettings(configuration.GetSection("ResourceRegistryIntegrationSettings"));
    services.ConfigureMaskinportenIntegrationSettings(configuration.GetSection("MaskinportenClientSettings"));

    services.Configure<MaskinportenClientSettings>(configuration.GetSection("MaskinportenClientSettings"));
    var maskinPortenClientName = "MaskinportenClient";
    services.RegisterMaskinportenClientDefinition<MaskinPortenClientDefinition>(maskinPortenClientName, configuration.GetSection("MaskinportenClientSettings"));
    services.AddHttpClient<IResourceRegistry, ResourceRegistryService>();

    var maskinportenSettings = new MaskinportenClientSettings();
    configuration.GetSection("MaskinportenClientSettings").Bind(maskinportenSettings);

    services.AddMaskinportenHttpClient<MaskinPortenClientDefinition>("MaskinportenHttpClient", maskinportenSettings);

    // Add application insight telemetry
    if (!string.IsNullOrEmpty(applicationInsightsConnectionString))
    {
        services.AddApplicationInsightsTelemetry(options => { options.ConnectionString = applicationInsightsConnectionString; });
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

    services.RegisterServiceImplementations(configuration);

    services.AddHttpContextAccessor();
    services.AddMemoryCache();
    services.AddResponseCompression();
    services.AddHealthChecks().AddCheck<HealthCheck>("designer_health_check");

    CreateDirectory(configuration);

    services.ConfigureDataProtection(configuration, logger);
    services.ConfigureMvc();
    services.ConfigureNonMarkedSettings(configuration);

    services.RegisterTypedHttpClients(configuration);
    services.AddAnsattPortenAuthenticationAndAuthorization(configuration);
    services.ConfigureAuthentication(configuration, env);

    services.Configure<CacheSettings>(configuration.GetSection("CacheSettings"));

    services.AddLocalization(options => options.ResourcesPath = "Resources");

    services.ConfigureLocalization();
    services.AddPolicyBasedAuthorization();

    services.AddOpenApi("v1");

    // Auto register all settings classes
    services.RegisterSettingsByBaseType<ISettingsMarker>(configuration);

    // Registers all handlers and the mediator
    services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(Program).Assembly));
    services.AddTransient<IFileSyncHandlerExecutor, FileSyncHandlerExecutor>();
    services.AddFeatureManagement();
    services.RegisterSynchronizationServices(configuration);

    var signalRBuilder = services.AddSignalR();
    var redisSettings = configuration.GetSection(nameof(RedisCacheSettings)).Get<RedisCacheSettings>();
    if (redisSettings.UseRedisCache)
    {
        services.AddStackExchangeRedisCache(options =>
        {
            options.Configuration = redisSettings.ConnectionString;
            options.InstanceName = redisSettings.InstanceName;
        });
        signalRBuilder.AddStackExchangeRedis(redisSettings.ConnectionString);
    }

    if (!env.IsDevelopment())
    {
        // https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/proxy-load-balancer?view=aspnetcore-8.0
        builder.Services.Configure<ForwardedHeadersOptions>(options =>
        {
            options.ForwardedHeaders =
                ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
            options.KnownNetworks.Clear();
            options.KnownProxies.Clear();
        });
    }

    services.AddQuartzJobScheduling(configuration);

    logger.LogInformation("// Program.cs // ConfigureServices // Configuration complete");
}

void Configure(IConfiguration configuration)
{
    logger.LogInformation("// Program.cs // Configure // Attempting to configure env");
    if (app.Environment.IsDevelopment() || app.Environment.IsStaging())
    {
        app.UseExceptionHandler("/error-local-development");
    }
    else
    {
        app.UseExceptionHandler("/error");
    }

    app.UseDefaultFiles();
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
        }
    });

    app.MapOpenApi("/designer/openapi/{documentName}/openapi.json");

    if (!app.Environment.IsDevelopment())
    {
        app.UseForwardedHeaders();
        app.UseHsts();
        app.UseHttpsRedirection();
    }

    app.UseAuthentication();
    app.UseAuthorization();

    app.UseResponseCompression();
    app.UseRequestLocalization();

    app.MapControllers();

    app.MapHealthChecks("/health");
    app.MapHubs();

    app.UseMiddleware<RequestSynchronizationMiddleware>();

    logger.LogInformation("// Program.cs // Configure // Configuration complete");
}

void CreateDirectory(IConfiguration configuration)
{
    Console.WriteLine($"// Program.cs // CreateDirectory // Trying to create directory");

    // TODO: Figure out how appsettings.json parses values and merges with environment variables and use these here.
    // Since ":" is not valid in environment variables names in kubernetes, we can't use current docker-compose environment variables
    var repoLocation = Environment.GetEnvironmentVariable("ServiceRepositorySettings:RepositoryLocation") ??
                                                       configuration["ServiceRepositorySettings:RepositoryLocation"];
    if (string.IsNullOrWhiteSpace(repoLocation))
    {
        repoLocation = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "altinn", "repos");
        configuration.GetSection("ServiceRepositorySettings")["RepositoryLocation"] = repoLocation;
    }

    if (!Directory.Exists(repoLocation))
    {
        Directory.CreateDirectory(repoLocation);
        Console.WriteLine($"// Program.cs // CreateDirectory // Successfully created directory");
    }
}

public partial class Program { }
