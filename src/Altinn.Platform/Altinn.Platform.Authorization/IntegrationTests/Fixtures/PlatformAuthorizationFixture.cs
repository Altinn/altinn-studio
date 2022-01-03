using System;
using System.IO;
using System.Net.Http;

using Altinn.Authorization.ABAC.Interface;

using Altinn.Platform.Authorization.IntegrationTests.MockServices;
using Altinn.Platform.Authorization.Repositories.Interface;
using Altinn.Platform.Authorization.Services.Interface;

using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Platform.Authorization.IntegrationTests.Fixtures
{
    public class PlatformAuthorizationFixture : IDisposable
    {
        private readonly TestServer testServer;

        /// <summary>
        /// Gets the client.
        /// </summary>
        public HttpClient Client { get; }

        public PlatformAuthorizationFixture()
        {
            string[] args = { };

            Program.ConfigureSetupLogging();
            ConfigurationBuilder config = new ConfigurationBuilder();
            Program.LoadConfigurationSettings(config, GetContentRootPath(), args);

            IWebHostBuilder builder = new WebHostBuilder()
                .ConfigureTestServices(services =>
                {
                    services.AddScoped<IInstanceMetadataRepository, InstanceMetadataRepositoryMock>();
                    services.AddScoped<IPolicyRetrievalPoint, PolicyRetrievalPointMock>();
                    services.AddScoped<IRoles, RolesMock>();
                    services.AddScoped<IParties, PartiesMock>();
                    services.AddScoped<IDelegationMetadataRepository, DelegationMetadataRepositoryMock>();
                })
                .ConfigureAppConfiguration((hostingContext, config) =>
                {
                    Program.LoadConfigurationSettings(config, GetContentRootPath(), args);
                })
                .UseContentRoot(GetContentRootPath())
                .UseEnvironment("Development")
                .UseConfiguration(config.Build())
                .UseStartup<Startup>();

            testServer = new TestServer(builder);
            Client = testServer.CreateClient();
        }

        private string GetContentRootPath()
        {
            var testProjectPath = AppContext.BaseDirectory;
            var relativePathToHostProject = "../../../../";

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
        }
    }
}
