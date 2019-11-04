using System;
using System.Diagnostics;
using System.IO;
using System.Net.Http;
using Altinn.Authorization.ABAC.Interface;
using Altinn.Platform.Authorization.Services.Implementation;
using Altinn.Platform.Authorization.Services.Interface;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Platform.Authorization.IntegrationTests.Fixtures
{
    public class PolicyRetrivevalPointFixture : IDisposable
    {
        private readonly TestServer testServer;
        private readonly Process process;

        /// <summary>
        /// Gets the client.
        /// </summary>
        public HttpClient Client { get; }

        public PolicyRetrivevalPointFixture()
        {
            string[] args = { };

            ConfigurationBuilder config = new ConfigurationBuilder();
            Program.LoadConfigurationSettings(config, GetContentRootPath(), args);

            IWebHostBuilder builder = new WebHostBuilder()
                .ConfigureTestServices(services =>
                {
                    services.AddScoped<IContextHandler, MockServices.ContextHandler>();
                    services.AddScoped<IPolicyRetrievalPoint, PolicyRetrievalPoint>();
                    services.AddScoped<IRoles, MockServices.PolicyInformationPoint>();
                    services.AddScoped<IContextHandler, IntegrationTests.MockServices.ContextHandler>();
                })
                .ConfigureAppConfiguration((hostingContext, config) =>
                {
                    Program.LoadConfigurationSettings(config, GetContentRootPath(), args);
                })
                .UseContentRoot(GetContentRootPath())
                .UseEnvironment("Development")
                .UseConfiguration(config.Build())
                .UseStartup<Altinn.Platform.Authorization.Startup>();

            testServer = new TestServer(builder);
            Client = testServer.CreateClient();

            //setting up storage emmulator
            process = new Process
            {
                StartInfo = {
                UseShellExecute = false,
                FileName = @"C:\Program Files (x86)\Microsoft SDKs\Azure\Storage Emulator\AzureStorageEmulator.exe",
            }
            };

            StartAndWaitForExit("stop");
            StartAndWaitForExit("clear all");
            StartAndWaitForExit("start");
        }

        private string GetContentRootPath()
        {
            var testProjectPath = AppContext.BaseDirectory;
            var relativePathToHostProject = @"..\..\..\..\";

            return Path.Combine(testProjectPath, relativePathToHostProject);
        }

        /// <summary>
        /// creates a new http client.
        /// </summary>
        /// <returns></returns>
        public HttpClient GetClient()
        {
            return Client;
        }

        /// <summary>
        /// Clean up.
        /// </summary>
        public void Dispose()
        {
            Client.Dispose();
            testServer.Dispose();
            StartAndWaitForExit("stop");
        }
        public void StartAndWaitForExit(string arguments)
        {
            process.StartInfo.Arguments = arguments;
            process.Start();
            process.WaitForExit(10000);
        }

    }
}
