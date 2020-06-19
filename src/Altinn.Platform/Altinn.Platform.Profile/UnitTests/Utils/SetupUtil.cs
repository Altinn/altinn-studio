using System.Net.Http;

using Altinn.Common.AccessToken.Services;
using Altinn.Platform.Profile.Services.Interfaces;
using Altinn.Platform.Profile.Tests.Mocks;
using Altinn.Platform.Profile.Tests.Mocks.Authentication;
using AltinnCore.Authentication.JwtCookie;

using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Profile.Tests.Utils
{
    public static class SetupUtil
    {
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
