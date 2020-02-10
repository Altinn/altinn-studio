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

namespace Altinn.Platform.Storage
{
    /// <summary>
    /// The program to start Altinn Platform Storage Service.
    /// </summary>
    public static class Program
    {
        private static readonly Logger _logger = new LoggerConfiguration()
            .WriteTo.Console()
            .CreateLogger();

        /// <summary>
        /// The main class to start.
        /// </summary>
        /// <param name="args">program arguments</param>
        public static void Main(string[] args)
        {
            CreateHostBuilder(args).Build().Run();
        }

        /// <summary>
        /// Creates the WebHostBuilder.
        /// </summary>
        /// <param name="args">the arguments</param>
        /// <returns></returns>
        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
            .ConfigureWebHostDefaults(webBuilder =>
            {
                webBuilder.UseStartup<Startup>().UseUrls("http://*:5010");
            })
            .ConfigureAppConfiguration((hostingContext, config) =>
            {
                LoadAppSettingsFiles(config);

                ConnectToKeyVaultAndSetApplicationInsigths(config);

                config.AddEnvironmentVariables();
                config.AddCommandLine(args);
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
            });

        /// <summary>
        /// Load the configuration settings for the program.
        /// </summary>
        /// <param name="config">the config</param>
        public static void LoadAppSettingsFiles(IConfigurationBuilder config)
        {
            _logger.Information("Program // LoadAppSettingsFiles");

            string currentDirectory = Directory.GetCurrentDirectory();
            _logger.Information($"Current directory: {currentDirectory}");

            string basePath = Directory.GetParent(Directory.GetCurrentDirectory()).FullName;
            config.SetBasePath(basePath);
            config.AddJsonFile(basePath + @"altinn-appsettings/altinn-dbsettings-secret.json", true, true);
            if (basePath == "/") 
            {
                // On a pod/container where the app is located in an app folder on the root of the filesystem.
                string filePath = basePath + @"app/appsettings.json";
                _logger.Information($"Loading configuration file: {filePath}");
                config.AddJsonFile(filePath, false, true);
            }
            else
            {
                // Running on development machine.
                string filePath = Directory.GetCurrentDirectory() + @"/appsettings.json";
                _logger.Information($"Loading configuration file: {filePath}");
                config.AddJsonFile(filePath, false, true);
            }
        }

        private static void ConnectToKeyVaultAndSetApplicationInsigths(IConfigurationBuilder config)
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
                    new KeyVaultClient.AuthenticationCallback(azureServiceTokenProvider.KeyVaultTokenCallback));

                Startup.PlatformKeyVaultClient = keyVaultClient;

                config.AddAzureKeyVault(
                    keyVaultSettings.SecretUri, keyVaultClient, new DefaultKeyVaultSecretManager());
                try
                {
                    SecretBundle secretBundle = keyVaultClient
                        .GetSecretAsync(keyVaultSettings.SecretUri, Startup.VaultApplicationInsightsKey).Result;

                    Startup.ApplicationInsightsKey = secretBundle.Value;

                    _logger.Information($"Program // Found app-insights key {secretBundle.Value}");
                }
                catch (Exception vaultException)
                {
                    _logger.Error($"Unable to read application insights key {vaultException}");
                }
            }
        }
    }
}
