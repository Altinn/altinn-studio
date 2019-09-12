using System;
using System.IO;
using Microsoft.ApplicationInsights.Extensibility;
using Microsoft.AspNetCore;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Azure.KeyVault;
using Microsoft.Azure.KeyVault.Models;
using Microsoft.Azure.Services.AppAuthentication;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Configuration.AzureKeyVault;
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
        private static Logger logger = new LoggerConfiguration()
            .WriteTo.Console()
            .CreateLogger();

        /// <summary>
        /// The main class to start.
        /// </summary>
        /// <param name="args">program arguments</param>
        public static void Main(string[] args)
        {
            CreateWebHostBuilder(args).Build().Run();
        }

        /// <summary>
        /// Creates the WebHostBuilder.
        /// </summary>
        /// <param name="args">the arguments</param>
        /// <returns></returns>
        public static IWebHostBuilder CreateWebHostBuilder(string[] args) =>
            WebHost.CreateDefaultBuilder(args)
            .ConfigureAppConfiguration((hostingContext, config) =>
            {
                string basePath = Directory.GetParent(Directory.GetCurrentDirectory()).FullName;

                string basePathCurrentDirectory = Directory.GetCurrentDirectory();
                logger.Information($"Current directory is: {basePathCurrentDirectory}");

                LoadConfigurationSettings(config, basePath, args);
            })
            .ConfigureLogging((hostingContext, logging) =>
            {
                logging.ClearProviders();
                Serilog.ILogger logger = new LoggerConfiguration()
                                .WriteTo.Console()
                                .CreateLogger();

                logging.AddProvider(new SerilogLoggerProvider(logger));
            })

            /* // Parameters required for integration with SBL in local development             
             .UseKestrel()
             .UseUrls("http://0.0.0.0:5010")
            .UseContentRoot(Directory.GetCurrentDirectory())
            .UseIISIntegration() */
            .UseApplicationInsights()
            .UseStartup<Startup>();

        /// <summary>
        /// Load the configuration settings for the program.
        /// </summary>
        /// <param name="config">the config</param>
        /// <param name="basePath">the base path to look for application settings files</param>
        /// <param name="args">programs arguments</param>
        public static void LoadConfigurationSettings(IConfigurationBuilder config, string basePath, string[] args)
        {
            logger.Information($"Loading Configuration from basePath={basePath}");

            config.SetBasePath(basePath);
            string configJsonFile1 = $"{basePath}/altinn-appsettings/altinn-dbsettings-secret.json";
            string configJsonFile2 = $"{basePath}/Storage/appsettings.json";

            if (basePath == "/")
            {
                configJsonFile2 = "/app/appsettings.json";
            }

            logger.Information($"Loading configuration file: '{configJsonFile1}'");
            config.AddJsonFile(configJsonFile1, optional: true, reloadOnChange: true);

            logger.Information($"Loading configuration file2: '{configJsonFile2}'");
            config.AddJsonFile(configJsonFile2, optional: false, reloadOnChange: true);

            config.AddEnvironmentVariables();
            config.AddCommandLine(args);
            IConfiguration stageOneConfig = config.Build();
            string appId = stageOneConfig.GetValue<string>("kvSetting:ClientId:0");
            string tenantId = stageOneConfig.GetValue<string>("kvSetting:TenantId:0");
            string appKey = stageOneConfig.GetValue<string>("kvSetting:ClientSecret:0");
            string keyVaultEndpoint = stageOneConfig.GetValue<string>("kvSetting:SecretUri:0");
            if (!string.IsNullOrEmpty(appId) && !string.IsNullOrEmpty(tenantId)
                && !string.IsNullOrEmpty(appKey) && !string.IsNullOrEmpty(keyVaultEndpoint))
            {
                AzureServiceTokenProvider azureServiceTokenProvider = new AzureServiceTokenProvider($"RunAs=App;AppId={appId};TenantId={tenantId};AppKey={appKey}");

                KeyVaultClient keyVaultClient = new KeyVaultClient(
                    new KeyVaultClient.AuthenticationCallback(azureServiceTokenProvider.KeyVaultTokenCallback));

                config.AddAzureKeyVault(
                    keyVaultEndpoint,
                    keyVaultClient,
                    new DefaultKeyVaultSecretManager());

                try
                {
                    // get instrumentation key to set up telemetry
                    SecretBundle secretBundle = keyVaultClient
                        .GetSecretAsync(keyVaultEndpoint, "ApplicationInsights--InstrumentationKey").Result;

                    SetTelemetry(secretBundle.Value);
                }
                catch (Exception vaultException)
                {
                    logger.Error($"Could not find secretBundle for application insights {vaultException}");
                }
            }
        }

        private static void SetTelemetry(string instrumentationKey)
        {
            logger.Information($"Setting application insights telemetry with instrumentationKey='{instrumentationKey}'");
            if (!string.IsNullOrEmpty(instrumentationKey))
            {
                TelemetryConfiguration.Active.InstrumentationKey = instrumentationKey;
            }
        }
    }
}
