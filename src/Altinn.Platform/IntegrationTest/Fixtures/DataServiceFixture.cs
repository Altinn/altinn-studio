using System;
using System.IO;
using System.Net.Http;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Azure.KeyVault;
using Microsoft.Azure.Services.AppAuthentication;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Configuration.AzureKeyVault;

namespace AltinnCore.Test.Integration.Fixtures
{
    /// <summary>
    /// Starts the data service in pllace
    /// </summary>
    public class DataServiceFixture : IDisposable
    {
        private readonly TestServer testServer;

        /// <summary>
        /// The client.
        /// </summary>
        public HttpClient Client { get; }

        /// <summary>
        /// Initializes a new instance of the <see cref="DataServiceFixture"/> class.
        /// </summary>
        public DataServiceFixture()
        {
            string[] args = new string[2];

            ConfigurationBuilder config = new ConfigurationBuilder();
            Configuration(config, GetContentRootPath());

            IWebHostBuilder builder = new WebHostBuilder()
                .UseContentRoot(GetContentRootPath())
                .UseEnvironment("Development")
                .UseConfiguration(config.Build())
                .UseStartup<Altinn.Platform.Storage.Startup>();

            testServer = new TestServer(builder);
            Client = testServer.CreateClient();
        }

        private void Configuration(ConfigurationBuilder config, string path)
        {
            config.SetBasePath(path);
            config.AddJsonFile(path + "/appsettings.json", optional: false, reloadOnChange: true);

            config.AddEnvironmentVariables();
            //config.AddCommandLine(args);
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

        private string GetContentRootPath()
        {
            var testProjectPath = AppContext.BaseDirectory;
            var relativePathToHostProject = @"..\..\..\..\Storage";

            return Path.Combine(testProjectPath, relativePathToHostProject);
        }

        public void Dispose()
        {
            Client.Dispose();
            testServer.Dispose();
        }
    }
}
