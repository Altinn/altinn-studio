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
                KeyVaultSettings keyVaultSettings = new KeyVaultSettings();
                stageOneConfig.GetSection("kvSetting").Bind(keyVaultSettings);
                if (!string.IsNullOrEmpty(keyVaultSettings.ClientId) &&
                    !string.IsNullOrEmpty(keyVaultSettings.TenantId) &&
                    !string.IsNullOrEmpty(keyVaultSettings.ClientSecret) &&
                    !string.IsNullOrEmpty(keyVaultSettings.SecretUri))
                {
                    Logger.Information("Configure key vault client");

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
                        string appInsightsKey = Startup.VaultApplicationInsightsKey;

                        SecretBundle secretBundle = keyVaultClient
                            .GetSecretAsync(keyVaultSettings.SecretUri, appInsightsKey).Result;

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
