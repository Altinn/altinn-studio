using Altinn.App.Core.Configuration;
using Altinn.App.Core.Exceptions;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Bootstrap;
using Altinn.App.Core.Features.Redirect;
using Altinn.App.Core.Internal.AltinnCdn;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Core.Tests.Features.Bootstrap;

public class BootstrapGlobalServiceTests
{
    [Fact]
    public async Task GetGlobalState_UsesConfiguredAuthenticationUrl_WhenAuthenticationUrlIsSet()
    {
        var platformFrontendSettings = new PlatformFrontendSettings
        {
            AuthenticationUrl = new Uri("https://configured.example/authentication/api/v1/authentication"),
        };

        var platformSettings = new PlatformSettings
        {
            ApiAuthenticationEndpoint = "https://platform.example/authentication/api/v1/",
        };

        var sut = CreateSut(platformFrontendSettings);

        var result = await sut.GetGlobalState("ttd", "test", null, null);

        Assert.Equal(
            "https://configured.example/authentication/api/v1/authentication",
            result.PlatformFrontendSettings.AuthenticationUrl?.ToString()
        );
    }

    [Fact]
    public async Task GetGlobalState_Throws_WhenAuthenticationUrlIsMissing()
    {
        var platformFrontendSettings = new PlatformFrontendSettings { AuthenticationUrl = null };
        var sut = CreateSut(platformFrontendSettings);

        await Assert.ThrowsAsync<ConfigurationException>(() => sut.GetGlobalState("ttd", "test", null, null));
    }

    private static BootstrapGlobalService CreateSut(PlatformFrontendSettings platformFrontendSettings)
    {
        var appMetadata = new Mock<IAppMetadata>();
        appMetadata.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(new ApplicationMetadata("ttd/test"));

        var appResources = new Mock<IAppResources>();
        appResources.Setup(x => x.GetUiConfiguration()).Returns(new UiConfiguration { Folders = [] });
        appResources.Setup(x => x.GetFooter()).ReturnsAsync((string?)null);

        var applicationLanguage = new Mock<IApplicationLanguage>();
        applicationLanguage.Setup(x => x.GetApplicationLanguages()).ReturnsAsync([]);

        var returnUrlService = new Mock<IReturnUrlService>();
        returnUrlService
            .Setup(x => x.Validate(It.IsAny<string?>()))
            .Returns(ReturnUrlValidationResult.InvalidFormat("not set"));

        var authenticationContext = new Mock<IAuthenticationContext>();
        authenticationContext.SetupGet(x => x.Current).Returns(CreateAuthenticatedNone());

        var altinnCdnClient = new Mock<IAltinnCdnClient>();
        altinnCdnClient
            .Setup(x => x.GetOrgDetails(It.IsAny<CancellationToken>()))
            .ReturnsAsync((AltinnCdnOrgDetails?)null);

        return new BootstrapGlobalService(
            appMetadata.Object,
            appResources.Object,
            Microsoft.Extensions.Options.Options.Create(new FrontEndSettings()),
            CreateOptionsMonitor(platformFrontendSettings),
            applicationLanguage.Object,
            returnUrlService.Object,
            Mock.Of<IProfileClient>(),
            authenticationContext.Object,
            new HttpContextAccessor { HttpContext = new DefaultHttpContext() },
            altinnCdnClient.Object,
            NullLogger<BootstrapGlobalService>.Instance
        );
    }

    private static IOptionsMonitor<T> CreateOptionsMonitor<T>(T value)
        where T : class
    {
        var mock = new Mock<IOptionsMonitor<T>>();
        mock.Setup(x => x.CurrentValue).Returns(value);
        return mock.Object;
    }

    private static Authenticated.None CreateAuthenticatedNone()
    {
        var parseContext = default(Authenticated.ParseContext);
        return new Authenticated.None(ref parseContext);
    }
}
