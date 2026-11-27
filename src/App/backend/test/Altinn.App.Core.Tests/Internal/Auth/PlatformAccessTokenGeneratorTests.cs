using System.Security.Cryptography;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Internal;
using Altinn.App.Core.Internal.Auth;
using Altinn.Common.AccessTokenClient.Configuration;
using Altinn.Common.AccessTokenClient.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Auth;

public class PlatformAccessTokenGeneratorTests
{
    [Fact]
    public void Localtest_gets_no_token_and_the_signing_certificate_is_never_loaded()
    {
        var resolver = new Mock<ISigningCredentialsResolver>();
        var generator = CreateGenerator("local.altinn.cloud", resolver.Object);

        Assert.Null(generator.GenerateAccessToken("ttd", "app"));
        // The package's generator catches a failure to load the certificate and returns null too, so only the
        // resolver shows whether it was tried.
        resolver.Verify(r => r.GetSigningCredentials(), Times.Never);
    }

    [Fact]
    public void Other_environments_get_a_token_signed_with_the_resolved_credentials()
    {
        using var key = RSA.Create(2048);
        var resolver = new Mock<ISigningCredentialsResolver>();
        resolver
            .Setup(r => r.GetSigningCredentials())
            .Returns(new SigningCredentials(new RsaSecurityKey(key) { KeyId = Guid.NewGuid().ToString() }, "RS256"));
        var generator = CreateGenerator("tt02.altinn.no", resolver.Object);

        Assert.NotNull(generator.GenerateAccessToken("ttd", "app"));
    }

    private static PlatformAccessTokenGenerator CreateGenerator(string hostName, ISigningCredentialsResolver resolver)
    {
        var generalSettings = new Mock<IOptionsMonitor<GeneralSettings>>();
        generalSettings.Setup(x => x.CurrentValue).Returns(new GeneralSettings { HostName = hostName });
        var platformSettings = new Mock<IOptionsMonitor<PlatformSettings>>();
        platformSettings.Setup(x => x.CurrentValue).Returns(new PlatformSettings());

        return new PlatformAccessTokenGenerator(
            new AccessTokenGenerator(
                NullLogger<AccessTokenGenerator>.Instance,
                Options.Create(new AccessTokenSettings()),
                resolver
            ),
            new RuntimeEnvironment(generalSettings.Object, platformSettings.Object)
        );
    }
}
