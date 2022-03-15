using System;
using System.IO;
using System.Reflection;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

using Altinn.Common.AccessToken.Configuration;
using Altinn.Common.AccessToken.Services;
using Altinn.Platform.Authentication.Configuration;
using Altinn.Platform.Authentication.Extensions;
using Altinn.Platform.Authentication.Filters;
using Altinn.Platform.Authentication.Health;
using Altinn.Platform.Authentication.Services;
using Altinn.Platform.Authentication.Services.Interfaces;
using Altinn.Platform.Telemetry;

using AltinnCore.Authentication.Constants;
using AltinnCore.Authentication.JwtCookie;

using Azure.Identity;
using Azure.Security.KeyVault.Secrets;

using Microsoft.ApplicationInsights.Channel;
using Microsoft.ApplicationInsights.Extensibility;
using Microsoft.ApplicationInsights.WindowsServer.TelemetryChannel;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Logging;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

ILogger logger;

string applicationInsightsKeySecretName = "ApplicationInsights--InstrumentationKey";

string applicationInsightsKey = string.Empty;

var builder = WebApplication.CreateBuilder(args);

ConfigureSetupLogging();

await SetConfigurationProviders(builder.Configuration);

ConfigureLogging(builder.Logging);

ConfigureServices(builder.Services, builder.Configuration);

var app = builder.Build();

Configure();

app.Run();

void ConfigureSetupLogging()
{
    var logFactory = LoggerFactory.Create(builder =>
    {
        builder
            .AddFilter("Microsoft", LogLevel.Warning)
            .AddFilter("System", LogLevel.Warning)
            .AddFilter("Altinn.Platform.Authentication.Program", LogLevel.Debug)
            .AddConsole();
    });

    logger = logFactory.CreateLogger<Program>();
}

async Task SetConfigurationProviders(ConfigurationManager config)
{
    string basePath = Directory.GetParent(Directory.GetCurrentDirectory()).FullName;

    config.SetBasePath(basePath);
    config.AddJsonFile(basePath + @"altinn-appsettings/altinn-dbsettings-secret.json", true, true);

    if (basePath == "/")
    {
        // In a pod/container where the app is located in an app folder on the root of the filesystem.
        string filePath = basePath + @"app/appsettings.json";
        config.AddJsonFile(filePath, false, true);
    }
    else
    {
        // Running on development machine.
        string filePath = Directory.GetCurrentDirectory() + @"/appsettings.json";
        config.AddJsonFile(filePath, false, true);
    }

    config.AddEnvironmentVariables();

    await ConnectToKeyVaultAndSetApplicationInsights(config);

    config.AddCommandLine(args);
}

async Task ConnectToKeyVaultAndSetApplicationInsights(ConfigurationManager config)
{
    logger.LogInformation("Program // Connect to key vault and set up application insights");

    Altinn.Common.AccessToken.Configuration.KeyVaultSettings keyVaultSettings = new();
    config.GetSection("kvSetting").Bind(keyVaultSettings);

    if (!string.IsNullOrEmpty(keyVaultSettings.ClientId) &&
        !string.IsNullOrEmpty(keyVaultSettings.TenantId) &&
        !string.IsNullOrEmpty(keyVaultSettings.ClientSecret) &&
        !string.IsNullOrEmpty(keyVaultSettings.SecretUri))
    {
        Environment.SetEnvironmentVariable("AZURE_CLIENT_ID", keyVaultSettings.ClientId);
        Environment.SetEnvironmentVariable("AZURE_CLIENT_SECRET", keyVaultSettings.ClientSecret);
        Environment.SetEnvironmentVariable("AZURE_TENANT_ID", keyVaultSettings.TenantId);

        try
        {
            SecretClient client = new SecretClient(new Uri(keyVaultSettings.SecretUri), new EnvironmentCredential());
            KeyVaultSecret secret = await client.GetSecretAsync(applicationInsightsKeySecretName);
            applicationInsightsKey = secret.Value;
        }
        catch (Exception vaultException)
        {
            logger.LogError(vaultException, $"Unable to read application insights key.");
        }
    }
}

void ConfigureLogging(ILoggingBuilder logging)
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
        logging.AddFilter<Microsoft.Extensions.Logging.ApplicationInsights.ApplicationInsightsLoggerProvider>(string.Empty, LogLevel.Warning);

        // Adding the filter below to ensure logs of all severity from Program.cs
        // is sent to ApplicationInsights.
        logging.AddFilter<Microsoft.Extensions.Logging.ApplicationInsights.ApplicationInsightsLoggerProvider>(typeof(Program).FullName, LogLevel.Trace);
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
    services.AddControllers().AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.WriteIndented = true;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });

    services.AddMvc().AddControllersAsServices();
    services.AddHealthChecks().AddCheck<HealthCheck>("authentication_health_check");

    services.AddSingleton(config);
    services.Configure<GeneralSettings>(config.GetSection("GeneralSettings"));
    services.Configure<AltinnCore.Authentication.Constants.KeyVaultSettings>(config.GetSection("kvSetting"));
    services.Configure<CertificateSettings>(config.GetSection("CertificateSettings"));
    services.Configure<Altinn.Common.AccessToken.Configuration.KeyVaultSettings>(config.GetSection("kvSetting"));

    services.Configure<AccessTokenSettings>(config.GetSection("AccessTokenSettings"));
    services.ConfigureOidcProviders(config.GetSection("OidcProviders"));
    services.ConfigureDataProtection(builder.Environment.IsDevelopment(), config.GetSection("AzureStorageConfiguration").Get<AzureStorageConfiguration>());
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

    services.AddSingleton(config);
    services.AddHttpClient<ISblCookieDecryptionService, SblCookieDecryptionService>();
    services.AddHttpClient<IUserProfileService, UserProfileService>();
    services.AddHttpClient<IEnterpriseUserAuthenticationService, EnterpriseUserAuthenticationService>();
    services.AddHttpClient<IOrganisationsService, OrganisationsService>();
    services.AddSingleton<IJwtSigningCertificateProvider, JwtSigningCertificateProvider>();
    services.AddSingleton<ISigningKeysRetriever, SigningKeysRetriever>();
    services.AddSingleton<ISigningKeysResolver, SigningKeysResolver>();
    services.AddSingleton<IAccessTokenValidator, AccessTokenValidator>();
    services.AddSingleton<IEFormidlingAccessValidator, EFormidlingAccessValidator>();
    services.AddHttpClient<IOidcProvider, OidcProviderService>();
    services.AddSingleton<IAuthentication, AuthenticationCore>();

    if (!string.IsNullOrEmpty(applicationInsightsKey))
    {
        services.AddSingleton(typeof(ITelemetryChannel), new ServerTelemetryChannel() { StorageFolder = "/tmp/logtelemetry" });
        services.AddApplicationInsightsTelemetry(applicationInsightsKey);
        services.AddApplicationInsightsTelemetryProcessor<HealthTelemetryFilter>();
        services.AddApplicationInsightsTelemetryProcessor<IdentityTelemetryFilter>();
        services.AddSingleton<ITelemetryInitializer, CustomTelemetryInitializer>();
    }

    services.AddAntiforgery(options =>
    {
        // asp .net core expects two types of tokens: One that is attached to the request as header, and the other one as cookie.
        // The values of the tokens are not the same and both need to be present and valid in a "unsafe" request.

        // We use this for OIDC state validation. See authentication controller. 
        // https://docs.microsoft.com/en-us/aspnet/core/security/anti-request-forgery?view=aspnetcore-3.1
        // https://github.com/axios/axios/blob/master/lib/defaults.js
        options.Cookie.Name = "AS-XSRF-TOKEN";
        options.Cookie.SameSite = Microsoft.AspNetCore.Http.SameSiteMode.Lax;
        options.HeaderName = "X-XSRF-TOKEN";
    });

    // Add Swagger support (Swashbuckle)
    services.AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new OpenApiInfo { Title = "Altinn Platform Authentication", Version = "v1" });

        try
        {
            string filePath = GetXmlCommentsPathForControllers();
            c.IncludeXmlComments(filePath);
        }
        catch
        {
            // catch swashbuckle exception if it doesn't find the generated xml documentation file
        }
    });
}

static string GetXmlCommentsPathForControllers()
{
    // locate the xml file being generated by .NET
    string xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    string xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);

    return xmlPath;
}

void Configure()
{
    if (app.Environment.IsDevelopment() || app.Environment.IsStaging())
    {
        app.UseDeveloperExceptionPage();

        // Enable higher level of detail in exceptions related to JWT validation
        IdentityModelEventSource.ShowPII = true;
    }
    else
    {
        app.UseExceptionHandler("/authentication/api/v1/error");
    }

    app.UseSwagger(o => o.RouteTemplate = "authentication/swagger/{documentName}/swagger.json");

    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/authentication/swagger/v1/swagger.json", "Altinn Platform Authentication API");
        c.RoutePrefix = "authentication/swagger";
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
