using System.Net;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Maskinporten;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Models;
using Altinn.App.PlatformServices.Tests.Mocks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Core.Tests.Internal.Auth;

public class AuthenticationTokenResolverTest
{
    private static readonly ApplicationMetadata _appMetadata = new("test-org/test-app") { Org = "test-org" };
    private static readonly PlatformSettings _platformSettings = new();
    private static readonly GeneralSettings _generalSettingsLocal = new();
    private static readonly GeneralSettings _generalSettingsTt02 = new() { HostName = "tt02.altinn.no" };
    private static readonly Authenticated _userAuth = TestAuthentication.GetUserAuthentication();

    private static readonly TestTokens _testTokens = new(
        UserToken: JwtToken.Parse(_userAuth.Token),
        ServiceOwnerTokenLocal: JwtToken.Parse(TestAuthentication.GetServiceOwnerToken()),
        ServiceOwnerTokenTt02: JwtToken.Parse(TestAuthentication.GetServiceOwnerToken()),
        MaskinportenToken: TestAuthentication.GetMaskinportenToken("-").AccessToken,
        CustomToken: TestAuthentication.GetMaskinportenToken("-").AccessToken
    );

    public static TheoryData<TestCase> TestCases =>
        [
            new(AuthenticationMethod.CurrentUser(), _testTokens.UserToken),
            new(AuthenticationMethod.ServiceOwner(), _testTokens.ServiceOwnerTokenLocal, _generalSettingsLocal),
            new(AuthenticationMethod.ServiceOwner(), _testTokens.ServiceOwnerTokenTt02, _generalSettingsTt02),
            new(AuthenticationMethod.Maskinporten("-"), _testTokens.MaskinportenToken),
            new(AuthenticationMethod.Custom(() => Task.FromResult(_testTokens.CustomToken)), _testTokens.CustomToken),
        ];

    [Theory]
    [MemberData(nameof(TestCases))]
    public async Task GetAccessToken_ResolvesCorrectTokenSource(TestCase testCase)
    {
        // Arrange
        await using var fixture = Fixture.Create(testCase.GeneralSettings);

        // Act
        var result = await fixture.AuthenticationTokenResolver.GetAccessToken(testCase.AuthenticationMethod);

        // Assert
        Assert.Equal(testCase.ExpectedToken, result);
    }

    [Fact]
    public async Task GetAccessToken_RequestsCorrectScope_Maskinporten()
    {
        // Arrange
        await using var fixture = Fixture.Create(_generalSettingsTt02);
        var authMethodMaskinporten = AuthenticationMethod.Maskinporten("a", "b");
        var authMethodAltinn = AuthenticationMethod.ServiceOwner("a", "b");

        // Act
        var resultMaskinporten = await fixture.AuthenticationTokenResolver.GetAccessToken(authMethodMaskinporten);
        var resultAltinn = await fixture.AuthenticationTokenResolver.GetAccessToken(authMethodAltinn);

        // Assert
        Assert.Contains("maskinporten.no", resultMaskinporten.Issuer);
        Assert.Contains("altinn.no", resultAltinn.Issuer);

        fixture.Mocks.MaskinportenClientMock.Verify(
            x =>
                x.GetAccessToken(
                    It.Is<IEnumerable<string>>(scopes => scopes.SequenceEqual(new[] { "a", "b" })),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );

        fixture.Mocks.MaskinportenClientMock.Verify(
            x =>
                x.GetAltinnExchangedToken(
                    It.Is<IEnumerable<string>>(scopes =>
                        scopes.SequenceEqual(
                            new[]
                            {
                                "altinn:serviceowner/instances.read",
                                "altinn:serviceowner/instances.write",
                                "a",
                                "b",
                            }
                        )
                    ),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task GetAccessToken_CallsCorrectUrl_Localtest()
    {
        // Arrange
        var authMethodAltinn = AuthenticationMethod.ServiceOwner("a", "b");
        string requestedUrl = string.Empty;
        string expectedUrl =
            "http://localhost:5101/Home/GetTestOrgToken?org=test-org&orgNumber=991825827&authenticationLevel=3&scopes=altinn%3Aserviceowner%2Finstances.read%20altinn%3Aserviceowner%2Finstances.write%20a%20b";

        await using var fixture = Fixture.Create(
            _generalSettingsLocal,
            request =>
            {
                requestedUrl = request.RequestUri!.AbsoluteUri;
            }
        );

        // Act
        var result = await fixture.AuthenticationTokenResolver.GetAccessToken(authMethodAltinn);

        // Assert
        Assert.Contains("altinn.no", result.Issuer);
        Assert.Equal(expectedUrl, requestedUrl);
    }

    [Fact]
    public void TestCases_HaveUniqueTokens()
    {
        var expectedTokenCount = TestCases.Count;
        var tokens = TestCases.Select((TestCase tc) => tc.ExpectedToken.Value).ToHashSet();

        Assert.Equal(expectedTokenCount, tokens.Count);
    }

    private sealed record Fixture : IAsyncDisposable
    {
        public required ServiceProvider ServiceProvider { get; init; }
        public required FixtureMocks Mocks { get; init; }
        public IAuthenticationTokenResolver AuthenticationTokenResolver =>
            ServiceProvider.GetRequiredService<IAuthenticationTokenResolver>();

        public static Fixture Create(
            GeneralSettings? generalSettings = null,
            Action<HttpRequestMessage>? localtestTokenCallback = null
        )
        {
            var mocks = new FixtureMocks();
            mocks.AppMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(_appMetadata);
            mocks.AuthenticationContextMock.Setup(x => x.Current).Returns(_userAuth);
            mocks
                .MaskinportenClientMock.Setup(x =>
                    x.GetAccessToken(It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>())
                )
                .ReturnsAsync(_testTokens.MaskinportenToken);
            mocks
                .MaskinportenClientMock.Setup(x =>
                    x.GetAltinnExchangedToken(It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>())
                )
                .ReturnsAsync(_testTokens.ServiceOwnerTokenTt02);
            mocks
                .HttpClientFactoryMock.Setup(x => x.CreateClient(It.IsAny<string>()))
                .Returns(() =>
                {
                    DelegatingHandlerStub delegatingHandler = new(
                        (request, ct) =>
                        {
                            localtestTokenCallback?.Invoke(request);

                            return Task.FromResult(
                                new HttpResponseMessage
                                {
                                    StatusCode = HttpStatusCode.OK,
                                    Content = new StringContent(_testTokens.ServiceOwnerTokenLocal),
                                }
                            );
                        }
                    );
                    return new HttpClient(delegatingHandler);
                });

            var services = new ServiceCollection();
            services.AddRuntimeEnvironment();
            services.Configure<PlatformSettings>(options =>
                options.ApiStorageEndpoint = _platformSettings.ApiStorageEndpoint
            );
            services.Configure<GeneralSettings>(options =>
                options.HostName = generalSettings?.HostName ?? _generalSettingsLocal.HostName
            );
            services.AddSingleton<IAuthenticationTokenResolver, AuthenticationTokenResolver>();
            services.AddSingleton<ModelSerializationService>();
            services.AddSingleton(mocks.AppModelMock.Object);
            services.AddSingleton(mocks.HttpClientFactoryMock.Object);
            services.AddSingleton(mocks.MaskinportenClientMock.Object);
            services.AddSingleton(mocks.AppMetadataMock.Object);
            services.AddSingleton(mocks.AuthenticationContextMock.Object);
            services.AddLogging(logging => logging.AddProvider(NullLoggerProvider.Instance));

            return new Fixture { Mocks = mocks, ServiceProvider = services.BuildServiceProvider() };
        }

        public sealed record FixtureMocks
        {
            public Mock<IAuthenticationContext> AuthenticationContextMock { get; init; } = new(MockBehavior.Strict);
            public Mock<IAppMetadata> AppMetadataMock { get; init; } = new(MockBehavior.Strict);
            public Mock<IHttpClientFactory> HttpClientFactoryMock { get; init; } = new(MockBehavior.Strict);
            public Mock<IMaskinportenClient> MaskinportenClientMock { get; init; } = new(MockBehavior.Strict);
            public Mock<IAppModel> AppModelMock { get; init; } = new(MockBehavior.Strict);
        }

        public async ValueTask DisposeAsync()
        {
            await ServiceProvider.DisposeAsync();
        }
    }

    private sealed record TestTokens(
        JwtToken UserToken,
        JwtToken ServiceOwnerTokenLocal,
        JwtToken ServiceOwnerTokenTt02,
        JwtToken MaskinportenToken,
        JwtToken CustomToken
    );

    public sealed record TestCase : IXunitSerializable
    {
        private const string SerializationIdentifier = "identifier";

        public GeneralSettings? GeneralSettings { get; set; }

        private AuthenticationMethod? _authenticationMethod;
        internal AuthenticationMethod AuthenticationMethod =>
            _authenticationMethod ?? throw new InvalidOperationException("TestCase has not been initialized.");

        private JwtToken? _expectedToken;
        public JwtToken ExpectedToken =>
            _expectedToken ?? throw new InvalidOperationException("TestCase has not been initialized.");

        public TestCase() { }

        internal TestCase(
            AuthenticationMethod authenticationMethod,
            JwtToken expectedToken,
            GeneralSettings? generalSettings = null
        )
        {
            _authenticationMethod = authenticationMethod;
            _expectedToken = expectedToken;
            GeneralSettings = generalSettings;
        }

        public void Deserialize(IXunitSerializationInfo info)
        {
            var identifier = info.GetValue<string>(SerializationIdentifier);

            foreach (var testCase in TestCases)
            {
                if (testCase?.ToString() == identifier)
                {
                    _authenticationMethod = testCase.AuthenticationMethod;
                    _expectedToken = testCase.ExpectedToken;
                    GeneralSettings = testCase.GeneralSettings;
                    return;
                }
            }

            throw new ArgumentException($"Unknown TestCase identifier: {identifier}", nameof(info));
        }

        public void Serialize(IXunitSerializationInfo info)
        {
            info.AddValue(SerializationIdentifier, ToString());
        }

        public override string ToString()
        {
            var authName = AuthenticationMethod.GetType().Name;

            return GeneralSettings is null ? authName : $"{authName} ({GeneralSettings.HostName})";
        }
    }
}
