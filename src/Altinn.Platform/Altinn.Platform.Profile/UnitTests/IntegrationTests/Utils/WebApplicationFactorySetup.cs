using System.Net.Http;

using Altinn.Common.AccessToken.Services;
using Altinn.Platform.Profile.Configuration;
using Altinn.Platform.Profile.Services.Implementation;
using Altinn.Platform.Profile.Services.Interfaces;
using Altinn.Platform.Profile.Tests.IntegrationTests.Mocks;
using Altinn.Platform.Profile.Tests.IntegrationTests.Mocks.Authentication;
using Altinn.Platform.Profile.Tests.Mocks;

using AltinnCore.Authentication.JwtCookie;

using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

using Moq;

namespace Altinn.Platform.Profile.Tests.IntegrationTests.Utils
{
    public class WebApplicationFactorySetup<T>
        where T : class
    {
        private readonly WebApplicationFactory<T> _webApplicationFactory;

        public WebApplicationFactorySetup(WebApplicationFactory<T> webApplicationFactory)
        {
            _webApplicationFactory = webApplicationFactory;
        }

        public Mock<ILogger<UserProfilesWrapper>> UserProfilesWrapperLogger { get; set; } = new();

        public Mock<IOptions<GeneralSettings>> GeneralSettingsOptions { get; set; } = new();

        public HttpMessageHandler SblBridgeHttpMessageHandler { get; set; } = new DelegatingHandlerStub();

        public HttpClient GetTestServerClient()
        {
            MemoryCache memoryCache = new MemoryCache(new MemoryCacheOptions());

            GeneralSettingsOptions.Setup(gso => gso.Value).Returns(
                new GeneralSettings
                {
                    ProfileCacheLifetimeSeconds = 600,
                    BridgeApiEndpoint = "https://at22.altinn.cloud/sblbridge/profile/api/"
                });

            return _webApplicationFactory.WithWebHostBuilder(builder =>
            {  
                builder.ConfigureTestServices(services =>
                {
                    services.AddSingleton<IPostConfigureOptions<JwtCookieOptions>, JwtCookiePostConfigureOptionsStub>();
                    services.AddSingleton<ISigningKeysResolver, SigningKeyResolverMock>();
                    services.AddSingleton<IMemoryCache>(memoryCache);

                    // Using the real/actual implementation of IUserProfiles, but with a mocked message handler.
                    // Haven't found any other ways of injecting a mocked message handler to simulate SBL Bridge.
                    services.AddSingleton<IUserProfiles>(
                        new UserProfilesWrapper(
                            new HttpClient(SblBridgeHttpMessageHandler),
                            UserProfilesWrapperLogger.Object,
                            GeneralSettingsOptions.Object));
                });
            }).CreateClient();
        }
    }
}
