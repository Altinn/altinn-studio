using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Text.Json;
using Altinn.App.Core.Features.Maskinporten;
using Altinn.App.Core.Features.Maskinporten.Constants;
using Altinn.App.Core.Features.Maskinporten.Exceptions;
using Altinn.App.Core.Features.Maskinporten.Models;
using Altinn.App.Core.Internal.Maskinporten;
using FluentAssertions;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Internal;
using Microsoft.Extensions.Time.Testing;
using Microsoft.Identity.Client;
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

            var app = AppBuilder.Build(registerCustomAppServices: services =>
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
        Assert.NotSame(defaultClient, internalClient);
        Assert.Equivalent(Fixture.DefaultSettings, defaultClient.Settings);
        Assert.Equivalent(Fixture.InternalSettings, internalClient.Settings);
        Assert.Equivalent(MaskinportenClient.VariantDefault, defaultClient.Variant);
        Assert.Equivalent(MaskinportenClient.VariantInternal, internalClient.Variant);

        Assert.IsType<LegacyMaskinportenTokenProvider>(
            fixture.App.Services.GetRequiredService<IMaskinportenTokenProvider>()
        );
    }

    [Theory]
    [InlineData(new[] { "a", "b", "c" }, "a b c")]
    [InlineData(new[] { "a b", "c" }, "a b c")]
    [InlineData(new[] { "a b c" }, "a b c")]
    public void FormattedScopes_FormatsCorrectly(IEnumerable<string> input, string expectedOutput)
    {
        var formattedScopes = MaskinportenClient.GetFormattedScopes(input);
        Assert.Equal(expectedOutput, formattedScopes);
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
        Assert.Equal(2, parsed.Count);
        Assert.Equal("urn:ietf:params:oauth:grant-type:jwt-bearer", parsed["grant_type"]);
        Assert.Equal(jwt, parsed["assertion"]);
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
        Assert.Single(parsed.Audiences);
        Assert.Equal(settings.Authority, parsed.Audiences.Single());
        Assert.Equal(settings.ClientId, parsed.Issuer);
        Assert.Equal(scopes, parsed.Claims.First(x => x.Type == "scope").Value);
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
        Assert.Throws<MaskinportenConfigurationException>(act);
    }

    [Theory]
    [MemberData(nameof(Variants))]
    public async Task GetAccessToken_ReturnsAToken(string variant)
    {
        // Arrange
        await using var fixture = Fixture.Create();
        string[] scopes = ["scope1", "scope2"];
        string formattedScopes = MaskinportenClient.GetFormattedScopes(scopes);
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
        Assert.Equal(maskinportenTokenResponse.AccessToken, result);
        Assert.Equal(maskinportenTokenResponse.Scope, result.Scope);
        Assert.Equal(formattedScopes, result.Scope);
    }

    [Theory]
    [MemberData(nameof(Variants))]
    public async Task GetAltinnExchangedToken_ReturnsAToken(string variant)
    {
        // Arrange
        await using var fixture = Fixture.Create();
        string[] scopes = [TestAuthentication.DefaultServiceOwnerScope, "scope1", "scope2"];
        string formattedScopes = MaskinportenClient.GetFormattedScopes(scopes);
        var maskinportenTokenResponse = TestAuthentication.GetMaskinportenToken(
            scope: formattedScopes,
            expiry: TimeSpan.FromMinutes(2),
            fixture.FakeTime
        );
        var expiresIn = TimeSpan.FromMinutes(30);
        var expectedExpiresAt = fixture.FakeTime.GetUtcNow().Add(expiresIn).UtcDateTime;
        var altinnAccessToken = TestAuthentication.GetServiceOwnerToken(
            scope: formattedScopes,
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
        Assert.Equal(altinnAccessToken, result.Value);
        Assert.Equal(expectedExpiresAt, result.ExpiresAt);
        Assert.Equal(formattedScopes, result.Scope);
    }

    [Theory]
    [MemberData(nameof(Variants))]
    public async Task GetAccessToken_ThrowsExceptionWhenTokenIsExpired(string variant)
    {
        // Arrange
        await using var fixture = Fixture.Create();
        var maskinportenTokenResponse = TestAuthentication.GetMaskinportenToken(
            scope: "scope",
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
            await fixture.Client(variant).GetAccessToken(["scope"]);
        };
        Func<Task> act2 = async () =>
        {
            await fixture.Client(variant).GetAltinnExchangedToken(["scope"]);
        };

        // Assert
        await Assert.ThrowsAsync<MaskinportenTokenExpiredException>(act1);
        await Assert.ThrowsAsync<MaskinportenTokenExpiredException>(act2);
    }

    [Theory]
    [MemberData(nameof(Variants))]
    public async Task TokenCache_Returns_SameInstanceForIdenticalRequests(string variant)
    {
        // Arrange
        await using var fixture = Fixture.Create();
        var client = fixture.Client(variant);
        var maskinportenTokenResponse = () =>
            TestAuthentication.GetMaskinportenToken(scope: "scope", expiry: TimeSpan.FromMinutes(2), fixture.FakeTime);
        var altinnAccessToken = () => TestAuthentication.GetServiceOwnerToken();
        fixture
            .HttpClientFactoryMock.Setup(x => x.CreateClient(It.IsAny<string>()))
            .Returns(() =>
            {
                var mockHandler = TestHelpers.MockHttpMessageHandlerFactory(
                    maskinportenTokenResponse.Invoke(),
                    altinnAccessToken.Invoke()
                );
                return new HttpClient(mockHandler.Object);
            });

        // Act
        var maskinportenResult1 = await client.GetOrCreateTokenFromCache(TokenAuthority.Maskinporten, ["scope"]);
        var maskinportenResult2 = await client.GetOrCreateTokenFromCache(TokenAuthority.Maskinporten, ["scope"]);
        var altinnResult1 = await client.GetOrCreateTokenFromCache(TokenAuthority.AltinnTokenExchange, ["scope"]);
        var altinnResult2 = await client.GetOrCreateTokenFromCache(TokenAuthority.AltinnTokenExchange, ["scope"]);

        // Assert
        Assert.NotEqual(maskinportenResult1.Token.Value, altinnResult1.Token.Value);
        Assert.Same(maskinportenResult1, maskinportenResult2);
        Assert.Same(altinnResult1, altinnResult2);
    }

    [Theory]
    [MemberData(nameof(Variants))]
    public async Task GetAccessToken_UsesCachedTokenIfAvailable(string variant)
    {
        // Arrange
        await using var fixture = Fixture.Create();
        var client = fixture.Client(variant);
        var maskinportenTokenResponse = () =>
            TestAuthentication.GetMaskinportenToken(scope: "scope", expiry: TimeSpan.FromMinutes(2), fixture.FakeTime);
        fixture
            .HttpClientFactoryMock.Setup(x => x.CreateClient(It.IsAny<string>()))
            .Returns(() =>
            {
                var mockHandler = TestHelpers.MockHttpMessageHandlerFactory(maskinportenTokenResponse.Invoke());
                return new HttpClient(mockHandler.Object);
            });

        // Act
        var token1 = await client.GetAccessToken(["scope"]);
        fixture.FakeTime.Advance(TimeSpan.FromMinutes(1));
        var token2 = await client.GetAccessToken(["scope"]);

        // Assert
        Assert.Equal(token1, token2);
    }

    [Theory]
    [MemberData(nameof(Variants))]
    public async Task GetAccessToken_GeneratesNewTokenIfRequired(string variant)
    {
        // Arrange
        await using var fixture = Fixture.Create();
        var client = fixture.Client(variant);
        var maskinportenTokenResponse = () =>
            TestAuthentication.GetMaskinportenToken(
                scope: "scope",
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
        var token1 = await client.GetAccessToken(["scope"]);
        fixture.FakeTime.Advance(TimeSpan.FromSeconds(10));
        var token2 = await client.GetAccessToken(["scope"]);

        // Assert
        Assert.NotEqual(token1, token2);
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
        var ex = await Assert.ThrowsAsync<MaskinportenAuthenticationException>(act);
        Assert.Matches(
            $"Maskinporten authentication failed with status code {(int)unauthorizedResponse.StatusCode} .*",
            ex.Message
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
        var ex = await Assert.ThrowsAsync<MaskinportenAuthenticationException>(act);
        Assert.Matches("Maskinporten replied with invalid JSON formatting: .*", ex.Message);
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
        var ex = await Assert.ThrowsAsync<MaskinportenAuthenticationException>(act);
        Assert.Matches("Authentication with Maskinporten failed: .*", ex.Message);
    }

    [Fact]
    public async Task GetCacheKey_ReturnsExpectedKey()
    {
        // Arrange
        await using var fixture = Fixture.Create();
        var client = fixture.Client(MaskinportenClient.VariantDefault);
        var expectedMaskinportenKey = "maskinportenScope-default_scope1 scope2";
        var expectedAltinnKey = "maskinportenScope-altinn-default_scope1 scope2";

        // Act
        var maskinportenResult = client.GetCacheKey(TokenAuthority.Maskinporten, "scope1 scope2");
        var altinnResult = client.GetCacheKey(TokenAuthority.AltinnTokenExchange, "scope1 scope2");

        // Assert
        Assert.Equal(expectedMaskinportenKey, maskinportenResult);
        Assert.Equal(expectedAltinnKey, altinnResult);
    }
}
