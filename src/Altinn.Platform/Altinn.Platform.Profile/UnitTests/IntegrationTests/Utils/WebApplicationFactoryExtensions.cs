using System.Net.Http;

using Altinn.Common.AccessToken.Services;
using Altinn.Platform.Profile.Configuration;
using Altinn.Platform.Profile.Services.Implementation;
using Altinn.Platform.Profile.Services.Interfaces;
using Altinn.Platform.Profile.Tests.IntegrationTests.Mocks;
using Altinn.Platform.Profile.Tests.IntegrationTests.Mocks.Authentication;
using AltinnCore.Authentication.JwtCookie;

using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

using Moq;

namespace Altinn.Platform.Profile.Tests.IntegrationTests.Utils
{
    /// <summary>
    /// Contains <see cref="WebApplicationFactory{Startup}"/> extension methods.
    /// </summary>
    public static class WebApplicationFactoryExtensions
    {
        /// <summary>
        /// Start a test server and return a <see cref="HttpClient"/> that can send requests to the server.
        /// </summary>
        /// <param name="factory">
        /// The <see cref="WebApplicationFactory{Startup}"/> used to create the test server and client.
        /// </param>
        /// <param name="sblBridgeHttpMessageHandler">
        /// The <see cref="HttpMessageHandler"/> to use to check the application requests to SBL Bridge and to
        /// create responses the application must handle.
        /// </param>
        /// <returns>A <see cref="HttpClient"/> that can be used to perform test requests.</returns>
        public static HttpClient CreateHttpClient(
            this WebApplicationFactory<Startup> factory,
            HttpMessageHandler sblBridgeHttpMessageHandler)
        {
            Program.ConfigureSetupLogging();
            return factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureTestServices(services =>
                {
                    services.AddSingleton<IPostConfigureOptions<JwtCookieOptions>, JwtCookiePostConfigureOptionsStub>();
                    services.AddSingleton<IUserProfiles, UserProfilesWrapperMock>();

                    Mock<IOptions<GeneralSettings>> generalSettingsOptions = new Mock<IOptions<GeneralSettings>>();
                    GeneralSettings generalSettings = new () { BridgeApiEndpoint = "http://localhost/" };
                    generalSettingsOptions.Setup(s => s.Value).Returns(generalSettings);

                    Mock<ILogger<UserProfilesWrapper>> logger = new ();

                    // Using the real/actual implementation of IUserProfiles instead of a mock. This way it's included
                    // in the integration test and we can inject a HttpMessageHandler to capture SBL Bridge requests.
                    services.AddSingleton<IUserProfiles>(
                        new UserProfilesWrapper(
                            new HttpClient(sblBridgeHttpMessageHandler),
                            logger.Object,
                            generalSettingsOptions.Object));
                });
            }).CreateClient();
        }

        public static HttpClient GetTestClient(WebApplicationFactory<Startup> factory)
        {
            Program.ConfigureSetupLogging();
            HttpClient client = factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureTestServices(services =>
                {
                    services.AddSingleton<IPostConfigureOptions<JwtCookieOptions>, JwtCookiePostConfigureOptionsStub>();
                    services.AddSingleton<IUserProfiles, UserProfilesWrapperMock>();
                    services.AddSingleton<ISigningKeysResolver, SigningKeyResolverMock>();
                });
            })
            .CreateClient();

            return client;
        }
    }
}
