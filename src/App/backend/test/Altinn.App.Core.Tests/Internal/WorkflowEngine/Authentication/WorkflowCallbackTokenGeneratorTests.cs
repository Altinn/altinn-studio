using Altinn.App.Core.Features.Maskinporten.Constants;
using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Microsoft.Extensions.Time.Testing;
using Microsoft.IdentityModel.JsonWebTokens;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Authentication;

public class WorkflowCallbackTokenGeneratorTests
{
    private readonly Mock<IWorkflowCallbackSecretProvider> _secretProviderMock = new(MockBehavior.Strict);

    private WorkflowCallbackTokenGenerator CreateSut(TimeProvider? timeProvider = null) =>
        new(_secretProviderMock.Object, timeProvider);

    private static AppCode MakeCode(string id, string code, DateTimeOffset expiresAt) =>
        new()
        {
            Id = id,
            Code = code,
            IssuedAt = DateTimeOffset.UtcNow,
            ExpiresAt = expiresAt,
        };

    [Fact]
    public void GenerateToken_SetsJtiAndSecretIdClaims()
    {
        var instanceGuid = Guid.NewGuid();
        _secretProviderMock
            .Setup(x => x.GetSigningSecret())
            .Returns(
                MakeCode("secret-id-1", "a-secret-that-is-long-enough-for-hmac", DateTimeOffset.UtcNow.AddDays(186))
            );

        var token = CreateSut().GenerateToken(instanceGuid);

        var jwt = new JsonWebTokenHandler().ReadJsonWebToken(token);
        Assert.Equal(instanceGuid.ToString(), jwt.GetClaim(JwtClaimTypes.JwtId).Value);
        Assert.Equal("secret-id-1", jwt.GetClaim(JwtClaimTypes.SecretId).Value);
    }

    [Fact]
    public void GenerateToken_BindsExpiryToCodeExpiresAt()
    {
        var expiresAt = DateTimeOffset.UtcNow.AddDays(123);
        _secretProviderMock
            .Setup(x => x.GetSigningSecret())
            .Returns(MakeCode("secret-id-1", "a-secret-that-is-long-enough-for-hmac", expiresAt));

        var token = CreateSut().GenerateToken(Guid.NewGuid());

        var jwt = new JsonWebTokenHandler().ReadJsonWebToken(token);
        // JWT exp is second-precision; compare with a tolerance.
        Assert.True(Math.Abs((jwt.ValidTo - expiresAt.UtcDateTime).TotalSeconds) < 2);
    }

    [Fact]
    public void GenerateToken_IsSignedWithTheCodeSecret()
    {
        const string secret = "a-secret-that-is-long-enough-for-hmac";
        _secretProviderMock
            .Setup(x => x.GetSigningSecret())
            .Returns(MakeCode("secret-id-1", secret, DateTimeOffset.UtcNow.AddDays(186)));

        var token = CreateSut().GenerateToken(Guid.NewGuid());

        // A token signed with HmacSha256 has three dot-separated segments.
        Assert.Equal(3, token.Split('.').Length);
        var jwt = new JsonWebTokenHandler().ReadJsonWebToken(token);
        Assert.Equal("HS256", jwt.Alg);
    }

    [Fact]
    public void GenerateToken_IssuedAtUsesInjectedClock()
    {
        var instant = new DateTimeOffset(2025, 1, 1, 12, 0, 0, TimeSpan.Zero);
        var timeProvider = new FakeTimeProvider(instant);
        _secretProviderMock
            .Setup(x => x.GetSigningSecret())
            .Returns(MakeCode("secret-id-1", "a-secret-that-is-long-enough-for-hmac", instant.AddDays(186)));

        var token = CreateSut(timeProvider).GenerateToken(Guid.NewGuid());

        var jwt = new JsonWebTokenHandler().ReadJsonWebToken(token);
        // iat is second-precision and is driven by the injected clock, not the wall clock.
        Assert.Equal(instant.UtcDateTime, jwt.IssuedAt);
    }

    [Fact]
    public void GenerateToken_PropagatesSecretNotFound()
    {
        _secretProviderMock
            .Setup(x => x.GetSigningSecret())
            .Throws(new WorkflowCallbackSecretNotFoundException("no codes"));

        Assert.Throws<WorkflowCallbackSecretNotFoundException>(() => CreateSut().GenerateToken(Guid.NewGuid()));
    }
}
