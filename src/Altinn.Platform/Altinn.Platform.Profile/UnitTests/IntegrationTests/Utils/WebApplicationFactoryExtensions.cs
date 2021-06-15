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
    public static class WebApplicationFactoryExtensions
    {
        public static HttpClient CreateHttpClient(this WebApplicationFactory<Startup> factory, HttpMessageHandler httpMessageHandler)
        {
            return factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureTestServices(services =>
                {
                    services.AddSingleton<IPostConfigureOptions<JwtCookieOptions>, JwtCookiePostConfigureOptionsStub>();
                    services.AddSingleton<IUserProfiles, UserProfilesWrapperMock>();

                    Mock<IOptions<GeneralSettings>> generalSettingsOptions = new Mock<IOptions<GeneralSettings>>();
                    GeneralSettings generalSettings = new GeneralSettings { BridgeApiEndpoint = "http://localhost/" };
                    generalSettingsOptions.Setup(s => s.Value).Returns(generalSettings);

                    Mock<ILogger<UserProfilesWrapper>> logger;
                    logger = new Mock<ILogger<UserProfilesWrapper>>();

                    // Using the real/actual implementation of IUserProfiles. This way it's included in the
                    // integration test while we can mock a HttpMessageHandler to test different responses.
                    services.AddSingleton<IUserProfiles>(new UserProfilesWrapper(new HttpClient(httpMessageHandler), logger.Object, generalSettingsOptions.Object));
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
