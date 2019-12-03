using System;
using System.IO;

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
        private static readonly Logger Logger = new LoggerConfiguration()
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
                webBuilder.UseStartup<Startup>()

                  // Parameters required for integration with SBL in local development
                   /* .UseKestrel()
                    .UseContentRoot(Directory.GetCurrentDirectory())
                    .UseIISIntegration()*/
                    .UseUrls("http://*:5010");

            })
            .ConfigureAppConfiguration((hostingContext, config) =>
            {
                string basePath = Directory.GetParent(Directory.GetCurrentDirectory()).FullName;

                string basePathCurrentDirectory = Directory.GetCurrentDirectory();
                Logger.Information($"Current directory is: {basePathCurrentDirectory}");

                LoadConfigurationSettings(config, basePath, args);
            })
            .ConfigureLogging((hostingContext, logging) =>
            {
                logging.ClearProviders();
                Serilog.ILogger logger = new LoggerConfiguration()
                                .WriteTo.Console()
                                .CreateLogger();

                logging.AddProvider(new SerilogLoggerProvider(logger));
            });

        /// <summary>
        /// Load the configuration settings for the program.
        /// </summary>
        /// <param name="config">the config</param>
        /// <param name="basePath">the base path to look for application settings files</param>
        /// <param name="args">programs arguments</param>
        public static void LoadConfigurationSettings(IConfigurationBuilder config, string basePath, string[] args)
        {
            config.SetBasePath(basePath);
            config.AddJsonFile(basePath + "altinn-appsettings/altinn-dbsettings-secret.json", true, true);

            if (basePath == "/")
            {
                config.AddJsonFile(basePath + "app/appsettings.json", false, true);
            }
            else
            {
                config.AddJsonFile(Directory.GetCurrentDirectory() + "/appsettings.json", false, true);
            }

            config.AddEnvironmentVariables();
            config.AddCommandLine(args);

            IConfiguration stageOneConfig = config.Build();
            string appId = stageOneConfig.GetValue<string>("kvSetting:ClientId:0");
            string tenantId = stageOneConfig.GetValue<string>("kvSetting:TenantId:0");
            string appKey = stageOneConfig.GetValue<string>("kvSetting:ClientSecret:0");
            string keyVaultEndpoint = stageOneConfig.GetValue<string>("kvSetting:SecretUri:0");

            if (!string.IsNullOrEmpty(appId) && !string.IsNullOrEmpty(tenantId) && !string.IsNullOrEmpty(appKey) && !string.IsNullOrEmpty(keyVaultEndpoint))
            {
                AzureServiceTokenProvider azureServiceTokenProvider = new AzureServiceTokenProvider($"RunAs=App;AppId={appId};TenantId={tenantId};AppKey={appKey}");

                KeyVaultClient keyVaultClient = new KeyVaultClient(new KeyVaultClient.AuthenticationCallback(azureServiceTokenProvider.KeyVaultTokenCallback));

                config.AddAzureKeyVault(keyVaultEndpoint, keyVaultClient, new DefaultKeyVaultSecretManager());

                try
                {
                    string appInsightsKey = "ApplicationInsights--InstrumentationKey";

                    SecretBundle secretBundle = keyVaultClient
                        .GetSecretAsync(keyVaultEndpoint, appInsightsKey).Result;

                    Environment.SetEnvironmentVariable(appInsightsKey, secretBundle.Value);
                }
                catch (Exception vaultException)
                {
                    Logger.Error($"Could not find secretBundle for application insights {vaultException}");
                }
            }
        }
    }
}
