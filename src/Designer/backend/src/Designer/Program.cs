#nullable disable
using System;
using System.IO;
using System.Reflection;
using Altinn.ApiClients.Maskinporten.Extensions;
using Altinn.Common.AccessToken.Configuration;
using Altinn.Studio.Designer.Clients.Implementations;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Configuration.Extensions;
using Altinn.Studio.Designer.Configuration.Marker;
using Altinn.Studio.Designer.EventHandlers;
using Altinn.Studio.Designer.Health;
using Altinn.Studio.Designer.Hosting;
using Altinn.Studio.Designer.Hubs;
using Altinn.Studio.Designer.Infrastructure;
using Altinn.Studio.Designer.Infrastructure.AnsattPorten;
using Altinn.Studio.Designer.Infrastructure.Authorization;
using Altinn.Studio.Designer.Infrastructure.Maskinporten;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Extensions;
using Altinn.Studio.Designer.Scheduling;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients;
using Azure.Identity;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Headers;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.FeatureManagement;
using Microsoft.Net.Http.Headers;

ILogger logger;

ConfigureSetupLogging();

var builder = WebApplication.CreateBuilder(args);
{
    SetConfigurationProviders(builder.Configuration, builder.Environment);
    ConfigureLogging(builder.Logging);
    builder.AddOpenTelemetry();
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

void SetConfigurationProviders(ConfigurationManager config, IWebHostEnvironment hostingEnvironment)
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
    string secretUri = keyVaultSettings.SecretUri;

    if (!string.IsNullOrEmpty(secretUri))
    {
        logger.LogInformation("// Program.cs // SetConfigurationProviders // Attempting to configure KeyVault");
        DefaultAzureCredential azureCredentials = new();

        try
        {
            config.AddAzureKeyVault(new Uri(secretUri), azureCredentials);
        }
        catch (Exception vaultException)
        {
            logger.LogError(vaultException, "Could not connect to Azure Key Vault");
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
    builder.ClearProviders();
    builder.AddFilter("Microsoft", LogLevel.Warning);
    builder.AddFilter("System", LogLevel.Warning);
    builder.AddConsole();
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
    services.Configure<AltinitySettings>(configuration.GetSection("AltinitySettings"));
    services.AddSingleton<IAltinityWebSocketService, AltinityWebSocketService>();
    var maskinPortenClientName = "MaskinportenClient";
    services.RegisterMaskinportenClientDefinition<MaskinPortenClientDefinition>(maskinPortenClientName, configuration.GetSection("MaskinportenClientSettings"));
    services.AddHttpClient<IResourceRegistry, ResourceRegistryService>();

    var maskinportenSettings = new MaskinportenClientSettings();
    configuration.GetSection("MaskinportenClientSettings").Bind(maskinportenSettings);

    services.AddMaskinportenHttpClient<MaskinPortenClientDefinition>("MaskinportenHttpClient", maskinportenSettings);

    services.RegisterServiceImplementations(configuration);

    services.AddHttpContextAccessor();
    services.AddMemoryCache();
    services.AddResponseCompression();
    services.AddHealthChecks().AddCheck<HealthCheck>("designer_health_check");

    CreateDirectory(configuration);

    services.ConfigureDataProtection(configuration, logger);
    services.ConfigureMvc();
    services.ConfigureNonMarkedSettings(configuration);

    services.RegisterTypedHttpClients(configuration, env);
    services.AddAnsattPortenAuthenticationAndAuthorization(configuration);
    services.AddMaskinportenAuthentication(configuration);
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

        services.AddTransient<ISharedContentClient, AzureSharedContentClient>();
    }
    else
    {
        services.AddTransient<ISharedContentClient, LocalFileSharedContentClient>();
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
    logger.LogInformation("// Program.cs // CreateDirectory // Trying to create directory");

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
        logger.LogInformation("// Program.cs // CreateDirectory // Successfully created directory");
    }
}

public partial class Program { }
