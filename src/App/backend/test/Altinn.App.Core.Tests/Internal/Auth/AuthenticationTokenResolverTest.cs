using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Security.Claims;
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
    private static readonly Authenticated _userAuth = TestAuthentication.GetUserAuthentication();

    private static readonly TestTokens _testTokens = new(
        UserToken: JwtToken.Parse(_userAuth.Token),
        ServiceOwnerToken: JwtToken.Parse(TestAuthentication.GetServiceOwnerToken()),
        MaskinportenToken: TestAuthentication.GetMaskinportenToken("-").AccessToken,
        CustomToken: TestAuthentication.GetMaskinportenToken("-").AccessToken
    );

    // csharpier-ignore
    public static TheoryData<TestCase> TestCases
    {
        get
        {
            TheoryData<TestCase> data = new();
            data.Add(new(AuthenticationMethod.CurrentUser(), _testTokens.UserToken));
            data.Add(new(AuthenticationMethod.ServiceOwner(), _testTokens.ServiceOwnerToken));
            data.Add(new(AuthenticationMethod.Maskinporten("-"), _testTokens.MaskinportenToken));
            data.Add(new(AuthenticationMethod.Custom(() => Task.FromResult(_testTokens.CustomToken)), _testTokens.CustomToken));
            return data;
        }
    }

    [Theory]
    [MemberData(nameof(TestCases))]
    public async Task GetAccessToken_ResolvesCorrectTokenSource(TestCase testCase)
    {
        // Arrange
        await using var fixture = Fixture.Create();

        // Act
        var result = await fixture.AuthenticationTokenResolver.GetAccessToken(testCase.AuthenticationMethod);

        // Assert
        Assert.Equal(testCase.ExpectedToken, result);
    }

    [Fact]
    public async Task GetAccessToken_RequestsCorrectScope_Maskinporten()
    {
        // Arrange
        await using var fixture = Fixture.Create();
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
                                "altinn:serviceowner",
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
    public async Task GetAccessToken_UnderWorkflowCallbackPrincipal_ResolvesCurrentUserAsServiceOwner()
    {
        // Arrange: the ambient principal is an app callback (Authenticated.App), as during a workflow-engine
        // callback. There is no citizen user, so a CurrentUser() request must fall back to a service-owner
        // token rather than handing out the callback JWT (which Storage/PDF/register reject with 401).
        var appAuth = CreateAppCallbackAuthentication();
        await using var fixture = Fixture.Create(currentAuth: appAuth);

        // Act
        var result = await fixture.AuthenticationTokenResolver.GetAccessToken(AuthenticationMethod.CurrentUser());

        // Assert: resolved via the service-owner (Altinn-exchanged) path, not the callback token.
        Assert.Contains("altinn.no", result.Issuer);
        Assert.NotEqual(appAuth.Token, result.Value);
        fixture.Mocks.MaskinportenClientMock.Verify(
            x =>
                x.GetAltinnExchangedToken(
                    It.Is<IEnumerable<string>>(scopes =>
                        scopes.SequenceEqual(
                            new[]
                            {
                                "altinn:serviceowner",
                                "altinn:serviceowner/instances.read",
                                "altinn:serviceowner/instances.write",
                            }
                        )
                    ),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    private static Authenticated CreateAppCallbackAuthentication()
    {
        var jwt = new JwtSecurityToken(claims: [new Claim("jti", Guid.NewGuid().ToString())]);
        var token = new JwtSecurityTokenHandler().WriteToken(jwt);
        return Authenticated.FromApp(
            tokenStr: token,
            parsedToken: null,
            appId: new AppIdentifier("test-org", "test-app"),
            instanceId: null,
            appMetadata: _appMetadata
        );
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

        public static Fixture Create(Authenticated? currentAuth = null)
        {
            var mocks = new FixtureMocks();
            mocks.AuthenticationContextMock.Setup(x => x.Current).Returns(currentAuth ?? _userAuth);
            mocks
                .MaskinportenClientMock.Setup(x =>
                    x.GetAccessToken(It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>())
                )
                .ReturnsAsync(_testTokens.MaskinportenToken);
            mocks
                .MaskinportenClientMock.Setup(x =>
                    x.GetAltinnExchangedToken(It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>())
                )
                .ReturnsAsync(_testTokens.ServiceOwnerToken);
            var services = new ServiceCollection();
            services.AddSingleton<IAuthenticationTokenResolver, AuthenticationTokenResolver>();
            services.AddSingleton<ModelSerializationService>();
            services.AddSingleton(mocks.AppModelMock.Object);
            services.AddSingleton(mocks.MaskinportenClientMock.Object);
            services.AddSingleton(mocks.AuthenticationContextMock.Object);
            services.AddLogging(logging => logging.AddProvider(NullLoggerProvider.Instance));

            return new Fixture { Mocks = mocks, ServiceProvider = services.BuildServiceProvider() };
        }

        public sealed record FixtureMocks
        {
            public Mock<IAuthenticationContext> AuthenticationContextMock { get; init; } = new(MockBehavior.Strict);
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
        JwtToken ServiceOwnerToken,
        JwtToken MaskinportenToken,
        JwtToken CustomToken
    );

    public sealed record TestCase : IXunitSerializable
    {
        private const string SerializationIdentifier = "identifier";

        private AuthenticationMethod? _authenticationMethod;
        internal AuthenticationMethod AuthenticationMethod =>
            _authenticationMethod ?? throw new InvalidOperationException("TestCase has not been initialized.");

        private JwtToken? _expectedToken;
        public JwtToken ExpectedToken =>
            _expectedToken ?? throw new InvalidOperationException("TestCase has not been initialized.");

        public TestCase() { }

        internal TestCase(AuthenticationMethod authenticationMethod, JwtToken expectedToken)
        {
            _authenticationMethod = authenticationMethod;
            _expectedToken = expectedToken;
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
            return AuthenticationMethod.GetType().Name;
        }
    }
}
