using System.Diagnostics;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Maskinporten;
using Altinn.App.Core.Features.Maskinporten.Constants;
using Altinn.App.Core.Features.Maskinporten.Exceptions;
using Altinn.App.Core.Features.Maskinporten.Models;
using Altinn.App.Core.Models;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Internal;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using Microsoft.IdentityModel.Tokens;
using Moq;
using Moq.Protected;

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

        public static Fixture Create(bool configureMaskinporten = true, string? authority = null)
        {
            var mockHttpClientFactory = new Mock<IHttpClientFactory>();
            var fakeTimeProvider = new FakeTime(new DateTimeOffset(2024, 1, 1, 10, 0, 0, TimeSpan.Zero));
            var effectiveAuthority = authority ?? DefaultSettings.Authority;

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
                        options.Authority = effectiveAuthority;
                        options.ClientId = DefaultSettings.ClientId;
                        options.JwkBase64 = DefaultSettings.JwkBase64;
                    });
                    services.Configure<MaskinportenSettings>(
                        MaskinportenClient.VariantInternal,
                        options =>
                        {
                            options.Authority = effectiveAuthority;
                            options.ClientId = InternalSettings.ClientId;
                            options.JwkBase64 = InternalSettings.JwkBase64;
                        }
                    );
                }
            });

            return new Fixture(app);
        }

        /// <summary>
        /// A client constructed directly against the supplied options monitor (and optionally its own time
        /// provider), for tests that need to mutate settings or control the clock independently of the fixture.
        /// </summary>
        public MaskinportenClient ClientWithOptions(
            string variant,
            IOptionsMonitor<MaskinportenSettings> options,
            TimeProvider? timeProvider = null,
            ILogger<MaskinportenClient>? logger = null
        ) =>
            new(
                variant,
                options,
                App.Services.GetRequiredService<IOptions<PlatformSettings>>(),
                App.Services.GetRequiredService<IHttpClientFactory>(),
                App.Services.GetRequiredService<HybridCache>(),
                logger ?? App.Services.GetRequiredService<ILogger<MaskinportenClient>>(),
                timeProvider ?? App.Services.GetRequiredService<TimeProvider>()
            );

        /// <summary>
        /// A client wired to a logger that records every rendered Debug message into <paramref name="sink"/>.
        /// </summary>
        public MaskinportenClient ClientWithLogCapture(string variant, List<string> sink) =>
            new(
                variant,
                App.Services.GetRequiredService<IOptionsMonitor<MaskinportenSettings>>(),
                App.Services.GetRequiredService<IOptions<PlatformSettings>>(),
                App.Services.GetRequiredService<IHttpClientFactory>(),
                App.Services.GetRequiredService<HybridCache>(),
                new CapturingLogger(sink),
                App.Services.GetRequiredService<TimeProvider>()
            );

        private sealed class CapturingLogger(List<string> sink) : ILogger<MaskinportenClient>
        {
            public IDisposable? BeginScope<TState>(TState state)
                where TState : notnull => null;

            public bool IsEnabled(LogLevel logLevel) => true;

            public void Log<TState>(
                LogLevel logLevel,
                EventId eventId,
                TState state,
                Exception? exception,
                Func<TState, Exception?, string> formatter
            )
            {
                lock (sink)
                    sink.Add(formatter(state, exception));
            }
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
    }

    [Theory]
    [InlineData(new[] { "a", "b", "c" }, "a b c")]
    [InlineData(new[] { "a b", "c" }, "a b c")]
    [InlineData(new[] { "a b c" }, "a b c")]
    [InlineData(new[] { "a", "a", "b", "b", "c", "c" }, "a b c")]
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
        var audience = "https://test.maskinporten.no/";

        // Act
        var jwt = fixture
            .Client(variant)
            .GenerateJwtGrant(new MaskinportenTokenRequest { Scopes = [scopes] }, audience);
        var parsed = new JwtSecurityTokenHandler().ReadJwtToken(jwt);

        // Assert
        Assert.Single(parsed.Audiences);
        Assert.Equal(audience, parsed.Audiences.Single());
        Assert.Equal(settings.ClientId, parsed.Issuer);
        Assert.Equal(scopes, parsed.Claims.First(x => x.Type == "scope").Value);

        // The optional claims must not be emitted unless explicitly requested
        Assert.DoesNotContain(parsed.Claims, x => x.Type == "consumer_org");
        Assert.DoesNotContain(parsed.Claims, x => x.Type == "resource");
        Assert.DoesNotContain(parsed.Claims, x => x.Type == "authorization_details");
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
            fixture
                .Client(variant)
                .GenerateJwtGrant(new MaskinportenTokenRequest { Scopes = ["scope"] }, "https://test.maskinporten.no/");
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
        var request = new MaskinportenTokenRequest { Scopes = ["scope"] };
        var maskinportenResult1 = await client.GetOrCreateTokenFromCache(TokenAuthority.Maskinporten, request);
        var maskinportenResult2 = await client.GetOrCreateTokenFromCache(TokenAuthority.Maskinporten, request);
        var altinnResult1 = await client.GetOrCreateTokenFromCache(TokenAuthority.AltinnTokenExchange, request);
        var altinnResult2 = await client.GetOrCreateTokenFromCache(TokenAuthority.AltinnTokenExchange, request);

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
        var request = new MaskinportenTokenRequest { Scopes = ["scope1", "scope2"] };
        var expectedMaskinportenKey = "maskinportenScope-default_scope1 scope2";
        var expectedAltinnKey = "maskinportenScope-altinn-default_scope1 scope2";

        // Act
        var maskinportenResult = client.GetCacheKey(TokenAuthority.Maskinporten, request);
        var altinnResult = client.GetCacheKey(TokenAuthority.AltinnTokenExchange, request);

        // Assert
        Assert.Equal(expectedMaskinportenKey, maskinportenResult);
        Assert.Equal(expectedAltinnKey, altinnResult);
    }

    /// <summary>
    /// Wires the fixture's HttpClient factory to a handler driven by <paramref name="sendAsync"/>.
    /// Returns an accessor for the number of <c>CreateClient</c> calls — the client creates one
    /// HttpClient per actual fetch attempt, so this counts well-known fetches exactly.
    /// </summary>
    private static Func<int> SetupWellKnownEndpoint(
        Fixture fixture,
        Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> sendAsync
    )
    {
        var createClientCalls = 0;
        fixture
            .HttpClientFactoryMock.Setup(x => x.CreateClient(It.IsAny<string>()))
            .Returns(() =>
            {
                Interlocked.Increment(ref createClientCalls);
                var mockHandler = new Mock<HttpMessageHandler>();
                mockHandler
                    .Protected()
                    .Setup<Task<HttpResponseMessage>>(
                        "SendAsync",
                        ItExpr.IsAny<HttpRequestMessage>(),
                        ItExpr.IsAny<CancellationToken>()
                    )
                    .Returns(sendAsync);
                return new HttpClient(mockHandler.Object);
            });
        return () => Volatile.Read(ref createClientCalls);
    }

    private static HttpResponseMessage WellKnownSuccessResponse(string issuer) =>
        new() { StatusCode = HttpStatusCode.OK, Content = new StringContent(JsonSerializer.Serialize(new { issuer })) };

    private static HttpResponseMessage WellKnownErrorResponse() =>
        new() { StatusCode = HttpStatusCode.InternalServerError };

    [Theory]
    [MemberData(nameof(Variants))]
    public async Task GetAudienceFromWellKnown_FetchesOnceAndCachesIssuer(string variant)
    {
        // Arrange
        await using var fixture = Fixture.Create();
        var client = fixture.Client(variant);
        const string expectedIssuer = "https://issuer.maskinporten.no/";
        var fetchCount = SetupWellKnownEndpoint(
            fixture,
            (_, _) => Task.FromResult(WellKnownSuccessResponse(expectedIssuer))
        );

        // Act
        var result1 = await client.GetAudienceFromWellKnown();
        var result2 = await client.GetAudienceFromWellKnown();

        // Assert
        Assert.Equal(expectedIssuer, result1);
        Assert.Equal(expectedIssuer, result2);
        Assert.Equal(1, fetchCount()); // Only one HTTP call — the issuer is cached
    }

    [Theory]
    [MemberData(nameof(Variants))]
    public async Task GetAudienceFromWellKnown_IssuerIsCachedForProcessLifetime(string variant)
    {
        // Arrange
        await using var fixture = Fixture.Create();
        var client = fixture.Client(variant);
        const string issuer1 = "https://issuer1.maskinporten.no/";
        const string issuer2 = "https://issuer2.maskinporten.no/";
        var currentIssuer = issuer1;
        var fetchCount = SetupWellKnownEndpoint(
            fixture,
            (_, _) => Task.FromResult(WellKnownSuccessResponse(currentIssuer))
        );

        // Act - even if the server starts reporting a different issuer, the first value sticks
        var result1 = await client.GetAudienceFromWellKnown();
        currentIssuer = issuer2;
        fixture.FakeTime.Advance(TimeSpan.FromHours(48));
        var result2 = await client.GetAudienceFromWellKnown();

        // Assert
        Assert.Equal(issuer1, result1);
        Assert.Equal(issuer1, result2);
        Assert.Equal(1, fetchCount()); // No refetch, ever
    }

    [Theory]
    [MemberData(nameof(Variants))]
    public async Task GetAudienceFromWellKnown_FallsBackToAuthorityOnFailure(string variant)
    {
        // Arrange
        await using var fixture = Fixture.Create();
        var client = fixture.Client(variant);
        _ = SetupWellKnownEndpoint(fixture, (_, _) => Task.FromResult(WellKnownErrorResponse()));

        // Act
        var result = await client.GetAudienceFromWellKnown();

        // Assert - should fall back to Authority since no cached value exists
        Assert.Equal(client.Settings.Authority, result);
    }

    [Theory]
    [MemberData(nameof(Variants))]
    public async Task GetAudienceFromWellKnown_FailsFastWithinRetryWindow(string variant)
    {
        // Arrange
        await using var fixture = Fixture.Create();
        var client = fixture.Client(variant);
        var fetchCount = SetupWellKnownEndpoint(fixture, (_, _) => Task.FromResult(WellKnownErrorResponse()));

        // Act
        var result1 = await client.GetAudienceFromWellKnown();
        fixture.FakeTime.Advance(MaskinportenClient.WellKnownRetryInterval - TimeSpan.FromSeconds(1));
        var result2 = await client.GetAudienceFromWellKnown();
        var result3 = await client.GetAudienceFromWellKnown();

        // Assert - callers inside the retry window get the fallback without a new fetch
        Assert.Equal(client.Settings.Authority, result1);
        Assert.Equal(client.Settings.Authority, result2);
        Assert.Equal(client.Settings.Authority, result3);
        Assert.Equal(1, fetchCount());
    }

    [Theory]
    [MemberData(nameof(Variants))]
    public async Task GetAudienceFromWellKnown_RetriesAfterWindowAndRecoversImmediately(string variant)
    {
        // Arrange
        await using var fixture = Fixture.Create();
        var client = fixture.Client(variant);
        const string expectedIssuer = "https://issuer.maskinporten.no/";
        var shouldFail = true;
        var fetchCount = SetupWellKnownEndpoint(
            fixture,
            (_, _) => Task.FromResult(shouldFail ? WellKnownErrorResponse() : WellKnownSuccessResponse(expectedIssuer))
        );

        // Act
        var result1 = await client.GetAudienceFromWellKnown();
        shouldFail = false;
        fixture.FakeTime.Advance(MaskinportenClient.WellKnownRetryInterval + TimeSpan.FromSeconds(1));
        var result2 = await client.GetAudienceFromWellKnown();
        var result3 = await client.GetAudienceFromWellKnown();

        // Assert - the first caller past the window retries and gets the REAL issuer immediately
        Assert.Equal(client.Settings.Authority, result1);
        Assert.Equal(expectedIssuer, result2);
        Assert.Equal(expectedIssuer, result3);
        Assert.Equal(2, fetchCount()); // Initial failure + successful retry; result3 is served from cache
    }

    [Theory]
    [MemberData(nameof(Variants))]
    public async Task GetAudienceFromWellKnown_ProlongedOutageRestampsRetryWindow(string variant)
    {
        // Arrange
        await using var fixture = Fixture.Create();
        var client = fixture.Client(variant);
        var fetchCount = SetupWellKnownEndpoint(fixture, (_, _) => Task.FromResult(WellKnownErrorResponse()));

        // Act
        var result1 = await client.GetAudienceFromWellKnown();
        fixture.FakeTime.Advance(MaskinportenClient.WellKnownRetryInterval + TimeSpan.FromSeconds(1));
        var result2 = await client.GetAudienceFromWellKnown(); // Retries, fails again, re-stamps the window
        var result3 = await client.GetAudienceFromWellKnown(); // Inside the new window - no fetch

        // Assert
        Assert.Equal(client.Settings.Authority, result1);
        Assert.Equal(client.Settings.Authority, result2);
        Assert.Equal(client.Settings.Authority, result3);
        Assert.Equal(2, fetchCount());
    }

    [Theory]
    [MemberData(nameof(Variants))]
    public async Task GetAudienceFromWellKnown_SingleFlight_ConcurrentColdCallersShareOneFetch(string variant)
    {
        // Arrange
        await using var fixture = Fixture.Create();
        var client = fixture.Client(variant);
        const string expectedIssuer = "https://issuer.maskinporten.no/";
        var fetchEntered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var fetchGate = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var fetchCount = SetupWellKnownEndpoint(
            fixture,
            async (_, _) =>
            {
                fetchEntered.TrySetResult();
                await fetchGate.Task.WaitAsync(TimeSpan.FromSeconds(10));
                return WellKnownSuccessResponse(expectedIssuer);
            }
        );

        // Act - the first caller enters the fetch and blocks on the gate; the rest queue behind the lock
        var first = client.GetAudienceFromWellKnown().AsTask();
        await fetchEntered.Task.WaitAsync(TimeSpan.FromSeconds(10));
        var rest = Enumerable.Range(0, 4).Select(_ => client.GetAudienceFromWellKnown().AsTask()).ToArray();
        fetchGate.SetResult();
        var results = await Task.WhenAll([first, .. rest]).WaitAsync(TimeSpan.FromSeconds(10));

        // Assert
        Assert.All(results, result => Assert.Equal(expectedIssuer, result));
        Assert.Equal(1, fetchCount());
    }

    [Theory]
    [MemberData(nameof(Variants))]
    public async Task GetAudienceFromWellKnown_SingleFlight_ConcurrentCallersDuringOutageShareOneFetch(string variant)
    {
        // Arrange
        await using var fixture = Fixture.Create();
        var client = fixture.Client(variant);
        var fetchEntered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var fetchGate = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var fetchCount = SetupWellKnownEndpoint(
            fixture,
            async (_, _) =>
            {
                fetchEntered.TrySetResult();
                await fetchGate.Task.WaitAsync(TimeSpan.FromSeconds(10));
                return WellKnownErrorResponse();
            }
        );

        // Act - the first caller's fetch fails; the queued callers re-check inside the lock,
        // find themselves inside the freshly stamped retry window, and fall back without fetching
        var first = client.GetAudienceFromWellKnown().AsTask();
        await fetchEntered.Task.WaitAsync(TimeSpan.FromSeconds(10));
        var rest = Enumerable.Range(0, 4).Select(_ => client.GetAudienceFromWellKnown().AsTask()).ToArray();
        fetchGate.SetResult();
        var results = await Task.WhenAll([first, .. rest]).WaitAsync(TimeSpan.FromSeconds(10));

        // Assert
        Assert.All(results, result => Assert.Equal(client.Settings.Authority, result));
        Assert.Equal(1, fetchCount());
    }

    [Theory]
    [MemberData(nameof(Variants))]
    public async Task GetAudienceFromWellKnown_CancellationDoesNotStampRetryWindow(string variant)
    {
        // Arrange
        await using var fixture = Fixture.Create();
        var client = fixture.Client(variant);
        const string expectedIssuer = "https://issuer.maskinporten.no/";
        var gated = true;
        var fetchEntered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var fetchCount = SetupWellKnownEndpoint(
            fixture,
            async (_, cancellationToken) =>
            {
                if (!gated)
                    return WellKnownSuccessResponse(expectedIssuer);
                fetchEntered.TrySetResult();
                await Task.Delay(Timeout.Infinite, cancellationToken);
                throw new UnreachableException();
            }
        );

        // Act - cancel the caller mid-fetch
        using var cts = new CancellationTokenSource();
        var cancelledCall = client.GetAudienceFromWellKnown(cts.Token).AsTask();
        await fetchEntered.Task.WaitAsync(TimeSpan.FromSeconds(10));
        cts.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => cancelledCall);

        // A disconnecting client must not push other callers onto the fallback:
        // the very next caller fetches the real issuer instead of being fast-failed.
        gated = false;
        var result = await client.GetAudienceFromWellKnown();

        // Assert
        Assert.Equal(expectedIssuer, result);
        Assert.Equal(2, fetchCount()); // The cancelled fetch + the successful one
    }

    [Theory]
    [MemberData(nameof(Variants))]
    public async Task GetAudienceFromWellKnown_PreCancelledTokenThrowsWithoutFetching(string variant)
    {
        // Arrange
        await using var fixture = Fixture.Create();
        var client = fixture.Client(variant);
        const string expectedIssuer = "https://issuer.maskinporten.no/";
        var fetchCount = SetupWellKnownEndpoint(
            fixture,
            (_, _) => Task.FromResult(WellKnownSuccessResponse(expectedIssuer))
        );

        // Act
        using var cts = new CancellationTokenSource();
        cts.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(async () =>
            await client.GetAudienceFromWellKnown(cts.Token)
        );
        var result = await client.GetAudienceFromWellKnown();

        // Assert - the cancelled call neither fetched nor stamped the retry window
        Assert.Equal(expectedIssuer, result);
        Assert.Equal(1, fetchCount());
    }

    [Theory]
    [InlineData("""{"issuer":null}""")]
    [InlineData("""{"issuer":""}""")]
    [InlineData("""{"issuer":"   "}""")]
    public async Task GetAudienceFromWellKnown_NullOrEmptyIssuerFailsTheFetch(string responseBody)
    {
        // Arrange - STJ `required` enforces presence, not non-nullness, so `{"issuer":null}` deserializes
        // fine. It must be treated as a failed fetch, never cached or minted as the `aud` claim.
        await using var fixture = Fixture.Create();
        var client = fixture.Client(MaskinportenClient.VariantDefault);
        var fetchCount = SetupWellKnownEndpoint(
            fixture,
            (_, _) =>
                Task.FromResult(
                    new HttpResponseMessage
                    {
                        StatusCode = HttpStatusCode.OK,
                        Content = new StringContent(responseBody),
                    }
                )
        );

        // Act
        var result1 = await client.GetAudienceFromWellKnown();
        var result2 = await client.GetAudienceFromWellKnown();

        // Assert - callers get the Authority fallback, and the retry window was stamped (no second fetch)
        Assert.Equal(client.Settings.Authority, result1);
        Assert.Equal(client.Settings.Authority, result2);
        Assert.Equal(1, fetchCount());
    }

    [Fact]
    public async Task GetAudienceFromWellKnown_RefetchesWhenAuthorityIsReconfigured()
    {
        // Arrange - MaskinportenSettings is deliberately hot-reloadable (Kubernetes secret rotation), so a
        // corrected Authority must not keep serving the issuer that was resolved for the old one.
        await using var fixture = Fixture.Create();
        const string authorityA = "https://authority-a.maskinporten.dev/";
        const string authorityB = "https://authority-b.maskinporten.dev/";
        const string issuerA = "https://issuer-a.maskinporten.no/";
        const string issuerB = "https://issuer-b.maskinporten.no/";
        var currentSettings = Fixture.DefaultSettings with { Authority = authorityA };
        var optionsMonitor = new Mock<IOptionsMonitor<MaskinportenSettings>>();
        optionsMonitor.Setup(x => x.Get(It.IsAny<string?>())).Returns(() => currentSettings);
        var client = fixture.ClientWithOptions(MaskinportenClient.VariantDefault, optionsMonitor.Object);

        var requestedUrls = new List<Uri>();
        var fetchCount = SetupWellKnownEndpoint(
            fixture,
            (request, _) =>
            {
                lock (requestedUrls)
                    requestedUrls.Add(request.RequestUri!);
                var issuer = request.RequestUri!.ToString().StartsWith(authorityA, StringComparison.Ordinal)
                    ? issuerA
                    : issuerB;
                return Task.FromResult(WellKnownSuccessResponse(issuer));
            }
        );

        // Act
        var result1 = await client.GetAudienceFromWellKnown();
        var result2 = await client.GetAudienceFromWellKnown(); // Cached for authority A
        currentSettings = currentSettings with { Authority = authorityB };
        var result3 = await client.GetAudienceFromWellKnown(); // Authority changed - must refetch
        var result4 = await client.GetAudienceFromWellKnown(); // Cached for authority B

        // Assert
        Assert.Equal(issuerA, result1);
        Assert.Equal(issuerA, result2);
        Assert.Equal(issuerB, result3);
        Assert.Equal(issuerB, result4);
        Assert.Equal(2, fetchCount());
        Assert.Equal(2, requestedUrls.Count);
        Assert.StartsWith(authorityA, requestedUrls[0].ToString(), StringComparison.Ordinal);
        Assert.StartsWith(authorityB, requestedUrls[1].ToString(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task GetAudienceFromWellKnown_ClockNearMinValueDoesNotTriggerFailureWindow()
    {
        // Arrange - guard for the `_lastFailureTicks == 0` sentinel: a time provider whose current time is
        // within the retry interval of DateTimeOffset.MinValue must not read as "recently failed" at startup.
        await using var fixture = Fixture.Create();
        const string expectedIssuer = "https://issuer.maskinporten.no/";
        var fetchCount = SetupWellKnownEndpoint(
            fixture,
            (_, _) => Task.FromResult(WellKnownSuccessResponse(expectedIssuer))
        );
        var optionsMonitor = new Mock<IOptionsMonitor<MaskinportenSettings>>();
        optionsMonitor.Setup(x => x.Get(It.IsAny<string?>())).Returns(Fixture.DefaultSettings);
        var client = fixture.ClientWithOptions(
            MaskinportenClient.VariantDefault,
            optionsMonitor.Object,
            new FakeTimeProvider(DateTimeOffset.MinValue)
        );

        // Act
        var result = await client.GetAudienceFromWellKnown();

        // Assert - the cold client fetched instead of fast-failing onto the fallback
        Assert.Equal(expectedIssuer, result);
        Assert.Equal(1, fetchCount());
    }

    private MaskinportenWellKnownRefreshService RefreshService(
        Fixture fixture,
        ILogger<MaskinportenWellKnownRefreshService>? logger = null
    ) =>
        new(
            fixture.App.Services,
            logger ?? fixture.App.Services.GetRequiredService<ILogger<MaskinportenWellKnownRefreshService>>(),
            fixture.FakeTime
        );

    [Fact]
    public async Task WellKnownRefreshService_PopulatesIssuerForBothVariants()
    {
        // Arrange
        await using var fixture = Fixture.Create();
        const string expectedIssuer = "https://issuer.maskinporten.no/";
        var fetches = 0;
        var firstRound = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var fetchCount = SetupWellKnownEndpoint(
            fixture,
            (_, _) =>
            {
                if (Interlocked.Increment(ref fetches) == 2)
                    firstRound.TrySetResult();
                return Task.FromResult(WellKnownSuccessResponse(expectedIssuer));
            }
        );
        using var service = RefreshService(fixture);

        // Act - the service refreshes the variants sequentially, so once the internal variant's fetch has
        // started (firstRound), the default variant is fully resolved; the internal client call below
        // synchronizes on its own fetch lock and is served by the in-lock re-check without fetching.
        await service.StartAsync(CancellationToken.None);
        await firstRound.Task.WaitAsync(TimeSpan.FromSeconds(10));
        var defaultResult = await fixture.Client(MaskinportenClient.VariantDefault).GetAudienceFromWellKnown();
        var internalResult = await fixture.Client(MaskinportenClient.VariantInternal).GetAudienceFromWellKnown();
        await service.StopAsync(CancellationToken.None);

        // Assert - one fetch per variant during the initial iteration, and real callers are served from cache
        Assert.Equal(expectedIssuer, defaultResult);
        Assert.Equal(expectedIssuer, internalResult);
        Assert.Equal(2, fetchCount());
    }

    [Fact]
    public async Task WellKnownRefreshService_PeriodicTickRefreshesIssuer()
    {
        // Arrange
        await using var fixture = Fixture.Create();
        const string issuer1 = "https://issuer1.maskinporten.no/";
        const string issuer2 = "https://issuer2.maskinporten.no/";
        var currentIssuer = issuer1;
        var fetches = 0;
        var firstRound = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var secondRound = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var fetchCount = SetupWellKnownEndpoint(
            fixture,
            (_, _) =>
            {
                var n = Interlocked.Increment(ref fetches);
                if (n == 2)
                    firstRound.TrySetResult();
                if (n == 4)
                    secondRound.TrySetResult();
                return Task.FromResult(WellKnownSuccessResponse(currentIssuer));
            }
        );
        using var service = RefreshService(fixture);

        // Act
        await service.StartAsync(CancellationToken.None);
        await firstRound.Task.WaitAsync(TimeSpan.FromSeconds(10));
        var beforeTick = await fixture.Client(MaskinportenClient.VariantDefault).GetAudienceFromWellKnown();

        // The upstream issuer changes under an unchanged Authority; only the periodic refresh can notice
        currentIssuer = issuer2;
        fixture.FakeTime.Advance(MaskinportenWellKnownRefreshService.WellKnownRefreshInterval);
        await secondRound.Task.WaitAsync(TimeSpan.FromSeconds(10));
        var defaultResult = await fixture.Client(MaskinportenClient.VariantDefault).GetAudienceFromWellKnown();
        var internalResult = await fixture.Client(MaskinportenClient.VariantInternal).GetAudienceFromWellKnown();
        await service.StopAsync(CancellationToken.None);

        // Assert - two rounds of two variants; the client calls were all served from cache
        Assert.Equal(issuer1, beforeTick);
        Assert.Equal(issuer2, defaultResult);
        Assert.Equal(issuer2, internalResult);
        Assert.Equal(4, fetchCount());
    }

    [Fact]
    public async Task WellKnownRefreshService_FailedRefreshKeepsLastKnownGoodIssuer()
    {
        // Arrange
        await using var fixture = Fixture.Create();
        const string expectedIssuer = "https://issuer.maskinporten.no/";
        var shouldFail = false;
        var fetches = 0;
        var firstRound = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var secondRound = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var fetchCount = SetupWellKnownEndpoint(
            fixture,
            (_, _) =>
            {
                var n = Interlocked.Increment(ref fetches);
                if (n == 2)
                    firstRound.TrySetResult();
                if (n == 4)
                    secondRound.TrySetResult();
                return Task.FromResult(
                    shouldFail ? WellKnownErrorResponse() : WellKnownSuccessResponse(expectedIssuer)
                );
            }
        );
        var logger = new RecordingLogger<MaskinportenWellKnownRefreshService>();
        using var service = RefreshService(fixture, logger);

        // Act - resolve, then the next tick's refresh fails
        await service.StartAsync(CancellationToken.None);
        await firstRound.Task.WaitAsync(TimeSpan.FromSeconds(10));
        shouldFail = true;
        fixture.FakeTime.Advance(MaskinportenWellKnownRefreshService.WellKnownRefreshInterval);
        await secondRound.Task.WaitAsync(TimeSpan.FromSeconds(10));
        var result = await fixture.Client(MaskinportenClient.VariantDefault).GetAudienceFromWellKnown();
        await service.StopAsync(CancellationToken.None);

        // Assert - last-known-good is kept, the client call did not fetch, and the service stays quiet
        Assert.Equal(expectedIssuer, result);
        Assert.Equal(4, fetchCount());
        Assert.DoesNotContain(logger.Snapshot(), entry => entry.Level > LogLevel.Debug);
    }

    [Fact]
    public async Task RefreshWellKnownIssuer_FailureDoesNotStampRetryWindow()
    {
        // Arrange
        await using var fixture = Fixture.Create();
        var client = fixture.Client(MaskinportenClient.VariantDefault);
        const string expectedIssuer = "https://issuer.maskinporten.no/";
        var shouldFail = true;
        var fetchCount = SetupWellKnownEndpoint(
            fixture,
            (_, _) => Task.FromResult(shouldFail ? WellKnownErrorResponse() : WellKnownSuccessResponse(expectedIssuer))
        );

        // Act - a failed background refresh propagates to the caller (the hosted service)...
        await Assert.ThrowsAsync<HttpRequestException>(() => client.RefreshWellKnownIssuer(CancellationToken.None));

        // ...and must not stamp the fail-fast window: the next real request performs its own
        // blocking fetch instead of being fast-failed onto the fallback.
        shouldFail = false;
        var result = await client.GetAudienceFromWellKnown();

        // Assert
        Assert.Equal(expectedIssuer, result);
        Assert.Equal(2, fetchCount());
    }

    [Fact]
    public async Task RefreshWellKnownIssuer_LogsWarningOnlyWhenIssuerChangesUnderTheSameAuthority()
    {
        // Arrange
        await using var fixture = Fixture.Create();
        const string authorityA = "https://authority-a.maskinporten.dev/";
        const string authorityB = "https://authority-b.maskinporten.dev/";
        const string issuer1 = "https://issuer1.maskinporten.no/";
        const string issuer2 = "https://issuer2.maskinporten.no/";
        const string issuer3 = "https://issuer3.maskinporten.no/";
        var currentIssuer = issuer1;
        var fetchCount = SetupWellKnownEndpoint(
            fixture,
            (_, _) => Task.FromResult(WellKnownSuccessResponse(currentIssuer))
        );
        var logger = new RecordingLogger<MaskinportenClient>();
        var currentSettings = Fixture.DefaultSettings with { Authority = authorityA };
        var optionsMonitor = new Mock<IOptionsMonitor<MaskinportenSettings>>();
        optionsMonitor.Setup(x => x.Get(It.IsAny<string?>())).Returns(() => currentSettings);
        var client = fixture.ClientWithOptions(
            MaskinportenClient.VariantDefault,
            optionsMonitor.Object,
            logger: logger
        );

        // Act & assert - cold refresh (nothing to compare) and same-issuer refresh log no warning
        await client.RefreshWellKnownIssuer(CancellationToken.None);
        await client.RefreshWellKnownIssuer(CancellationToken.None);

        // A hot-reloaded Authority resolving to a different issuer is an authority change, not an issuer
        // change - warning about it would send an operator into the wrong investigation
        currentSettings = currentSettings with
        {
            Authority = authorityB,
        };
        currentIssuer = issuer2;
        await client.RefreshWellKnownIssuer(CancellationToken.None);
        Assert.DoesNotContain(logger.Snapshot(), entry => entry.Level >= LogLevel.Warning);

        // The issuer changing under an unchanged authority is the significant event - Warning
        currentIssuer = issuer3;
        await client.RefreshWellKnownIssuer(CancellationToken.None);
        var warnings = logger.Snapshot().Where(entry => entry.Level == LogLevel.Warning).ToList();
        var warning = Assert.Single(warnings);
        Assert.Contains(issuer2, warning.Message, StringComparison.Ordinal);
        Assert.Contains(issuer3, warning.Message, StringComparison.Ordinal);
        Assert.Equal(4, fetchCount());
    }

    [Fact]
    public async Task WellKnownRefreshService_UnconfiguredSettings_SkipsSilently()
    {
        // Arrange - Maskinporten is not configured, so the settings read inside the refresh throws
        // OptionsValidationException, which the service must swallow at Debug level
        await using var fixture = Fixture.Create(configureMaskinporten: false);
        var fetchCount = SetupWellKnownEndpoint(
            fixture,
            (_, _) => Task.FromResult(WellKnownSuccessResponse("https://issuer.maskinporten.no/"))
        );
        var loggedEntries = 0;
        var bothVariantsLogged = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var logger = new RecordingLogger<MaskinportenWellKnownRefreshService>(onEntry: () =>
        {
            if (Interlocked.Increment(ref loggedEntries) == 2)
                bothVariantsLogged.TrySetResult();
        });
        using var service = RefreshService(fixture, logger);

        // Act - ExecuteAsync is not guaranteed to run its first iteration before StartAsync returns,
        // so gate on the per-variant skip entries before stopping (no HTTP happens for unconfigured variants)
        await service.StartAsync(CancellationToken.None);
        await bothVariantsLogged.Task.WaitAsync(TimeSpan.FromSeconds(10));
        await service.StopAsync(CancellationToken.None);

        // Assert - no fetches, no startup noise above Debug, and exactly one Debug skip entry per
        // variant (which pins that the refresh path actually executed rather than the loop being dead)
        var entries = logger.Snapshot();
        Assert.Equal(0, fetchCount());
        Assert.Equal(2, entries.Count(entry => entry.Level == LogLevel.Debug));
        Assert.DoesNotContain(entries, entry => entry.Level > LogLevel.Debug);
    }

    [Fact]
    public async Task WellKnownRefreshService_ServiceResolutionFailureDoesNotFaultTheService()
    {
        // Arrange - a broken DI graph (client construction pulls IOptionsMonitor/IHttpClientFactory/
        // HybridCache) must never fault the BackgroundService: the framework default
        // BackgroundServiceExceptionBehavior.StopHost would stop the whole application.
        var provider = new Mock<IServiceProvider>();
        provider
            .Setup(x => x.GetService(typeof(IMaskinportenClient)))
            .Throws(new InvalidOperationException("broken DI graph"));
        var logger = new RecordingLogger<MaskinportenWellKnownRefreshService>();
        using var service = new MaskinportenWellKnownRefreshService(
            provider.Object,
            logger,
            new FakeTimeProvider(new DateTimeOffset(2024, 1, 1, 10, 0, 0, TimeSpan.Zero))
        );

        // Act - awaiting ExecuteTask throws if the service faulted
        await service.StartAsync(CancellationToken.None);
        await service.ExecuteTask!.WaitAsync(TimeSpan.FromSeconds(10));

        // Assert
        Assert.False(service.ExecuteTask.IsFaulted);
        Assert.DoesNotContain(logger.Snapshot(), entry => entry.Level > LogLevel.Debug);
    }

    [Fact]
    public async Task WellKnownRefreshService_ShutdownMidFetchEndsTheLoopCleanly()
    {
        // Arrange
        await using var fixture = Fixture.Create();
        var fetchEntered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var fetchCount = SetupWellKnownEndpoint(
            fixture,
            async (_, cancellationToken) =>
            {
                fetchEntered.TrySetResult();
                await Task.Delay(Timeout.Infinite, cancellationToken);
                throw new UnreachableException();
            }
        );
        using var service = RefreshService(fixture);

        // Act - stop the host while the first variant's fetch is in flight
        await service.StartAsync(CancellationToken.None);
        await fetchEntered.Task.WaitAsync(TimeSpan.FromSeconds(10));
        await service.StopAsync(CancellationToken.None);
        await service.ExecuteTask!.WaitAsync(TimeSpan.FromSeconds(10));

        // Assert - the loop ended cleanly and stays ended: no further fetches even after the interval
        Assert.False(service.ExecuteTask.IsFaulted);
        fixture.FakeTime.Advance(MaskinportenWellKnownRefreshService.WellKnownRefreshInterval);
        Assert.Equal(1, fetchCount());
    }

    [Fact]
    public async Task WellKnownRefreshService_IsRegisteredAsHostedService()
    {
        // Arrange
        await using var fixture = Fixture.Create();

        // Act
        var hostedServices = fixture.App.Services.GetServices<IHostedService>();

        // Assert - registered exactly once (TryAddEnumerable makes double registration safe)
        Assert.Single(hostedServices.OfType<MaskinportenWellKnownRefreshService>());
    }

    private sealed class RecordingLogger<T>(System.Action? onEntry = null) : ILogger<T>
    {
        private readonly List<(LogLevel Level, string Message)> _entries = [];

        public IReadOnlyList<(LogLevel Level, string Message)> Snapshot()
        {
            lock (_entries)
                return [.. _entries];
        }

        public IDisposable? BeginScope<TState>(TState state)
            where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter
        )
        {
            lock (_entries)
                _entries.Add((logLevel, formatter(state, exception)));
            onEntry?.Invoke();
        }
    }

    public static TheoryData<string> AuthorityVariants =>
        new()
        {
            "https://maskinporten.dev/", // with trailing slash
            "https://maskinporten.dev", // without trailing slash
        };

    [Theory]
    [MemberData(nameof(AuthorityVariants))]
    public async Task GetAccessToken_ConstructsCorrectTokenEndpointUrl_RegardlessOfTrailingSlash(string authority)
    {
        // Arrange
        await using var fixture = Fixture.Create(authority: authority);
        var client = fixture.Client(MaskinportenClient.VariantDefault);
        var capturedUrls = new CapturedUrls();
        var maskinportenTokenResponse = TestAuthentication.GetMaskinportenToken(
            scope: "scope",
            expiry: TimeSpan.FromMinutes(2),
            fixture.FakeTime
        );

        fixture
            .HttpClientFactoryMock.Setup(x => x.CreateClient(It.IsAny<string>()))
            .Returns(() =>
            {
                var mockHandler = TestHelpers.MockHttpMessageHandlerFactory(
                    maskinportenTokenResponse,
                    altinnAccessToken: null,
                    wellKnownIssuer: null,
                    capturedUrls
                );
                return new HttpClient(mockHandler.Object);
            });

        // Act
        await client.GetAccessToken(["scope"]);

        // Assert - token endpoint should always be constructed correctly
        Assert.NotNull(capturedUrls.TokenUrl);
        Assert.Equal("https://maskinporten.dev/token", capturedUrls.TokenUrl.ToString());
    }

    [Theory]
    [MemberData(nameof(AuthorityVariants))]
    public async Task GetAccessToken_ConstructsCorrectWellKnownUrl_RegardlessOfTrailingSlash(string authority)
    {
        // Arrange
        await using var fixture = Fixture.Create(authority: authority);
        var client = fixture.Client(MaskinportenClient.VariantDefault);
        var capturedUrls = new CapturedUrls();
        var maskinportenTokenResponse = TestAuthentication.GetMaskinportenToken(
            scope: "scope",
            expiry: TimeSpan.FromMinutes(2),
            fixture.FakeTime
        );

        fixture
            .HttpClientFactoryMock.Setup(x => x.CreateClient(It.IsAny<string>()))
            .Returns(() =>
            {
                var mockHandler = TestHelpers.MockHttpMessageHandlerFactory(
                    maskinportenTokenResponse,
                    altinnAccessToken: null,
                    wellKnownIssuer: null,
                    capturedUrls
                );
                return new HttpClient(mockHandler.Object);
            });

        // Act
        await client.GetAccessToken(["scope"]);

        // Assert - well-known endpoint should always be constructed correctly
        Assert.NotNull(capturedUrls.WellKnownUrl);
        Assert.Equal(
            "https://maskinporten.dev/.well-known/oauth-authorization-server",
            capturedUrls.WellKnownUrl.ToString()
        );
    }

    [Theory]
    [MemberData(nameof(AuthorityVariants))]
    public async Task GetAudienceFromWellKnown_FallbackAlwaysHasTrailingSlash(string authority)
    {
        // Arrange
        await using var fixture = Fixture.Create(authority: authority);
        var client = fixture.Client(MaskinportenClient.VariantDefault);

        fixture
            .HttpClientFactoryMock.Setup(x => x.CreateClient(It.IsAny<string>()))
            .Returns(() =>
            {
                var mockHandler = new Mock<HttpMessageHandler>();
                mockHandler
                    .Protected()
                    .Setup<Task<HttpResponseMessage>>(
                        "SendAsync",
                        ItExpr.IsAny<HttpRequestMessage>(),
                        ItExpr.IsAny<CancellationToken>()
                    )
                    .ReturnsAsync(new HttpResponseMessage { StatusCode = HttpStatusCode.InternalServerError });
                return new HttpClient(mockHandler.Object);
            });

        // Act
        var result = await client.GetAudienceFromWellKnown();

        // Assert - fallback should always have trailing slash for JWT audience claim
        Assert.Equal("https://maskinporten.dev/", result);
    }

    [Fact]
    public async Task GenerateJwtGrant_IncludesConsumerOrgAndResourceClaims()
    {
        // Arrange
        await using var fixture = Fixture.Create();
        var request = new MaskinportenTokenRequest
        {
            Scopes = ["scope1"],
            ConsumerOrg = OrganizationNumber.Parse("991825827"),
            Resource = "https://api.example.com/v1",
        };

        // Act
        var jwt = fixture.Client(MaskinportenClient.VariantDefault).GenerateJwtGrant(request, "https://aud/");
        var payload = DecodeJwtPayload(jwt);

        // Assert
        Assert.Equal("991825827", payload.GetProperty("consumer_org").GetString());
        Assert.Equal("https://api.example.com/v1", payload.GetProperty("resource").GetString());
        Assert.False(payload.TryGetProperty("authorization_details", out _));
    }

    [Fact]
    public async Task GenerateJwtGrant_IncludesSystemUserAuthorizationDetails()
    {
        // Arrange
        await using var fixture = Fixture.Create();
        var request = new MaskinportenTokenRequest
        {
            Scopes = ["scope1"],
            SystemUser = new MaskinportenSystemUser
            {
                Organization = OrganizationNumber.Parse("991825827"),
                ExternalRef = "systembruker-1",
            },
        };

        // Act
        var jwt = fixture.Client(MaskinportenClient.VariantDefault).GenerateJwtGrant(request, "https://aud/");
        var payload = DecodeJwtPayload(jwt);

        // Assert - the exact shape is dictated by https://docs.digdir.no/docs/Maskinporten/maskinporten_func_systembruker
        var details = payload.GetProperty("authorization_details");
        Assert.Equal(JsonValueKind.Array, details.ValueKind);
        var detail = Assert.Single(details.EnumerateArray().ToArray());
        Assert.Equal("urn:altinn:systemuser", detail.GetProperty("type").GetString());
        Assert.Equal("systembruker-1", detail.GetProperty("externalRef").GetString());

        var organization = detail.GetProperty("systemuser_org");
        Assert.Equal("iso6523-actorid-upis", organization.GetProperty("authority").GetString());
        Assert.Equal("0192:991825827", organization.GetProperty("ID").GetString());
    }

    [Fact]
    public async Task GenerateJwtGrant_SystemUserDetails_AreReadableByTheInboundTokenParser()
    {
        // Arrange: `Authenticated` already parses the `authorization_details` Maskinporten returns on inbound
        // system user tokens. That parser was written independently of this client, so round-tripping our
        // outbound grant through it cross-checks the fields both sides share — the `urn:altinn:systemuser`
        // discriminator and the `systemuser_org` authority/ID pair — instead of trusting one hand-written spelling.
        await using var fixture = Fixture.Create();
        var request = new MaskinportenTokenRequest
        {
            Scopes = ["scope1"],
            SystemUser = new MaskinportenSystemUser { Organization = OrganizationNumber.Parse("991825827") },
        };

        // Act
        var jwt = fixture.Client(MaskinportenClient.VariantDefault).GenerateJwtGrant(request, "https://aud/");
        var details = DecodeJwtPayload(jwt).GetProperty("authorization_details");
        var parsed = Authenticated.AuthorizationDetailsClaim.Parse(details);

        // Assert
        var systemUser = Assert.IsType<Authenticated.SystemUserAuthorizationDetailsClaim>(parsed);
        Assert.Equal("iso6523-actorid-upis", systemUser.SystemUserOrg.Authority);
        Assert.Equal("0192:991825827", systemUser.SystemUserOrg.Id);
    }

    [Fact]
    public async Task GenerateJwtGrant_OmitsExternalRefWhenNotSupplied()
    {
        // Arrange
        await using var fixture = Fixture.Create();
        var request = new MaskinportenTokenRequest
        {
            Scopes = ["scope1"],
            SystemUser = new MaskinportenSystemUser { Organization = OrganizationNumber.Parse("991825827") },
        };

        // Act
        var jwt = fixture.Client(MaskinportenClient.VariantDefault).GenerateJwtGrant(request, "https://aud/");
        var payload = DecodeJwtPayload(jwt);

        // Assert
        var detail = payload.GetProperty("authorization_details").EnumerateArray().Single();
        Assert.False(detail.TryGetProperty("externalRef", out _));
    }

    public static TheoryData<string, MaskinportenTokenRequest> DistinctRequests =>
        new()
        {
            {
                "scopes only",
                new MaskinportenTokenRequest { Scopes = ["a"] }
            },
            {
                "other scopes",
                new MaskinportenTokenRequest { Scopes = ["b"] }
            },
            {
                "consumer org",
                new MaskinportenTokenRequest { Scopes = ["a"], ConsumerOrg = OrganizationNumber.Parse("991825827") }
            },
            {
                "other consumer org",
                new MaskinportenTokenRequest { Scopes = ["a"], ConsumerOrg = OrganizationNumber.Parse("311169963") }
            },
            {
                "resource",
                new MaskinportenTokenRequest { Scopes = ["a"], Resource = "https://api.example.com" }
            },
            {
                "other resource",
                new MaskinportenTokenRequest { Scopes = ["a"], Resource = "https://other.example.com" }
            },
            {
                "resource with separator characters",
                new MaskinportenTokenRequest { Scopes = ["a"], Resource = "https://api.example.com/a%7Cb%23c" }
            },
            {
                "system user",
                new MaskinportenTokenRequest
                {
                    Scopes = ["a"],
                    SystemUser = new MaskinportenSystemUser { Organization = OrganizationNumber.Parse("991825827") },
                }
            },
            {
                "other system user",
                new MaskinportenTokenRequest
                {
                    Scopes = ["a"],
                    SystemUser = new MaskinportenSystemUser { Organization = OrganizationNumber.Parse("311169963") },
                }
            },
            {
                "system user with external ref",
                new MaskinportenTokenRequest
                {
                    Scopes = ["a"],
                    SystemUser = new MaskinportenSystemUser
                    {
                        Organization = OrganizationNumber.Parse("991825827"),
                        ExternalRef = "ref",
                    },
                }
            },
            {
                // Maskinporten's charset rules keep separators out of `externalRef`, so a second legal ref is
                // all we can probe here; `resource` above carries the adversarial separator case
                "system user with other external ref",
                new MaskinportenTokenRequest
                {
                    Scopes = ["a"],
                    SystemUser = new MaskinportenSystemUser
                    {
                        Organization = OrganizationNumber.Parse("991825827"),
                        ExternalRef = "other-ref",
                    },
                }
            },
            {
                "everything",
                new MaskinportenTokenRequest
                {
                    Scopes = ["a"],
                    ConsumerOrg = OrganizationNumber.Parse("991825827"),
                    Resource = "https://api.example.com",
                    SystemUser = new MaskinportenSystemUser { Organization = OrganizationNumber.Parse("991825827") },
                }
            },
        };

    [Fact]
    public async Task GetCacheKey_IsUniquePerRequest()
    {
        // Arrange
        await using var fixture = Fixture.Create();
        var client = fixture.Client(MaskinportenClient.VariantDefault);
        var authorities = new[] { TokenAuthority.Maskinporten, TokenAuthority.AltinnTokenExchange };

        // Act
        var keys = (
            from authority in authorities
            from row in DistinctRequests
            let request = (MaskinportenTokenRequest)row[1]
            select (Label: $"{authority}/{row[0]}", Key: client.GetCacheKey(authority, request))
        ).ToArray();

        // Assert
        var duplicates = keys.GroupBy(x => x.Key, StringComparer.Ordinal).Where(g => g.Count() > 1).ToArray();
        Assert.Empty(duplicates.Select(g => $"{g.Key}: {string.Join(", ", g.Select(x => x.Label))}"));
    }

    [Fact]
    public async Task GetAccessToken_CachesPerRequest_NotPerScope()
    {
        // Arrange
        await using var fixture = Fixture.Create();
        var client = fixture.Client(MaskinportenClient.VariantDefault);
        var tokenRequestCount = 0;
        fixture
            .HttpClientFactoryMock.Setup(x => x.CreateClient(It.IsAny<string>()))
            .Returns(() =>
            {
                var response = TestAuthentication.GetMaskinportenToken(
                    scope: "scope",
                    expiry: TimeSpan.FromMinutes(2),
                    fixture.FakeTime
                );
                var mockHandler = TestHelpers.MockHttpMessageHandlerFactory(response);
                mockHandler
                    .Protected()
                    .Setup<Task<HttpResponseMessage>>(
                        "SendAsync",
                        ItExpr.Is<HttpRequestMessage>(req => IsGrantRequest(req)),
                        ItExpr.IsAny<CancellationToken>()
                    )
                    .Returns(() =>
                    {
                        Interlocked.Increment(ref tokenRequestCount);
                        return Task.FromResult(
                            new HttpResponseMessage
                            {
                                StatusCode = HttpStatusCode.OK,
                                Content = new StringContent(JsonSerializer.Serialize(response)),
                            }
                        );
                    });
                return new HttpClient(mockHandler.Object);
            });

        // Act - same scopes, different consumer orgs
        await client.GetAccessToken(new MaskinportenTokenRequest { Scopes = ["scope"] });
        await client.GetAccessToken(new MaskinportenTokenRequest { Scopes = ["scope"] });
        await client.GetAccessToken(
            new MaskinportenTokenRequest { Scopes = ["scope"], ConsumerOrg = OrganizationNumber.Parse("991825827") }
        );
        await client.GetAccessToken(
            new MaskinportenTokenRequest { Scopes = ["scope"], ConsumerOrg = OrganizationNumber.Parse("311169963") }
        );

        // Assert - one grant request per distinct token identity
        Assert.Equal(3, tokenRequestCount);
    }

    [Fact]
    public async Task GetAltinnExchangedToken_ForwardsTheFullRequestToTheMaskinportenGrant()
    {
        // Arrange
        await using var fixture = Fixture.Create();
        var client = fixture.Client(MaskinportenClient.VariantDefault);
        string? capturedAssertion = null;
        var maskinportenTokenResponse = TestAuthentication.GetMaskinportenToken(
            scope: "scope",
            expiry: TimeSpan.FromMinutes(2),
            fixture.FakeTime
        );

        fixture
            .HttpClientFactoryMock.Setup(x => x.CreateClient(It.IsAny<string>()))
            .Returns(() =>
            {
                var mockHandler = TestHelpers.MockHttpMessageHandlerFactory(maskinportenTokenResponse);
                mockHandler
                    .Protected()
                    .Setup<Task<HttpResponseMessage>>(
                        "SendAsync",
                        ItExpr.Is<HttpRequestMessage>(req => IsGrantRequest(req)),
                        ItExpr.IsAny<CancellationToken>()
                    )
                    .Returns(
                        async (HttpRequestMessage req, CancellationToken ct) =>
                        {
                            var form = await TestHelpers.ParseFormUrlEncodedContent(
                                (FormUrlEncodedContent)req.Content!
                            );
                            capturedAssertion = form["assertion"];
                            return new HttpResponseMessage
                            {
                                StatusCode = HttpStatusCode.OK,
                                Content = new StringContent(JsonSerializer.Serialize(maskinportenTokenResponse)),
                            };
                        }
                    );
                return new HttpClient(mockHandler.Object);
            });

        // Act
        await client.GetAltinnExchangedToken(
            new MaskinportenTokenRequest
            {
                Scopes = ["scope"],
                ConsumerOrg = OrganizationNumber.Parse("991825827"),
                SystemUser = new MaskinportenSystemUser { Organization = OrganizationNumber.Parse("311169963") },
            }
        );

        // Assert - the exchange is fronted by a Maskinporten grant, which must carry the full request
        Assert.NotNull(capturedAssertion);
        var payload = DecodeJwtPayload(capturedAssertion);
        Assert.Equal("991825827", payload.GetProperty("consumer_org").GetString());
        var detail = payload.GetProperty("authorization_details").EnumerateArray().Single();
        Assert.Equal("0192:311169963", detail.GetProperty("systemuser_org").GetProperty("ID").GetString());
    }

    [Fact]
    public async Task GenerateJwtGrant_SignatureIsNeverLoggedInFull()
    {
        // Arrange: the grant assertion is a replayable credential for its lifetime, so the signature must be
        // masked the same way `JwtToken` masks itself. Every grant carries a fresh `jti`, so this has to assert
        // against the assertion that actually went over the wire — comparing against a separately generated one
        // would pass no matter what we log.
        await using var fixture = Fixture.Create();
        var request = new MaskinportenTokenRequest { Scopes = ["scope"] };
        var logged = new List<string>();
        string? sentAssertion = null;
        var maskinportenTokenResponse = TestAuthentication.GetMaskinportenToken(
            scope: "scope",
            expiry: TimeSpan.FromMinutes(2),
            fixture.FakeTime
        );

        fixture
            .HttpClientFactoryMock.Setup(x => x.CreateClient(It.IsAny<string>()))
            .Returns(() =>
            {
                var mockHandler = TestHelpers.MockHttpMessageHandlerFactory(maskinportenTokenResponse);
                mockHandler
                    .Protected()
                    .Setup<Task<HttpResponseMessage>>(
                        "SendAsync",
                        ItExpr.Is<HttpRequestMessage>(req => IsGrantRequest(req)),
                        ItExpr.IsAny<CancellationToken>()
                    )
                    .Returns(
                        async (HttpRequestMessage req, CancellationToken _) =>
                        {
                            var form = await TestHelpers.ParseFormUrlEncodedContent(
                                (FormUrlEncodedContent)req.Content!
                            );
                            sentAssertion = form["assertion"];
                            return new HttpResponseMessage
                            {
                                StatusCode = HttpStatusCode.OK,
                                Content = new StringContent(JsonSerializer.Serialize(maskinportenTokenResponse)),
                            };
                        }
                    );
                return new HttpClient(mockHandler.Object);
            });

        // Act
        await fixture.ClientWithLogCapture(MaskinportenClient.VariantDefault, logged).GetAccessToken(request);

        // Assert
        Assert.NotNull(sentAssertion);
        var parts = sentAssertion.Split('.');
        Assert.Equal(3, parts.Length);
        Assert.NotEmpty(parts[2]);

        Assert.DoesNotContain(logged, x => x.Contains(parts[2], StringComparison.Ordinal));
        Assert.Contains(logged, x => x.Contains($"{parts[0]}.{parts[1]}.<masked>", StringComparison.Ordinal));
    }

    [Fact]
    public async Task GetAccessToken_ThrowsOnNullRequest()
    {
        // Arrange
        await using var fixture = Fixture.Create();
        var client = fixture.Client(MaskinportenClient.VariantDefault);

        // Act & assert
        await Assert.ThrowsAsync<ArgumentNullException>(() => client.GetAccessToken((MaskinportenTokenRequest)null!));
        await Assert.ThrowsAsync<ArgumentNullException>(() =>
            client.GetAltinnExchangedToken((MaskinportenTokenRequest)null!)
        );
    }

    /// <summary>
    /// Matches only the grant request to Maskinporten's token endpoint. The Altinn exchange is a GET today, so
    /// matching on the verb alone would also work — but that would silently couple these tests to the verb.
    /// </summary>
    private static bool IsGrantRequest(HttpRequestMessage request) =>
        request.Method == HttpMethod.Post
        && request.RequestUri!.AbsolutePath.EndsWith("/token", StringComparison.Ordinal);

    private static JsonElement DecodeJwtPayload(string jwt)
    {
        var payload = jwt.Split('.')[1];
        return JsonDocument.Parse(Base64UrlEncoder.DecodeBytes(payload)).RootElement.Clone();
    }
}
