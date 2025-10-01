using Altinn.ApiClients.Maskinporten.Config;
using Altinn.ApiClients.Maskinporten.Interfaces;
using Altinn.ApiClients.Maskinporten.Models;
using Altinn.App.Core.Internal.Maskinporten;
using Altinn.App.Core.Internal.Secrets;
using FluentAssertions;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Maskinporten;

public class MaskinportenJwkTokenProviderTests
{
    [Fact]
    public async Task GetToken_ShouldReturnToken()
    {
        IOptions<MaskinportenSettings> maskinportenSettings = Options.Create(
            new MaskinportenSettings() { Environment = "ver2", ClientId = Guid.NewGuid().ToString() }
        );

        var maskinportenService = new Mock<IMaskinportenService>();
        maskinportenService
            .Setup(s =>
                s.GetToken(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<bool>()
                )
            )
            .ReturnsAsync(new TokenResponse { AccessToken = "myMaskinportenAccessToken" });

        var secretsClient = new Mock<ISecretsClient>();
        secretsClient.Setup(s => s.GetSecretAsync(It.IsAny<string>())).ReturnsAsync("myBase64EncodedJwk");

        MaskinportenJwkTokenProvider maskinportenJwkTokenProvider = new(
            maskinportenService.Object,
            maskinportenSettings,
            secretsClient.Object,
            "nameOfMySecretInKeyVault"
        );

        string scopes = "altinn:serviceowner/instances.read";
        string token = await maskinportenJwkTokenProvider.GetToken(scopes);

        token.Should().Be("myMaskinportenAccessToken");
        maskinportenService.Verify(s =>
            s.GetToken(
                "myBase64EncodedJwk",
                maskinportenSettings.Value.Environment,
                maskinportenSettings.Value.ClientId,
                scopes,
                string.Empty,
                null,
                false
            )
        );
        secretsClient.Verify(s => s.GetSecretAsync("nameOfMySecretInKeyVault"));
    }

    [Fact]
    public async Task GetAltinnExchangedToken_ShouldReturnToken()
    {
        IOptions<MaskinportenSettings> maskinportenSettings = Options.Create(
            new MaskinportenSettings() { Environment = "ver2", ClientId = Guid.NewGuid().ToString() }
        );

        TokenResponse maskinportenTokenResponse = new() { AccessToken = "myMaskinportenAccessToken" };
        var maskinportenService = new Mock<IMaskinportenService>();
        maskinportenService
            .Setup(s =>
                s.GetToken(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<bool>()
                )
            )
            .ReturnsAsync(maskinportenTokenResponse);

        TokenResponse altinnTokenResponse = new() { AccessToken = "myAltinnAccessToken" };
        maskinportenService
            .Setup(s =>
                s.ExchangeToAltinnToken(
                    maskinportenTokenResponse,
                    maskinportenSettings.Value.Environment,
                    null,
                    null,
                    false,
                    false
                )
            )
            .ReturnsAsync(altinnTokenResponse);

        var secretsClient = new Mock<ISecretsClient>();
        secretsClient.Setup(s => s.GetSecretAsync(It.IsAny<string>())).ReturnsAsync("myBase64EncodedJwk");

        MaskinportenJwkTokenProvider maskinportenJwkTokenProvider = new(
            maskinportenService.Object,
            maskinportenSettings,
            secretsClient.Object,
            "nameOfMySecretInKeyVault"
        );

        string scopes = "altinn:serviceowner/instances.read";
        string token = await maskinportenJwkTokenProvider.GetAltinnExchangedToken(scopes);

        token.Should().Be("myAltinnAccessToken");
        maskinportenService.Verify(s =>
            s.GetToken(
                "myBase64EncodedJwk",
                maskinportenSettings.Value.Environment,
                maskinportenSettings.Value.ClientId,
                scopes,
                string.Empty,
                null,
                false
            )
        );
        secretsClient.Verify(s => s.GetSecretAsync("nameOfMySecretInKeyVault"));
    }
}
