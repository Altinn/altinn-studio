using System;
using System.IO;

using AltinnCore.Authentication.Constants;

using Microsoft.AspNetCore;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Azure.KeyVault;
using Microsoft.Azure.KeyVault.Models;
using Microsoft.Azure.Services.AppAuthentication;

using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Configuration.AzureKeyVault;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.ApplicationInsights;

namespace Altinn.Platform.Profile
{
    /// <summary>
    /// This is the main method for running this asp.net core application.
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
                    .AddFilter("Altinn.Platform.Profile.Program", LogLevel.Debug)
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
                    _logger.LogInformation("Program // (ConfigureAppConfiguration");

                    string basePath = Directory.GetParent(Directory.GetCurrentDirectory()).FullName;

                    string basePathCurrentDirectory = Directory.GetCurrentDirectory();
                    _logger.LogInformation($"Current directory is: {basePathCurrentDirectory}");

                    LoadConfigurationSettings(config, basePath, args);
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
                        builder.AddFilter<ApplicationInsightsLoggerProvider>(string.Empty, LogLevel.Warning);

                        // Adding the filter below to ensure logs of all severity from Program.cs
                        // is sent to ApplicationInsights.
                        builder.AddFilter<ApplicationInsightsLoggerProvider>(typeof(Program).FullName, LogLevel.Trace);

                        // Adding the filter below to ensure logs of all severity from Startup.cs
                        // is sent to ApplicationInsights.
                        builder.AddFilter<ApplicationInsightsLoggerProvider>(typeof(Startup).FullName, LogLevel.Trace);
                    }
                    else
                    {
                        // If not application insight is available log to console
                        builder.AddFilter("Microsoft", LogLevel.Warning);
                        builder.AddFilter("System", LogLevel.Warning);
                        builder.AddConsole();
                    }
                })
                .UseStartup<Startup>();

        /// <summary>
        /// Load the configuration settings for the program.
        /// </summary>
        /// <param name="config">the config</param>
        /// <param name="basePath">the base path to look for application settings files</param>
        /// <param name="args">programs arguments</param>
        public static void LoadConfigurationSettings(IConfigurationBuilder config, string basePath, string[] args)
        {
            _logger.LogInformation($"Program // Loading Configuration from basePath={basePath}");

            config.SetBasePath(basePath);
            string configJsonFile1 = $"{basePath}/altinn-appsettings/altinn-dbsettings-secret.json";
            string configJsonFile2 = Directory.GetCurrentDirectory() + "/appsettings.json";

            if (basePath == "/")
            {
                configJsonFile2 = "/app/appsettings.json";
            }

            _logger.LogInformation($"Loading configuration file: '{configJsonFile1}'");
            config.AddJsonFile(configJsonFile1, optional: true, reloadOnChange: true);

            _logger.LogInformation($"Loading configuration file2: '{configJsonFile2}'");
            config.AddJsonFile(configJsonFile2, optional: false, reloadOnChange: true);

            config.AddEnvironmentVariables();
            config.AddCommandLine(args);

            ConnectToKeyVaultAndSetApplicationInsights(config);
        }

        private static void ConnectToKeyVaultAndSetApplicationInsights(IConfigurationBuilder config)
        {
            IConfiguration stageOneConfig = config.Build();
            KeyVaultSettings keyVaultSettings = new KeyVaultSettings();
            stageOneConfig.GetSection("kvSetting").Bind(keyVaultSettings);
            if (!string.IsNullOrEmpty(keyVaultSettings.ClientId) &&
                !string.IsNullOrEmpty(keyVaultSettings.TenantId) &&
                !string.IsNullOrEmpty(keyVaultSettings.ClientSecret) &&
                !string.IsNullOrEmpty(keyVaultSettings.SecretUri))
            {
                _logger.LogInformation("Program // Configure key vault client // App");

                string connectionString = $"RunAs=App;AppId={keyVaultSettings.ClientId};" +
                                          $"TenantId={keyVaultSettings.TenantId};" +
                                          $"AppKey={keyVaultSettings.ClientSecret}";
                AzureServiceTokenProvider azureServiceTokenProvider = new AzureServiceTokenProvider(connectionString);
                KeyVaultClient keyVaultClient = new KeyVaultClient(
                    new KeyVaultClient.AuthenticationCallback(
                        azureServiceTokenProvider.KeyVaultTokenCallback));
                config.AddAzureKeyVault(
                    keyVaultSettings.SecretUri, keyVaultClient, new DefaultKeyVaultSecretManager());
                try
                {
                    SecretBundle secretBundle = keyVaultClient
                        .GetSecretAsync(keyVaultSettings.SecretUri, Startup.VaultApplicationInsightsKey).Result;

                    Startup.ApplicationInsightsKey = secretBundle.Value;
                }
                catch (Exception vaultException)
                {
                    _logger.LogError($"Unable to read application insights key {vaultException}");
                }
            }
        }
    }
}
