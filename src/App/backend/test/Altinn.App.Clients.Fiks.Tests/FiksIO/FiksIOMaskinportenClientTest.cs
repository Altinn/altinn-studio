using Altinn.App.Clients.Fiks.FiksIO;
using Altinn.App.Core.Models;
using Altinn.App.Tests.Common.Auth;
using Ks.Fiks.Maskinporten.Client;
using KS.Fiks.Maskinporten.Client;
using Microsoft.Extensions.Time.Testing;
using Moq;
using IAltinnMaskinportenClient = Altinn.App.Core.Features.Maskinporten.IMaskinportenClient;
using MaskinportenClient = Altinn.App.Core.Features.Maskinporten.MaskinportenClient;

namespace Altinn.App.Clients.Fiks.Tests.FiksIO;

public class FiksIOMaskinportenClientTest
{
    [Fact]
    public async Task GetAccessToken_CallsInternalMaskinportenClient()
    {
        // Arrange
        var scopes = "altinn:serviceowner/whatever something-else";
        var requestedTokenDuration = TimeSpan.FromMinutes(22.5);
        var altinnMaskinportenClientMock = new Mock<IAltinnMaskinportenClient>();
        var timeProvider = new FakeTimeProvider(new DateTimeOffset(2025, 10, 26, 0, 0, 0, TimeSpan.Zero));
        var fiksIOMaskinportenClient = new FiksIOMaskinportenClient(altinnMaskinportenClientMock.Object, timeProvider);

        altinnMaskinportenClientMock
            .Setup(x => x.GetAccessToken(It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                (IEnumerable<string> scopesRequest, CancellationToken _) =>
                    JwtToken.Parse(
                        TestAuthentication.GetServiceOwnerToken(
                            scope: MaskinportenClient.GetFormattedScopes(scopesRequest),
                            expiry: requestedTokenDuration,
                            timeProvider: timeProvider
                        )
                    )
            );

        // Act
        List<MaskinportenToken> results =
        [
            await fiksIOMaskinportenClient.GetAccessToken(scopes),
            await fiksIOMaskinportenClient.GetAccessToken([scopes]),
            await fiksIOMaskinportenClient.GetAccessToken(new TokenRequest { Scopes = scopes }),
        ];

        // Assert
        foreach (var result in results)
        {
            var actualResult = Assert.IsType<FiksIOMaskinportenClient.TokenWrapper>(result);
            Assert.Equal(scopes, JwtToken.Parse(actualResult.Token).Scope);
            Assert.Equal(requestedTokenDuration.TotalSeconds, actualResult.ExpiresIn);
        }
    }

    [Fact]
    public async Task UnsupportedMethods_ThrowNotSupportedException()
    {
        // Arrange
        var altinnMaskinportenClientMock = new Mock<IAltinnMaskinportenClient>();
        var fiksIOMaskinportenClient = new FiksIOMaskinportenClient(altinnMaskinportenClientMock.Object);

        List<Func<Task<MaskinportenToken>>> unsupportedMethods =
        [
            () => fiksIOMaskinportenClient.GetDelegatedAccessToken("hello", "hi"),
            () => fiksIOMaskinportenClient.GetDelegatedAccessToken("hello", ["hi"]),
            () => fiksIOMaskinportenClient.GetDelegatedAccessTokenForAudience("hello", "hi", "howdy"),
            () => fiksIOMaskinportenClient.GetDelegatedAccessTokenForAudience("hello", "hi", ["howdy"]),
            () => fiksIOMaskinportenClient.GetOnBehalfOfAccessToken("hello", "hi"),
            () => fiksIOMaskinportenClient.GetOnBehalfOfAccessToken("hello", ["hi"]),
        ];

        // Act & Assert
        await Task.WhenAll(
            unsupportedMethods.Select(async method =>
            {
                await Assert.ThrowsAsync<NotSupportedException>(method);
            })
        );
    }
}
