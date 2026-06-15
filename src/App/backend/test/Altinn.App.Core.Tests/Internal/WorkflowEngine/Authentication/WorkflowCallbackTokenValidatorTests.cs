using System.Text;
using Altinn.App.Core.Features.Maskinporten.Constants;
using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Time.Testing;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Authentication;

public class WorkflowCallbackTokenValidatorTests
{
    private readonly Mock<IWorkflowCallbackSecretProvider> _secretProviderMock = new(MockBehavior.Strict);
    private readonly Mock<ILogger<WorkflowCallbackTokenValidator>> _loggerMock = new();

    private WorkflowCallbackTokenValidator CreateSut(TimeProvider? timeProvider = null) =>
        new(_secretProviderMock.Object, _loggerMock.Object, timeProvider);

    private static string GenerateToken(
        Guid instanceGuid,
        string secret,
        string? secretId,
        DateTime? expires = null,
        DateTime? notBefore = null
    )
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var handler = new JsonWebTokenHandler();
        var claims = new Dictionary<string, object> { [JwtClaims.JwtId] = instanceGuid.ToString() };

        if (secretId is not null)
            claims[JwtClaims.SecretId] = secretId;

        return handler.CreateToken(
            new SecurityTokenDescriptor
            {
                Claims = claims,
                // When not specified, the handler stamps nbf/iat at the current wall-clock time; tests that
                // pin a fake clock in the past must set NotBefore so the token is not "not yet valid".
                NotBefore = notBefore,
                IssuedAt = notBefore,
                Expires = expires ?? DateTime.UtcNow.AddDays(186),
                SigningCredentials = credentials,
            }
        );
    }

    private void SetupSecrets(params (string Id, string Code)[] secrets) =>
        _secretProviderMock
            .Setup(x => x.GetValidationSecrets())
            .Returns([
                .. secrets.Select(s => new AppCode
                {
                    Id = s.Id,
                    Code = s.Code,
                    IssuedAt = DateTimeOffset.UtcNow,
                    ExpiresAt = DateTimeOffset.UtcNow.AddDays(186),
                }),
            ]);

    [Fact]
    public async Task ValidateToken_NullToken_ReturnsFalse()
    {
        var result = await CreateSut().ValidateToken(null, Guid.NewGuid());

        Assert.False(result);
    }

    [Fact]
    public async Task ValidateToken_WhitespaceToken_ReturnsFalse()
    {
        var result = await CreateSut().ValidateToken("   ", Guid.NewGuid());

        Assert.False(result);
    }

    [Fact]
    public async Task ValidateToken_ValidTokenMatchingSecret_ReturnsTrue()
    {
        const string secret = "test-secret-that-is-long-enough-for-hmac";
        const string secretId = "id-1";
        var instanceGuid = Guid.NewGuid();
        SetupSecrets((secretId, secret));

        var token = GenerateToken(instanceGuid, secret, secretId);
        var result = await CreateSut().ValidateToken(token, instanceGuid);

        Assert.True(result);
    }

    [Fact]
    public async Task ValidateToken_ValidTokenSignedWithOldSecret_ReturnsTrue()
    {
        const string newSecret = "new-secret-that-is-long-enough-for-hmac";
        const string oldSecret = "old-secret-that-is-long-enough-for-hmac";
        const string oldSecretId = "id-old";
        var instanceGuid = Guid.NewGuid();
        SetupSecrets(("id-new", newSecret), (oldSecretId, oldSecret));

        var token = GenerateToken(instanceGuid, oldSecret, oldSecretId);
        var result = await CreateSut().ValidateToken(token, instanceGuid);

        Assert.True(result);
    }

    [Fact]
    public async Task ValidateToken_UnknownSecretId_ReturnsFalse()
    {
        const string secret = "correct-secret-that-is-long-enough-ok";
        var instanceGuid = Guid.NewGuid();
        SetupSecrets(("id-1", secret));

        var token = GenerateToken(instanceGuid, secret, "unknown-id");
        var result = await CreateSut().ValidateToken(token, instanceGuid);

        Assert.False(result);
    }

    [Fact]
    public async Task ValidateToken_MissingSecretIdClaim_ReturnsFalse()
    {
        const string secret = "correct-secret-that-is-long-enough-ok";
        var instanceGuid = Guid.NewGuid();
        SetupSecrets(("id-1", secret));

        // Correctly signed, but the secret_id claim is absent — must be rejected, not fall back.
        var token = GenerateToken(instanceGuid, secret, secretId: null);
        var result = await CreateSut().ValidateToken(token, instanceGuid);

        Assert.False(result);
    }

    [Fact]
    public async Task ValidateToken_WrongSecret_ReturnsFalse()
    {
        const string secret = "correct-secret-that-is-long-enough-ok";
        const string secretId = "id-1";
        var instanceGuid = Guid.NewGuid();
        SetupSecrets((secretId, secret));

        var token = GenerateToken(instanceGuid, "wrong-secret-that-is-long-enough-ok", secretId);
        var result = await CreateSut().ValidateToken(token, instanceGuid);

        Assert.False(result);
    }

    [Fact]
    public async Task ValidateToken_ExpiredToken_ReturnsFalse()
    {
        const string secret = "test-secret-that-is-long-enough-for-hmac";
        const string secretId = "id-1";
        var instanceGuid = Guid.NewGuid();
        SetupSecrets((secretId, secret));

        var token = GenerateToken(instanceGuid, secret, secretId, expires: DateTime.UtcNow.AddMinutes(-10));
        var result = await CreateSut().ValidateToken(token, instanceGuid);

        Assert.False(result);
    }

    [Fact]
    public async Task ValidateToken_ValidAtInjectedTime_HonorsInjectedClockOverWallClock()
    {
        // Fake clock far in the past; token expires shortly after the fake "now" but years before the
        // real wall clock. A true result proves the injected clock — not DateTime.UtcNow — drives validation.
        var now = new DateTimeOffset(2020, 1, 1, 0, 0, 0, TimeSpan.Zero);
        const string secret = "test-secret-that-is-long-enough-for-hmac";
        const string secretId = "id-1";
        var instanceGuid = Guid.NewGuid();
        SetupSecrets((secretId, secret));

        var token = GenerateToken(
            instanceGuid,
            secret,
            secretId,
            expires: now.UtcDateTime.AddHours(1),
            notBefore: now.UtcDateTime.AddHours(-1)
        );
        var result = await CreateSut(new FakeTimeProvider(now)).ValidateToken(token, instanceGuid);

        Assert.True(result);
    }

    [Fact]
    public async Task ValidateToken_ExpiredWithinClockSkew_ReturnsTrue()
    {
        var now = new DateTimeOffset(2025, 6, 1, 12, 0, 0, TimeSpan.Zero);
        const string secret = "test-secret-that-is-long-enough-for-hmac";
        const string secretId = "id-1";
        var instanceGuid = Guid.NewGuid();
        SetupSecrets((secretId, secret));

        // Expired 4 minutes before the injected "now" — inside the 5-minute clock skew.
        var token = GenerateToken(
            instanceGuid,
            secret,
            secretId,
            expires: now.UtcDateTime.AddMinutes(-4),
            notBefore: now.UtcDateTime.AddHours(-1)
        );
        var result = await CreateSut(new FakeTimeProvider(now)).ValidateToken(token, instanceGuid);

        Assert.True(result);
    }

    [Fact]
    public async Task ValidateToken_ExpiredBeyondClockSkew_ReturnsFalse()
    {
        var now = new DateTimeOffset(2025, 6, 1, 12, 0, 0, TimeSpan.Zero);
        const string secret = "test-secret-that-is-long-enough-for-hmac";
        const string secretId = "id-1";
        var instanceGuid = Guid.NewGuid();
        SetupSecrets((secretId, secret));

        // Expired 6 minutes before the injected "now" — beyond the 5-minute clock skew.
        var token = GenerateToken(
            instanceGuid,
            secret,
            secretId,
            expires: now.UtcDateTime.AddMinutes(-6),
            notBefore: now.UtcDateTime.AddHours(-1)
        );
        var result = await CreateSut(new FakeTimeProvider(now)).ValidateToken(token, instanceGuid);

        Assert.False(result);
    }

    [Fact]
    public async Task ValidateToken_JtiDoesNotMatchInstanceGuid_ReturnsFalse()
    {
        const string secret = "test-secret-that-is-long-enough-for-hmac";
        const string secretId = "id-1";
        SetupSecrets((secretId, secret));

        var token = GenerateToken(Guid.NewGuid(), secret, secretId);
        var result = await CreateSut().ValidateToken(token, Guid.NewGuid());

        Assert.False(result);
    }

    [Fact]
    public async Task ValidateToken_InvalidJwt_ReturnsFalse()
    {
        SetupSecrets(("id-1", "test-secret-that-is-long-enough-for-hmac"));

        var result = await CreateSut().ValidateToken("not.a.jwt", Guid.NewGuid());

        Assert.False(result);
    }

    [Fact]
    public async Task ValidateToken_NoSecretsConfigured_ReturnsFalse()
    {
        _secretProviderMock
            .Setup(x => x.GetValidationSecrets())
            .Throws(new WorkflowCallbackSecretNotFoundException("no codes"));

        const string secret = "test-secret-that-is-long-enough-for-hmac";
        var instanceGuid = Guid.NewGuid();
        var token = GenerateToken(instanceGuid, secret, "id-1");

        var result = await CreateSut().ValidateToken(token, instanceGuid);

        Assert.False(result);
    }

    [Fact]
    public async Task ValidateToken_NullToken_DoesNotCallSecretProvider()
    {
        var result = await CreateSut().ValidateToken(null, Guid.NewGuid());

        Assert.False(result);
        _secretProviderMock.Verify(x => x.GetValidationSecrets(), Times.Never);
    }
}
