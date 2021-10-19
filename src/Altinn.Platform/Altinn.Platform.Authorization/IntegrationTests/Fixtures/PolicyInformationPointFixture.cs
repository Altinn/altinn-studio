using System;
using System.IO;
using System.Net.Http;

using Altinn.Platform.Authorization.IntegrationTests.MockServices;
using Altinn.Platform.Authorization.Repositories.Interface;
using Altinn.Platform.Authorization.Services.Interface;
using AltinnCore.Authentication.JwtCookie;

using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;

using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Authorization.IntegrationTests.Fixtures
{
    public class PolicyInformationPointFixture : IDisposable
    {
        private readonly TestServer _testServer;

        /// <summary>
        /// Gets the client.
        /// </summary>
        public HttpClient Client { get; }

        public PolicyInformationPointFixture()
        {
            string[] args = { };

            Program.ConfigureSetupLogging();
            ConfigurationBuilder config = new ConfigurationBuilder();
            Program.LoadConfigurationSettings(config, GetContentRootPath(), args);

            IWebHostBuilder builder = new WebHostBuilder()
                .ConfigureTestServices(services =>
                {
                    services.AddScoped<IPolicyRetrievalPoint, PolicyRetrievalPointMock>();
                    services.AddScoped<IPolicyInformationPoint, PolicyInformationPointMock>();
                    services.AddScoped<IPolicyDelegationRepository, PolicyDelegationRepositoryMock>();
                    services.AddScoped<IRoles, RolesMock>();
                    services.AddScoped<IPolicyRepository, PolicyRepositoryMock>();
                    services.AddSingleton<IPostConfigureOptions<JwtCookieOptions>, JwtCookiePostConfigureOptionsStub>();
                })
                .ConfigureAppConfiguration((hostingContext, config) =>
                {
                    Program.LoadConfigurationSettings(config, GetContentRootPath(), args);
                })
                .UseContentRoot(GetContentRootPath())
                .UseEnvironment("Development")
                .UseConfiguration(config.Build())
                .UseStartup<Startup>();

            _testServer = new TestServer(builder);
            Client = _testServer.CreateClient();
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
            _testServer.Dispose();
        }

        private string GetContentRootPath()
        {
            var testProjectPath = AppContext.BaseDirectory;
            var relativePathToHostProject = "../../../../";

            return Path.Combine(testProjectPath, relativePathToHostProject);
        }
    }
}
