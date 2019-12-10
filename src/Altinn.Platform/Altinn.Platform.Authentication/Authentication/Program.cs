using System;
using System.IO;
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

namespace Altinn.Platform.Authentication
{
    /// <summary>
    /// This is the main method for running this asp.net core application
    /// </summary>
    public static class Program
    {
        private static readonly Logger Logger = new LoggerConfiguration()
            .WriteTo.Console()
            .CreateLogger();

        /// <summary>
        /// The main method
        /// </summary>
        /// <param name="args">The Arguments</param>
        public static void Main(string[] args)
        {
            CreateWebHostBuilder(args).Build().Run();
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
                Logger.Information("Program // CreateWebHostBuilder");

                string basePath = Directory.GetParent(Directory.GetCurrentDirectory()).FullName;
                config.SetBasePath(basePath);
                config.AddJsonFile(basePath + "altinn-appsettings/altinn-dbsettings-secret.json", optional: true, reloadOnChange: true);
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

                IConfiguration stageOneConfig = config.Build();
                string appId = stageOneConfig.GetValue<string>("KvSetting:ClientId:0");
                string tenantId = stageOneConfig.GetValue<string>("KvSetting:TenantId:0");
                string appKey = stageOneConfig.GetValue<string>("KvSetting:ClientSecret:0");
                string keyVaultEndpoint = stageOneConfig.GetValue<string>("KvSetting:SecretUri:0");
                if (!string.IsNullOrEmpty(appId) && !string.IsNullOrEmpty(tenantId)
                    && !string.IsNullOrEmpty(appKey) && !string.IsNullOrEmpty(keyVaultEndpoint))
                {
                    Logger.Information("Configure key vault client");

                    AzureServiceTokenProvider azureServiceTokenProvider = new AzureServiceTokenProvider($"RunAs=App;AppId={appId};TenantId={tenantId};AppKey={appKey}");
                    KeyVaultClient keyVaultClient = new KeyVaultClient(
                        new KeyVaultClient.AuthenticationCallback(
                            azureServiceTokenProvider.KeyVaultTokenCallback));
                    config.AddAzureKeyVault(
                        keyVaultEndpoint, keyVaultClient, new DefaultKeyVaultSecretManager());

                    try
                    {
                        string appInsightsKey = Startup.VaultApplicationInsightsKey;

                        SecretBundle secretBundle = keyVaultClient
                            .GetSecretAsync(keyVaultEndpoint, appInsightsKey).Result;

                        Environment.SetEnvironmentVariable(appInsightsKey, secretBundle.Value);
                    }
                    catch (Exception vaultException)
                    {
                        Logger.Error($"Unable to read application insights key {vaultException}");
                    }
                }
            })
            .ConfigureLogging((hostingContext, logging) =>
            {
                logging.ClearProviders();
                Serilog.ILogger logger = new LoggerConfiguration()
                                .WriteTo.Console()
                                .CreateLogger();
                logging.AddProvider(new SerilogLoggerProvider(logger));
            })
                .UseStartup<Startup>();
    }
}
