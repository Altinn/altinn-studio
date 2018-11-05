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

namespace AltinnCore.Designer
{
    /// <summary>
    /// This is the main method for running this asp.net core application without IIS
    /// <see href="https://docs.microsoft.com/en-us/aspnet/core/fundamentals/servers/?highlight=kestrel&tabs=aspnetcore2x#kestrel"/>
    /// </summary>
    public class Program
    {
        /// <summary>
        /// The main method
        /// </summary>
        /// <param name="args">The Arguments</param>
        public static void Main(string[] args)
        {
            CreateWebHostBuilder(args).Build().Run();
        }

        public static IWebHostBuilder CreateWebHostBuilder(string[] args) =>
            WebHost.CreateDefaultBuilder(args)
            .ConfigureAppConfiguration((hostingContext, config) =>
            {
                //string pathToAppSettingSecret = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), @"..\altinn-appsettings\altinn-appsettings-secret.json"));
                //config.AddJsonFile(pathToAppSettingSecret, optional: true, reloadOnChange: true);
                config.SetBasePath(Directory.GetCurrentDirectory());
                config.AddJsonFile("\altinn-appsettings\altinn-appsettings-secret.json", optional: true, reloadOnChange: true);
                config.AddJsonFile("appsettings.json", optional: true, reloadOnChange: true);
                config.AddEnvironmentVariables();
                config.AddCommandLine(args);
                IConfigurationRoot stageOneConfig = config.Build();
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
                }
            })
                .UseStartup<Startup>()
                .CaptureStartupErrors(true);
    }
}