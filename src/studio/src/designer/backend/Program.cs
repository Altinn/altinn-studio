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

namespace Altinn.Studio.Designer
{
    /// <summary>
    /// This is the main method for running this asp.net core application without IIS
    /// </summary>
    public class Program
    {
        private static ILogger _logger;

        /// <summary>
        /// Default protected constructor
        /// </summary>
        protected Program()
        {
        }

        /// <summary>
        /// The main method
        /// </summary>
        /// <param name="args">The Arguments</param>
        public static void Main(string[] args)
        {
            ConfigureSetupLogging();
            CreateWebHostBuilder(args).Build().Run();
        }

        /// <summary>
        /// Configure logging for setting up application. Temporary
        /// </summary>
        public static void ConfigureSetupLogging()
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

        /// <summary>
        /// Configure the configuration builder
        /// </summary>
        /// <param name="args">arguments for creating build configuration</param>
        /// <returns>The web host builder</returns>
        public static IWebHostBuilder CreateWebHostBuilder(string[] args) =>
            WebHost.CreateDefaultBuilder(args)
            .ConfigureAppConfiguration((hostingContext, config) =>
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
            })
            .ConfigureLogging(builder =>
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
            }).UseStartup<Startup>()
            .CaptureStartupErrors(true);
    }
}
