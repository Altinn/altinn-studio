using System;
using System.IO;
using AltinnCore.Authentication.Constants;
using Microsoft.ApplicationInsights.Extensibility;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Azure.KeyVault;
using Microsoft.Azure.KeyVault.Models;
using Microsoft.Azure.Services.AppAuthentication;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Configuration.AzureKeyVault;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Serilog;
using Serilog.Core;
using Serilog.Extensions.Logging;

namespace Altinn.Platform.Receipt
{
    /// <summary>
    /// This is the main method for running this asp.net core application
    /// </summary>
    public static class Program
    {
        private static readonly Logger _logger = new LoggerConfiguration()
            .WriteTo.Console()
            .CreateLogger();

        /// <summary>
        /// The main method
        /// </summary>
        /// <param name="args">The Arguments</param>
        public static void Main(string[] args)
        {
            CreateHostBuilder(args).Build().Run();
        }

        /// <summary>
        /// Configure the configuration builder
        /// </summary>
        /// <param name="args">arguments for creating build configuration</param>
        /// <returns>The web host builder</returns>
        public static IHostBuilder CreateHostBuilder(string[] args) =>
             Host.CreateDefaultBuilder(args)
             .ConfigureWebHostDefaults(webBuilder =>
             {
                 webBuilder.ConfigureAppConfiguration((hostingContext, config) =>
                 {
                     _logger.Information($"Program // ConfigureAppConfiguration");

                     string basePath = Directory.GetParent(Directory.GetCurrentDirectory()).FullName;

                     string basePathCurrentDirectory = Directory.GetCurrentDirectory();
                     _logger.Information($"Current directory is: {basePathCurrentDirectory}");

                     LoadConfigurationSettings(config, basePath, args);
                 })

                 .UseStartup<Startup>();
             })
            .ConfigureLogging((hostingContext, logging) =>
            {
                logging.ClearProviders();
                LoggerConfiguration loggerConfig = new LoggerConfiguration().WriteTo.Console();

                if (!string.IsNullOrEmpty(Startup.ApplicationInsightsKey))
                {
                    loggerConfig.WriteTo.ApplicationInsights(new TelemetryConfiguration(Startup.ApplicationInsightsKey), TelemetryConverter.Traces);
                }

                Serilog.ILogger logger = loggerConfig.CreateLogger();

                logging.AddProvider(new SerilogLoggerProvider(logger));
            })
             ;

        /// <summary>
        /// Load the configuration settings for the program.
        /// </summary>
        /// <param name="config">the config</param>
        /// <param name="basePath">the base path to look for application settings files</param>
        /// <param name="args">programs arguments</param>
        public static void LoadConfigurationSettings(IConfigurationBuilder config, string basePath, string[] args)
        {
            _logger.Information($"Program // Loading Configuration from basePath={basePath}");

            config.SetBasePath(basePath);
            string configJsonFile1 = $"{basePath}/altinn-appsettings/altinn-dbsettings-secret.json";
            string configJsonFile2 = $"{basePath}/Receipt/appsettings.json";

            if (basePath == "/")
            {
                configJsonFile2 = "/app/appsettings.json";
            }

            _logger.Information($"Loading configuration file: '{configJsonFile1}'");
            config.AddJsonFile(configJsonFile1, optional: true, reloadOnChange: true);

            _logger.Information($"Loading configuration file2: '{configJsonFile2}'");
            config.AddJsonFile(configJsonFile2, optional: false, reloadOnChange: true);

            config.AddEnvironmentVariables();

            ConnectToKeyVaultAndSetApplicationInsights(config);

            config.AddCommandLine(args);
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
                _logger.Information("Program // Configure key vault client // App");

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
                    _logger.Error($"Unable to read application insights key {vaultException}");
                }
            }
        }
    }
}
