using System;
using System.IO;
using System.Reflection;
using System.Threading.Tasks;

using Altinn.Common.AccessToken;
using Altinn.Common.AccessToken.Configuration;
using Altinn.Common.AccessToken.Services;

using Altinn.Platform.Profile.Configuration;
using Altinn.Platform.Profile.Filters;
using Altinn.Platform.Profile.Health;
using Altinn.Platform.Profile.Services.Implementation;
using Altinn.Platform.Profile.Services.Interfaces;
using Altinn.Platform.Telemetry;

using AltinnCore.Authentication.JwtCookie;

using Microsoft.ApplicationInsights.Channel;
using Microsoft.ApplicationInsights.Extensibility;
using Microsoft.ApplicationInsights.WindowsServer.TelemetryChannel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Azure.KeyVault;
using Microsoft.Azure.KeyVault.Models;
using Microsoft.Azure.Services.AppAuthentication;

using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Configuration.AzureKeyVault;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.ApplicationInsights;
using Microsoft.IdentityModel.Logging;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

using Swashbuckle.AspNetCore.SwaggerGen;

ILogger logger;

const string VaultApplicationInsightsKey = "ApplicationInsights--InstrumentationKey";

string applicationInsightsKey = string.Empty;

var builder = WebApplication.CreateBuilder(args);

ConfigureWebHostCreationLogging();

await SetConfigurationProviders(builder.Configuration);

ConfigureApplicationLogging(builder.Logging);

ConfigureServices(builder.Services, builder.Configuration);

WebApplication app = builder.Build();

Configure();

app.Run();

void ConfigureWebHostCreationLogging()
{
    var logFactory = LoggerFactory.Create(builder =>
    {
        builder
            .AddFilter("Altinn.Platform.Profile.Program", LogLevel.Debug)
            .AddConsole();
    });

    logger = logFactory.CreateLogger<Program>();
}

async Task SetConfigurationProviders(ConfigurationManager config)
{
    string basePath = Directory.GetParent(Directory.GetCurrentDirectory()).FullName;
    config.SetBasePath(basePath);
    string configJsonFile1 = $"{basePath}/altinn-appsettings/altinn-dbsettings-secret.json";
    string configJsonFile2 = Directory.GetCurrentDirectory() + "/appsettings.json";

    if (basePath == "/")
    {
        configJsonFile2 = "/app/appsettings.json";
    }

    config.AddJsonFile(configJsonFile1, optional: true, reloadOnChange: true);
    config.AddJsonFile(configJsonFile2, optional: false, reloadOnChange: true);

    await ConnectToKeyVaultAndSetApplicationInsights(config);

    config.AddEnvironmentVariables();
    config.AddCommandLine(args);
}

async Task ConnectToKeyVaultAndSetApplicationInsights(ConfigurationManager config)
{
    KeyVaultSettings keyVaultSettings = new KeyVaultSettings();
    config.GetSection("kvSetting").Bind(keyVaultSettings);

    if (!string.IsNullOrEmpty(keyVaultSettings.ClientId) &&
        !string.IsNullOrEmpty(keyVaultSettings.TenantId) &&
        !string.IsNullOrEmpty(keyVaultSettings.ClientSecret) &&
        !string.IsNullOrEmpty(keyVaultSettings.SecretUri))
    {
        logger.LogInformation("Program // Configure key vault client // App");

        string connectionString = $"RunAs=App;AppId={keyVaultSettings.ClientId};" +
                                  $"TenantId={keyVaultSettings.TenantId};" +
                                  $"AppKey={keyVaultSettings.ClientSecret}";
        AzureServiceTokenProvider azureServiceTokenProvider = new AzureServiceTokenProvider(connectionString);

        KeyVaultClient keyVaultClient = new KeyVaultClient(
            new KeyVaultClient.AuthenticationCallback(azureServiceTokenProvider.KeyVaultTokenCallback));

        config.AddAzureKeyVault(
            keyVaultSettings.SecretUri, keyVaultClient, new DefaultKeyVaultSecretManager());

        try
        {
            SecretBundle secretBundle = await keyVaultClient.GetSecretAsync(
                keyVaultSettings.SecretUri, VaultApplicationInsightsKey);

            applicationInsightsKey = secretBundle.Value;
        }
        catch (Exception vaultException)
        {
            logger.LogError($"Unable to read application insights key {vaultException}");
        }
    }
}

void ConfigureApplicationLogging(ILoggingBuilder logging)
{
    // The default ASP.NET Core project templates call CreateDefaultBuilder, which adds the following logging providers:
    // Console, Debug, EventSource
    // https://docs.microsoft.com/en-us/aspnet/core/fundamentals/logging/?view=aspnetcore-3.1

    // Clear log providers
    logging.ClearProviders();

    // Setup up application insight if ApplicationInsightsKey is available
    if (!string.IsNullOrEmpty(applicationInsightsKey))
    {
        // Add application insights https://docs.microsoft.com/en-us/azure/azure-monitor/app/ilogger
        // Providing an instrumentation key here is required if you're using
        // standalone package Microsoft.Extensions.Logging.ApplicationInsights
        // or if you want to capture logs from early in the application startup 
        // pipeline from Startup.cs or Program.cs itself.
        logging.AddApplicationInsights(applicationInsightsKey);

        // Optional: Apply filters to control what logs are sent to Application Insights.
        // The following configures LogLevel Information or above to be sent to
        // Application Insights for all categories.
        logging.AddFilter<ApplicationInsightsLoggerProvider>(string.Empty, LogLevel.Warning);

        // Adding the filter below to ensure logs of all severity from Program.cs
        // is sent to ApplicationInsights.
        logging.AddFilter<ApplicationInsightsLoggerProvider>(typeof(Program).FullName, LogLevel.Trace);
    }
    else
    {
        // If not application insight is available log to console
        logging.AddFilter("Microsoft", LogLevel.Warning);
        logging.AddFilter("System", LogLevel.Warning);
        logging.AddConsole();
    }
}

void ConfigureServices(IServiceCollection services, IConfiguration config)
{
    logger.LogInformation("Program // ConfigureServices");

    services.AddControllers();

    services.AddMemoryCache();
    services.AddHealthChecks().AddCheck<HealthCheck>("profile_health_check");

    services.Configure<GeneralSettings>(config.GetSection("GeneralSettings"));
    services.Configure<KeyVaultSettings>(config.GetSection("kvSetting"));
    services.Configure<AccessTokenSettings>(config.GetSection("AccessTokenSettings"));

    services.AddSingleton(config);
    services.AddSingleton<IAuthorizationHandler, AccessTokenHandler>();
    services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();
    services.AddSingleton<ISigningKeysResolver, SigningKeysResolver>();

    services.AddAuthentication(JwtCookieDefaults.AuthenticationScheme)
        .AddJwtCookie(JwtCookieDefaults.AuthenticationScheme, options =>
        {
            GeneralSettings generalSettings = config.GetSection("GeneralSettings").Get<GeneralSettings>();
            options.JwtCookieName = generalSettings.JwtCookieName;
            options.MetadataAddress = generalSettings.OpenIdWellKnownEndpoint;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                ValidateIssuer = false,
                ValidateAudience = false,
                RequireExpirationTime = true,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };

            if (builder.Environment.IsDevelopment())
            {
                options.RequireHttpsMetadata = false;
            }
        });

    services.AddAuthorization(options =>
    {
        options.AddPolicy("PlatformAccess", policy => policy.Requirements.Add(new AccessTokenRequirement()));
    });

    services.AddHttpClient<IUserProfiles, UserProfilesWrapper>();

    if (!string.IsNullOrEmpty(applicationInsightsKey))
    {
        services.AddSingleton(typeof(ITelemetryChannel), new ServerTelemetryChannel { StorageFolder = "/tmp/logtelemetry" });
        services.AddApplicationInsightsTelemetry(applicationInsightsKey);
        services.AddApplicationInsightsTelemetryProcessor<HealthTelemetryFilter>();
        services.AddApplicationInsightsTelemetryProcessor<IdentityTelemetryFilter>();
        services.AddSingleton<ITelemetryInitializer, CustomTelemetryInitializer>();

        logger.LogInformation($"Startup // ApplicationInsightsTelemetryKey = {applicationInsightsKey}");
    }

    services.AddSwaggerGen(swaggerGenOptions => AddSwaggerGen(swaggerGenOptions));
}

void AddSwaggerGen(SwaggerGenOptions swaggerGenOptions)
{
    swaggerGenOptions.SwaggerDoc("v1", new OpenApiInfo { Title = "Altinn Platform Profile", Version = "v1" });

    try
    {
        string xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
        string xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
        swaggerGenOptions.IncludeXmlComments(xmlPath);
    }
    catch (Exception e)
    {
        logger.LogWarning(e, "Program // Exception when attempting to include the XML comments file.");
    }
}

void Configure()
{
    logger.LogInformation($"Startup // Configure {app.Environment.ApplicationName}");

    if (app.Environment.IsDevelopment() || app.Environment.IsStaging())
    {
        logger.LogInformation("IsDevelopment || IsStaging");

        // Enable higher level of detail in exceptions related to JWT validation
        IdentityModelEventSource.ShowPII = true;
    }
    else
    {
        app.UseExceptionHandler("/profile/api/v1/error");
    }

    app.UseSwagger(o => o.RouteTemplate = "profile/swagger/{documentName}/swagger.json");

    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/profile/swagger/v1/swagger.json", "Altinn Platform Profile API");
        c.RoutePrefix = "profile/swagger";
    });

    app.UseRouting();
    app.UseAuthentication();
    app.UseAuthorization();

    app.UseEndpoints(endpoints =>
    {
        endpoints.MapControllers();
        endpoints.MapHealthChecks("/health");
    });
}
