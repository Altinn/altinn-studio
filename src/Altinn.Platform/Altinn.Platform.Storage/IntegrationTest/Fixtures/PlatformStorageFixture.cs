using System;
using System.IO;
using System.Net.Http;
using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Storage.IntegrationTest.Mocks;
using Altinn.Platform.Storage.IntegrationTest.Mocks.Authentication;
using AltinnCore.Authentication.JwtCookie;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Storage.IntegrationTest.Fixtures
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
        /// Initializes a new instance of the <see cref="PlatformStorageFixture"/> class.
        /// </summary>
        public PlatformStorageFixture()
        {
            ConfigurationBuilder config = new ConfigurationBuilder();
            Program.LoadAppSettingsFiles(config);

            IWebHostBuilder builder = new WebHostBuilder()
                .UseContentRoot(GetContentRootPath())
                .UseEnvironment("Development")
                .UseConfiguration(config.Build())
                .UseStartup<Startup>()
                .ConfigureTestServices(services =>
                {
                    services.AddSingleton<IPDP, PepWithPDPAuthorizationMockSI>();

                    // Set up mock authentication so that not well known endpoint is used
                    services.AddSingleton<IPostConfigureOptions<JwtCookieOptions>, JwtCookiePostConfigureOptionsStub>();
                });

            testServer = new TestServer(builder);
            Client = testServer.CreateClient();
        }

        /// <summary>
        /// creates a new http client.
        /// </summary>
        /// <returns></returns>
        public HttpClient CreateClient()
        {
            return Client;
        }

        private string GetContentRootPath()
        {
            var testProjectPath = AppContext.BaseDirectory;
            var relativePathToHostProject = @"..\..\..\..\";

            return Path.Combine(testProjectPath, relativePathToHostProject);
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
