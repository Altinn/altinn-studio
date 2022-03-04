using System;
using System.IO;
using System.Net.Http;

using Altinn.Authorization.ABAC.Interface;
using Altinn.Platform.Authorization.IntegrationTests.MockServices;
using Altinn.Platform.Authorization.Repositories;
using Altinn.Platform.Authorization.Repositories.Interface;
using Altinn.Platform.Authorization.Services.Implementation;
using Altinn.Platform.Authorization.Services.Interface;

using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Platform.Authorization.IntegrationTests.Fixtures
{
    /// <summary>
    /// Test fixture setting up a test server for policy information point testing.
    /// </summary>
    public class PolicyInformationPointFixture : IDisposable
    {
        private readonly TestServer _testServer;

        /// <summary>
        /// Gets a HttpClient connected to the TestServer.
        /// </summary>
        public HttpClient Client { get; }

        /// <summary>
        /// Initializes a new instance of the <see cref="PolicyInformationPointFixture"/> class.
        /// </summary>
        public PolicyInformationPointFixture()
        {
            string[] args = { };

            ConfigurationBuilder configBuilder = new ConfigurationBuilder();
            Program.LoadConfigurationSettings(configBuilder, GetContentRootPath(), args);

            IWebHostBuilder builder = new WebHostBuilder()
                .ConfigureTestServices(services =>
                {
                    services.AddScoped<IContextHandler, ContextHandler>();
                    services.AddScoped<IPolicyRetrievalPoint, PolicyRetrievalPointMock>();
                    services.AddScoped<IInstanceMetadataRepository, InstanceMetadataRepository>();
                })
                .ConfigureAppConfiguration((hostingContext, config) =>
                {
                    Program.LoadConfigurationSettings(config, GetContentRootPath(), args);
                })
                .UseContentRoot(GetContentRootPath())
                .UseEnvironment("Development")
                .UseConfiguration(configBuilder.Build())
                .UseStartup<Startup>();

            _testServer = new TestServer(builder);
            Client = _testServer.CreateClient();
        }

        private string GetContentRootPath()
        {
            string testProjectPath = AppContext.BaseDirectory;
            string relativePathToHostProject = "../../../../";

            return Path.Combine(testProjectPath, relativePathToHostProject);
        }

        /// <summary>
        /// Clean up.
        /// </summary>
        public void Dispose()
        {
            Client.Dispose();
            _testServer.Dispose();
        }
    }
}
