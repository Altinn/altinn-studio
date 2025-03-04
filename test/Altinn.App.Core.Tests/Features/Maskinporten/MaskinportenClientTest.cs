using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Text.Json;
using Altinn.App.Api.Tests.Utils;
using Altinn.App.Core.Features.Maskinporten;
using Altinn.App.Core.Features.Maskinporten.Exceptions;
using Altinn.App.Core.Features.Maskinporten.Models;
using Altinn.App.Core.Internal.Maskinporten;
using FluentAssertions;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Internal;
using Microsoft.Extensions.Time.Testing;
using Moq;

namespace Altinn.App.Core.Tests.Features.Maskinporten;

public class MaskinportenClientTests
{
    private sealed class FakeTime(DateTimeOffset startDateTime) : FakeTimeProvider(startDateTime), ISystemClock
    {
        public DateTimeOffset UtcNow => GetUtcNow();
    }

    private sealed record Fixture(WebApplication App) : IAsyncDisposable
    {
        internal static readonly MaskinportenSettings DefaultSettings = new()
        {
            Authority = "https://maskinporten.dev/",
            ClientId = "test-client-id",
            JwkBase64 =
                "ewogICAgICAicCI6ICItU09GNmp3V0N3b19nSlByTnJhcVNkNnZRckFzRmxZd1VScHQ0NC1BNlRXUnBoaUo4b3czSTNDWGxxUG1LeG5VWDVDcnd6SF8yeldTNGtaaU9zQTMtajhiUE9hUjZ2a3pRSG14YmFkWmFmZjBUckdJajNQUlhxcVdMRHdsZjNfNklDV2gzOFhodXNBeDVZRE0tRm8zZzRLVWVHM2NxMUFvTkJ4NHV6Sy1IRHMiLAogICAgICAia3R5IjogIlJTQSIsCiAgICAgICJxIjogIndwWUlpOVZJLUJaRk9aYUNaUmVhYm4xWElQbW8tbEJIendnc1RCdHVfeUJma1FQeGI1Q1ZnZFFnaVQ4dTR3Tkl4NC0zb2ROdXhsWGZING1Hc25xOWFRaFlRNFEyc2NPUHc5V2dNM1dBNE1GMXNQQXgzUGJLRkItU01RZmZ4aXk2cVdJSmRQSUJ4OVdFdnlseW9XbEhDcGZsUWplT3U2dk43WExsZ3c5T2JhVSIsCiAgICAgICJkIjogIks3Y3pqRktyWUJfRjJYRWdoQ1RQY2JTbzZZdExxelFwTlZleF9HZUhpTmprWmNpcEVaZ3g4SFhYLXpNSi01ZWVjaTZhY1ZjSzhhZzVhQy01Mk84LTU5aEU3SEE2M0FoRzJkWFdmamdQTXhaVE9MbnBheWtZbzNWa0NGNF9FekpLYmw0d2ludnRuTjBPc2dXaVZiTDFNZlBjWEdqbHNTUFBIUlAyaThDajRqX21OM2JVcy1FbVM5UzktSXlia1luYV9oNUMxMEluXy1tWHpsQ2dCNU9FTXFzd2tNUWRZVTBWbHVuWHM3YXlPT0h2WWpQMWFpYml0MEpyay1iWVFHSy1mUVFFVWNZRkFSN1ZLMkxIaUJwU0NvbzBiSjlCQ1BZb196bTVNVnVId21xbzNtdml1Vy1lMnVhbW5xVHpZUEVWRE1lMGZBSkZtcVBGcGVwTzVfcXE2USIsCiAgICAgICJlIjogIkFRQUIiLAogICAgICAidXNlIjogInNpZyIsCiAgICAgICJraWQiOiAiYXNkZjEyMzQiLAogICAgICAicWkiOiAicXpFUUdXOHBPVUgtR2pCaFUwVXNhWWtEM2dWTVJvTF9CbGlRckp4ZTAwY29YeUtIZGVEX2M1bDFDNFFJZzRJSjZPMnFZZ2wyamRnWVNmVHA0S2NDNk1Obm8tSVFiSnlPRDU2Qmo4eVJUUjA5TkZvTGhDUjNhY0xmMkhwTXNKNUlqbTdBUHFPVWlCeW9hVkExRlR4bzYtZGNfZ1NiQjh1ZDI2bFlFRHdsYWMwIiwKICAgICAgImRwIjogInRnTU14N2FFQ0NiQmctY005Vmo0Q2FXbGR0d01LWGxvTFNoWTFlSTJOS3BOTVFKR2JhdWdjTVRHQ21qTk1fblgzTVZ0cHRvMWFPbTMySlhCRjlqc1RHZWtONWJmVGNJbmZsZ3Bsc21uR2pMckNqN0xYTG9wWUxiUnBabF9iNm1JaThuU2ZCQXVQR2hEUzc4UWZfUXhFR1Bxb2h6cEZVTW5UQUxzOVI0Nkk1YyIsCiAgICAgICJhbGciOiAiUlMyNTYiLAogICAgICAiZHEiOiAibE40cF9ha1lZVXpRZTBWdHp4LW1zNTlLLUZ4bzdkQmJqOFhGOWhnSzdENzlQam5SRGJTRTNVWEgtcGlQSzNpSXhyeHFGZkZuVDJfRS15REJIMjBOMmZ4YllwUVZNQnpZc1UtUGQ2OFBBV1Nnd05TU29XVmhwdEdjaTh4bFlfMDJkWDRlbEF6T1ZlOUIxdXBEMjc5cWJXMVdKVG5TQmp4am1LVU5lQjVPdDAwIiwKICAgICAgIm4iOiAidlY3dW5TclNnekV3ZHo0dk8wTnNmWDB0R1NwT2RITE16aDFseUVtU2RYbExmeVYtcUxtbW9qUFI3S2pUU2NDbDI1SFI4SThvWG1mcDhSZ19vbnA0LUlZWW5ZV0RTNngxVlViOVlOQ3lFRTNQQTUtVjlOYzd5ckxxWXpyMTlOSkJmdmhJVEd5QUFVTjFCeW5JeXJ5NFFMbHRYYTRKSTFiLTh2QXNJQ0xyU1dQZDdibWxrOWo3bU1jV3JiWlNIZHNTMGNpVFgzYTc2UXdMb0F2SW54RlhCU0ludXF3ZVhnVjNCZDFQaS1DZGpCR0lVdXVyeVkybEwybmRnVHZUY2tZUTBYeEtGR3lCdDNaMEhJMzRBRFBrVEZneWFMX1F4NFpIZ3d6ZjRhTHBXaHF3OGVWanpPMXlucjJ3OUd4b2dSN1pWUjY3VFI3eUxSS3VrMWdIdFlkUkJ3IgogICAgfQ==",
        };

        internal static readonly MaskinportenSettings InternalSettings = DefaultSettings with
        {
            ClientId = "internal-client-id",
        };

        public FakeTime FakeTime => App.Services.GetRequiredService<FakeTime>();
        public Mock<IHttpClientFactory> HttpClientFactoryMock =>
            Moq.Mock.Get(App.Services.GetRequiredService<IHttpClientFactory>());

        public MaskinportenClient Client(string variant) =>
            variant switch
            {
                MaskinportenClient.VariantInternal => (MaskinportenClient)
                    App.Services.GetRequiredKeyedService<IMaskinportenClient>(MaskinportenClient.VariantInternal),
                MaskinportenClient.VariantDefault => (MaskinportenClient)
                    App.Services.GetRequiredService<IMaskinportenClient>(),
                _ => throw new ArgumentException($"Unknown variant: {variant}"),
            };

        public static Fixture Create(bool configureMaskinporten = true)
        {
            var mockHttpClientFactory = new Mock<IHttpClientFactory>();
            var fakeTimeProvider = new FakeTime(new DateTimeOffset(2024, 1, 1, 10, 0, 0, TimeSpan.Zero));

            var app = Api.Tests.TestUtils.AppBuilder.Build(registerCustomAppServices: services =>
            {
                services.AddSingleton(mockHttpClientFactory.Object);
                services.Configure<MemoryCacheOptions>(options => options.Clock = fakeTimeProvider);
                services.AddSingleton<TimeProvider>(fakeTimeProvider);
                services.AddSingleton(fakeTimeProvider);

                if (configureMaskinporten)
                {
                    services.Configure<MaskinportenSettings>(options =>
                    {
                        options.Authority = DefaultSettings.Authority;
                        options.ClientId = DefaultSettings.ClientId;
                        options.JwkBase64 = DefaultSettings.JwkBase64;
                    });
                    services.Configure<MaskinportenSettings>(
                        MaskinportenClient.VariantInternal,
                        options =>
                        {
                            options.Authority = InternalSettings.Authority;
                            options.ClientId = InternalSettings.ClientId;
                            options.JwkBase64 = InternalSettings.JwkBase64;
                        }
                    );
                }
            });

            return new Fixture(app);
        }

        public async ValueTask DisposeAsync() => await App.DisposeAsync();
    }

    public static TheoryData<string> Variants =>
        new(MaskinportenClient.VariantDefault, MaskinportenClient.VariantInternal);

    [Fact]
    public async Task Test_DI_And_Configuration()
    {
        // Arrange
        await using var fixture = Fixture.Create();
        var defaultClient = fixture.Client(MaskinportenClient.VariantDefault);
        var internalClient = fixture.Client(MaskinportenClient.VariantInternal);
        Assert.NotNull(defaultClient);
        Assert.NotNull(internalClient);

        // Assert
        defaultClient.Should().NotBeSameAs(internalClient);
        defaultClient.Settings.Should().BeEquivalentTo(Fixture.DefaultSettings);
        internalClient.Settings.Should().BeEquivalentTo(Fixture.InternalSettings);
        internalClient.Variant.Should().Be(MaskinportenClient.VariantInternal);
        defaultClient.Variant.Should().Be(MaskinportenClient.VariantDefault);
        fixture
            .App.Services.GetRequiredService<IMaskinportenTokenProvider>()
            .Should()
            .BeOfType<LegacyMaskinportenTokenProvider>();
    }

    [Fact]
    public void FormattedScopes_FormatsCorrectly()
    {
        MaskinportenClient.FormattedScopes(["a", "b", "c"]).Should().Be("a b c");
        MaskinportenClient.FormattedScopes(["a b", "c"]).Should().Be("a b c");
        MaskinportenClient.FormattedScopes(["a b c"]).Should().Be("a b c");
    }

    [Fact]
    public async Task GenerateAuthenticationPayload_HasCorrectFormat()
    {
        // Arrange
        var jwt = "access-token-content";

        // Act
        var content = MaskinportenClient.AuthenticationPayloadFactory(jwt);
        var parsed = await TestHelpers.ParseFormUrlEncodedContent(content);

        // Assert
        parsed.Count.Should().Be(2);
        parsed["grant_type"].Should().Be("urn:ietf:params:oauth:grant-type:jwt-bearer");
        parsed["assertion"].Should().Be(jwt);
    }

    [Theory]
    [MemberData(nameof(Variants))]
    public async Task GenerateJwtGrant_HasCorrectFormat(string variant)
    {
        // Arrange
        await using var fixture = Fixture.Create();
        var settings = fixture.Client(variant).Settings;
        var scopes = "scope1 scope2";

        // Act
        var jwt = fixture.Client(variant).GenerateJwtGrant(scopes);
        var parsed = new JwtSecurityTokenHandler().ReadJwtToken(jwt);

        // Assert
        parsed.Audiences.Count().Should().Be(1);
        parsed.Audiences.First().Should().Be(settings.Authority);
        parsed.Issuer.Should().Be(settings.ClientId);
        parsed.Claims.First(x => x.Type == "scope").Value.Should().Be(scopes);
    }

    [Theory]
    [MemberData(nameof(Variants))]
    public async Task GenerateJwtGrant_HandlesMissingSettings(string variant)
    {
        // Arrange
        await using var fixture = Fixture.Create(configureMaskinporten: false);

        // Act
        var act = () =>
        {
            fixture.Client(variant).GenerateJwtGrant("scope");
        };

        // Assert
        act.Should().Throw<MaskinportenConfigurationException>();
    }

    [Theory]
    [MemberData(nameof(Variants))]
    public async Task GetAccessToken_ReturnsAToken(string variant)
    {
        // Arrange
        await using var fixture = Fixture.Create();
        string[] scopes = ["scope1", "scope2"];
        string formattedScopes = MaskinportenClient.FormattedScopes(scopes);
        var maskinportenTokenResponse = TestAuthentication.GetMaskinportenToken(
            scope: formattedScopes,
            expiry: TimeSpan.FromMinutes(2),
            fixture.FakeTime
        );
        fixture
            .HttpClientFactoryMock.Setup(x => x.CreateClient(It.IsAny<string>()))
            .Returns(() =>
            {
                var mockHandler = TestHelpers.MockHttpMessageHandlerFactory(maskinportenTokenResponse);
                return new HttpClient(mockHandler.Object);
            });

        // Act
        var result = await fixture.Client(variant).GetAccessToken(scopes);

        // Assert
        result.Should().BeEquivalentTo(maskinportenTokenResponse.AccessToken);
        result.Scope.Should().BeEquivalentTo(formattedScopes);
    }

    [Theory]
    [MemberData(nameof(Variants))]
    public async Task GetAltinnExchangedToken_ReturnsAToken(string variant)
    {
        // Arrange
        await using var fixture = Fixture.Create();
        string[] scopes = ["scope1", "scope2"];
        var maskinportenTokenResponse = TestAuthentication.GetMaskinportenToken(
            scope: MaskinportenClient.FormattedScopes(scopes),
            expiry: TimeSpan.FromMinutes(2),
            fixture.FakeTime
        );
        var expiresIn = TimeSpan.FromMinutes(30);
        var altinnAccessToken = TestAuthentication.GetServiceOwnerToken(
            "405003309",
            org: "ttd",
            expiry: expiresIn,
            timeProvider: fixture.FakeTime
        );
        fixture
            .HttpClientFactoryMock.Setup(x => x.CreateClient(It.IsAny<string>()))
            .Returns(() =>
            {
                var mockHandler = TestHelpers.MockHttpMessageHandlerFactory(
                    maskinportenTokenResponse,
                    altinnAccessToken
                );
                return new HttpClient(mockHandler.Object);
            });

        // Act
        var result = await fixture.Client(variant).GetAltinnExchangedToken(scopes);

        // Assert
        result.Value.Should().NotBeNullOrWhiteSpace();
        result.ExpiresAt.Should().Be(fixture.FakeTime.GetUtcNow().Add(expiresIn).UtcDateTime);
    }

    [Theory]
    [MemberData(nameof(Variants))]
    public async Task GetAccessToken_ThrowsExceptionWhenTokenIsExpired(string variant)
    {
        // Arrange
        await using var fixture = Fixture.Create();
        var maskinportenTokenResponse = TestAuthentication.GetMaskinportenToken(
            scope: "-",
            expiry: MaskinportenClient.TokenExpirationMargin - TimeSpan.FromSeconds(1),
            fixture.FakeTime
        );

        fixture
            .HttpClientFactoryMock.Setup(x => x.CreateClient(It.IsAny<string>()))
            .Returns(() =>
            {
                var mockHandler = TestHelpers.MockHttpMessageHandlerFactory(maskinportenTokenResponse);
                return new HttpClient(mockHandler.Object);
            });

        // Act
        Func<Task> act1 = async () =>
        {
            await fixture.Client(variant).GetAccessToken(["scope1", "scope2"]);
        };
        Func<Task> act2 = async () =>
        {
            await fixture.Client(variant).GetAltinnExchangedToken(["scope1", "scope2"]);
        };

        // Assert
        await act1.Should().ThrowAsync<MaskinportenTokenExpiredException>();
        await act2.Should().ThrowAsync<MaskinportenTokenExpiredException>();
    }

    [Theory]
    [MemberData(nameof(Variants))]
    public async Task GetAccessToken_UsesCachedTokenIfAvailable(string variant)
    {
        // Arrange
        await using var fixture = Fixture.Create();
        string[] scopes = ["scope1", "scope2"];
        var maskinportenTokenResponse = () =>
            TestAuthentication.GetMaskinportenToken(
                scope: MaskinportenClient.FormattedScopes(scopes),
                expiry: TimeSpan.FromMinutes(2),
                fixture.FakeTime
            );
        fixture
            .HttpClientFactoryMock.Setup(x => x.CreateClient(It.IsAny<string>()))
            .Returns(() =>
            {
                var mockHandler = TestHelpers.MockHttpMessageHandlerFactory(maskinportenTokenResponse.Invoke());
                return new HttpClient(mockHandler.Object);
            });

        // Act
        var token1 = await fixture.Client(variant).GetAccessToken(scopes);
        fixture.FakeTime.Advance(TimeSpan.FromMinutes(1));
        var token2 = await fixture.Client(variant).GetAccessToken(scopes);

        // Assert
        token1.Should().BeEquivalentTo(token2);
    }

    [Theory]
    [MemberData(nameof(Variants))]
    public async Task GetAccessToken_GeneratesNewTokenIfRequired(string variant)
    {
        // Arrange
        await using var fixture = Fixture.Create();
        string[] scopes = ["scope1", "scope2"];
        var maskinportenTokenResponse = () =>
            TestAuthentication.GetMaskinportenToken(
                scope: MaskinportenClient.FormattedScopes(scopes),
                expiry: MaskinportenClient.TokenExpirationMargin + TimeSpan.FromSeconds(1),
                fixture.FakeTime
            );
        fixture
            .HttpClientFactoryMock.Setup(x => x.CreateClient(It.IsAny<string>()))
            .Returns(() =>
            {
                var mockHandler = TestHelpers.MockHttpMessageHandlerFactory(maskinportenTokenResponse.Invoke());
                return new HttpClient(mockHandler.Object);
            });

        // Act
        var token1 = await fixture.Client(variant).GetAccessToken(scopes);
        fixture.FakeTime.Advance(TimeSpan.FromSeconds(10));
        var token2 = await fixture.Client(variant).GetAccessToken(scopes);

        // Assert
        token1.Should().NotBeSameAs(token2);
    }

    [Fact]
    public async Task ParseServerResponse_ThrowsOn_UnsuccessfulStatusCode()
    {
        // Arrange
        var unauthorizedResponse = new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.Unauthorized,
            Content = new StringContent(string.Empty),
        };

        // Act
        Func<Task> act = async () =>
        {
            await MaskinportenClient.ParseServerResponse(unauthorizedResponse);
        };

        // Assert
        await act.Should()
            .ThrowAsync<MaskinportenAuthenticationException>()
            .WithMessage(
                $"Maskinporten authentication failed with status code {(int)unauthorizedResponse.StatusCode} *"
            );
    }

    [Fact]
    public async Task ParseServerResponse_ThrowsOn_InvalidJson()
    {
        // Arrange
        var invalidJsonResponse = new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.OK,
            Content = new StringContent("Bad json formatting"),
        };

        // Act
        Func<Task> act = async () =>
        {
            await MaskinportenClient.ParseServerResponse(invalidJsonResponse);
        };

        // Assert
        await act.Should()
            .ThrowAsync<MaskinportenAuthenticationException>()
            .WithMessage("Maskinporten replied with invalid JSON formatting: *");
    }

    [Fact]
    public async Task ParseServerResponse_ThrowsOn_DisposedObject()
    {
        // Arrange
        var maskinportenTokenResponse = TestAuthentication.GetMaskinportenToken(
            scope: "a b",
            expiry: MaskinportenClient.TokenExpirationMargin + TimeSpan.FromSeconds(1)
        );
        var validHttpResponse = new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.OK,
            Content = new StringContent(JsonSerializer.Serialize(maskinportenTokenResponse)),
        };

        // Act
        validHttpResponse.Dispose();
        Func<Task> act = async () =>
        {
            await MaskinportenClient.ParseServerResponse(validHttpResponse);
        };

        // Assert
        await act.Should()
            .ThrowAsync<MaskinportenAuthenticationException>()
            .WithMessage("Authentication with Maskinporten failed: *");
    }
}
