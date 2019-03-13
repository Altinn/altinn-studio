using System;
using System.IO;
using System.Net.Http;
using Altinn.Platform.Storage;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Azure.KeyVault;
using Microsoft.Azure.Services.AppAuthentication;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Configuration.AzureKeyVault;

namespace Altinn.Platform.Test.Integration.Fixtures
{
    /// <summary>
    /// Starts the data service in pllace
    /// </summary>
    public class PlatformStorageFixture : IDisposable
    {
        private readonly TestServer testServer;

        /// <summary>
        /// Gets the client.
        /// </summary>
        public HttpClient Client { get; }

        /// <summary>
        /// Initializes a new instance of the <see cref=PlatformStorageFixture"/> class.
        /// </summary>
        public PlatformStorageFixture()
        {
            string[] args = { };

            ConfigurationBuilder config = new ConfigurationBuilder();
            Program.LoadConfigurationSettings(config, GetContentRootPath(), args);

            IWebHostBuilder builder = new WebHostBuilder()
                .UseContentRoot(GetContentRootPath())
                .UseEnvironment("Development")
                .UseConfiguration(config.Build())
                .UseStartup<Altinn.Platform.Storage.Startup>();

            testServer = new TestServer(builder);
            Client = testServer.CreateClient();
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
