using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Azure.KeyVault;
using Microsoft.Azure.Services.AppAuthentication;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Configuration.AzureKeyVault;
using Microsoft.Extensions.Logging;
using Serilog;
using Serilog.Extensions.Logging;

namespace Altinn.Platform.Storage
{
    public class Program
    {
        public static void Main(string[] args)
        {
            CreateWebHostBuilder(args).Build().Run();
        }

        public static IWebHostBuilder CreateWebHostBuilder(string[] args) =>
            WebHost.CreateDefaultBuilder(args)
            .ConfigureAppConfiguration((hostingContext, config) =>
            {
                string basePath = Directory.GetParent(Directory.GetCurrentDirectory()).FullName;

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
                .UseStartup<Startup>();

        public static void LoadConfigurationSettings(IConfigurationBuilder config, string basePath, string[] args)
        {
            config.SetBasePath(basePath);

            config.AddJsonFile(basePath + "altinn-appsettings/altinn-dbsettings-secret.json", optional: true, reloadOnChange: true);

            if (basePath == "/")
            {
                config.AddJsonFile(basePath + "app/appsettings.json", optional: false, reloadOnChange: true);
            }
            else
            {
                config.AddJsonFile(basePath + "/appsettings.json", optional: false, reloadOnChange: true);
            }

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
                    new KeyVaultClient.AuthenticationCallback(
                        azureServiceTokenProvider.KeyVaultTokenCallback));
                config.AddAzureKeyVault(
                    keyVaultEndpoint, keyVaultClient, new DefaultKeyVaultSecretManager());
            }
        }
    }
}
