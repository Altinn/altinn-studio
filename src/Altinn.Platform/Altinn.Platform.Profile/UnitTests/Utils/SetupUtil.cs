using Altinn.App.IntegrationTests;
using AltinnCore.Authentication.JwtCookie;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using System;
using System.IO;
using System.Net.Http;
using System.Collections;
using System.Linq;
using Altinn.Platform.Profile.UnitTests.Mocks.Authentication;
using Altinn.Platform.Profile.Services.Interfaces;
using UnitTests.Mocks;
using Altinn.Common.AccessToken.Services;
using Altinn.Platform.Profile.Tests.Mocks;

namespace Altinn.Platform.Profile.UnitTests.Utils
{
    public static class SetupUtil
    {
        public static HttpClient GetTestClient(
            CustomWebApplicationFactory<Altinn.Platform.Profile.Startup> factory)
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
