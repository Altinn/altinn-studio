using System.Text;
using Altinn.App.Core.Constants;
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

    private const string CommandKey = "mutate-process-state";
    private const string ActorHash = "actor-hash";

    private static string GenerateToken(
        Guid instanceGuid,
        string secret,
        string? secretId,
        DateTime? expires = null,
        DateTime? notBefore = null,
        string[]? commands = null,
        bool omitCommands = false,
        bool omitActor = false
    )
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var handler = new JsonWebTokenHandler();
        var claims = new Dictionary<string, object> { [JwtClaimTypes.JwtId] = instanceGuid.ToString() };

        if (secretId is not null)
            claims[JwtClaimTypes.AppCode.SecretId] = secretId;
        if (!omitCommands)
            claims[WorkflowCallbackTokenBinding.CommandsClaim] = commands ?? [CommandKey];
        if (!omitActor)
            claims[WorkflowCallbackTokenBinding.ActorClaim] = ActorHash;

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
    public async Task ValidateToken_NullToken_Fails()
    {
        var result = await CreateSut().ValidateToken(null, Guid.NewGuid(), CommandKey);

        Assert.Null(result);
    }

    [Fact]
    public async Task ValidateToken_WhitespaceToken_Fails()
    {
        var result = await CreateSut().ValidateToken("   ", Guid.NewGuid(), CommandKey);

        Assert.Null(result);
    }

    [Fact]
    public async Task ValidateToken_ValidTokenMatchingSecret_Succeeds()
    {
        const string secret = "test-secret-that-is-long-enough-for-hmac";
        const string secretId = "id-1";
        var instanceGuid = Guid.NewGuid();
        SetupSecrets((secretId, secret));

        var token = GenerateToken(instanceGuid, secret, secretId);
        var result = await CreateSut().ValidateToken(token, instanceGuid, CommandKey);

        Assert.NotNull(result);
    }

    [Fact]
    public async Task ValidateToken_ValidTokenSignedWithOldSecret_Succeeds()
    {
        const string newSecret = "new-secret-that-is-long-enough-for-hmac";
        const string oldSecret = "old-secret-that-is-long-enough-for-hmac";
        const string oldSecretId = "id-old";
        var instanceGuid = Guid.NewGuid();
        SetupSecrets(("id-new", newSecret), (oldSecretId, oldSecret));

        var token = GenerateToken(instanceGuid, oldSecret, oldSecretId);
        var result = await CreateSut().ValidateToken(token, instanceGuid, CommandKey);

        Assert.NotNull(result);
    }

    [Fact]
    public async Task ValidateToken_UnknownSecretId_Fails()
    {
        const string secret = "correct-secret-that-is-long-enough-ok";
        var instanceGuid = Guid.NewGuid();
        SetupSecrets(("id-1", secret));

        var token = GenerateToken(instanceGuid, secret, "unknown-id");
        var result = await CreateSut().ValidateToken(token, instanceGuid, CommandKey);

        Assert.Null(result);
    }

    [Fact]
    public async Task ValidateToken_MissingSecretIdClaim_Fails()
    {
        const string secret = "correct-secret-that-is-long-enough-ok";
        var instanceGuid = Guid.NewGuid();
        SetupSecrets(("id-1", secret));

        // Correctly signed, but the secret_id claim is absent — must be rejected, not fall back.
        var token = GenerateToken(instanceGuid, secret, secretId: null);
        var result = await CreateSut().ValidateToken(token, instanceGuid, CommandKey);

        Assert.Null(result);
    }

    [Fact]
    public async Task ValidateToken_WrongSecret_Fails()
    {
        const string secret = "correct-secret-that-is-long-enough-ok";
        const string secretId = "id-1";
        var instanceGuid = Guid.NewGuid();
        SetupSecrets((secretId, secret));

        var token = GenerateToken(instanceGuid, "wrong-secret-that-is-long-enough-ok", secretId);
        var result = await CreateSut().ValidateToken(token, instanceGuid, CommandKey);

        Assert.Null(result);
    }

    [Fact]
    public async Task ValidateToken_ExpiredToken_Fails()
    {
        const string secret = "test-secret-that-is-long-enough-for-hmac";
        const string secretId = "id-1";
        var instanceGuid = Guid.NewGuid();
        SetupSecrets((secretId, secret));

        var token = GenerateToken(instanceGuid, secret, secretId, expires: DateTime.UtcNow.AddMinutes(-10));
        var result = await CreateSut().ValidateToken(token, instanceGuid, CommandKey);

        Assert.Null(result);
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
        var result = await CreateSut(new FakeTimeProvider(now)).ValidateToken(token, instanceGuid, CommandKey);

        Assert.NotNull(result);
    }

    [Fact]
    public async Task ValidateToken_ExpiredWithinClockSkew_Succeeds()
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
        var result = await CreateSut(new FakeTimeProvider(now)).ValidateToken(token, instanceGuid, CommandKey);

        Assert.NotNull(result);
    }

    [Fact]
    public async Task ValidateToken_ExpiredBeyondClockSkew_Fails()
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
        var result = await CreateSut(new FakeTimeProvider(now)).ValidateToken(token, instanceGuid, CommandKey);

        Assert.Null(result);
    }

    [Fact]
    public async Task ValidateToken_SecretCodeExpired_Fails()
    {
        var now = new DateTimeOffset(2025, 6, 1, 12, 0, 0, TimeSpan.Zero);
        const string secret = "test-secret-that-is-long-enough-for-hmac";
        const string secretId = "id-1";
        var instanceGuid = Guid.NewGuid();

        // The mounted code is past its expiry (beyond clock skew). Even a token whose own exp is far in the
        // future — as an attacker holding the leaked-but-expired code could mint — must be rejected, so code
        // expiry stays a meaningful security boundary on the validation path.
        _secretProviderMock
            .Setup(x => x.GetValidationSecrets())
            .Returns([
                new AppCode
                {
                    Id = secretId,
                    Code = secret,
                    IssuedAt = now.AddDays(-200),
                    ExpiresAt = now.AddMinutes(-10),
                },
            ]);

        var token = GenerateToken(
            instanceGuid,
            secret,
            secretId,
            expires: now.UtcDateTime.AddDays(30),
            notBefore: now.UtcDateTime.AddHours(-1)
        );
        var result = await CreateSut(new FakeTimeProvider(now)).ValidateToken(token, instanceGuid, CommandKey);

        Assert.Null(result);
    }

    [Fact]
    public async Task ValidateToken_JtiDoesNotMatchInstanceGuid_Fails()
    {
        const string secret = "test-secret-that-is-long-enough-for-hmac";
        const string secretId = "id-1";
        SetupSecrets((secretId, secret));

        var token = GenerateToken(Guid.NewGuid(), secret, secretId);
        var result = await CreateSut().ValidateToken(token, Guid.NewGuid(), CommandKey);

        Assert.Null(result);
    }

    [Fact]
    public async Task ValidateToken_InvalidJwt_Fails()
    {
        SetupSecrets(("id-1", "test-secret-that-is-long-enough-for-hmac"));

        var result = await CreateSut().ValidateToken("not.a.jwt", Guid.NewGuid(), CommandKey);

        Assert.Null(result);
    }

    [Fact]
    public async Task ValidateToken_NoSecretsConfigured_Fails()
    {
        _secretProviderMock
            .Setup(x => x.GetValidationSecrets())
            .Throws(new WorkflowCallbackSecretNotFoundException("no codes"));

        const string secret = "test-secret-that-is-long-enough-for-hmac";
        var instanceGuid = Guid.NewGuid();
        var token = GenerateToken(instanceGuid, secret, "id-1");

        var result = await CreateSut().ValidateToken(token, instanceGuid, CommandKey);

        Assert.Null(result);
    }

    [Fact]
    public async Task ValidateToken_NullToken_DoesNotCallSecretProvider()
    {
        var result = await CreateSut().ValidateToken(null, Guid.NewGuid(), CommandKey);

        Assert.Null(result);
        _secretProviderMock.Verify(x => x.GetValidationSecrets(), Times.Never);
    }

    [Fact]
    public async Task ValidateToken_ValidToken_ReturnsTheBoundActorHash()
    {
        const string secret = "test-secret-that-is-long-enough-for-hmac";
        var instanceGuid = Guid.NewGuid();
        SetupSecrets(("id-1", secret));

        var token = GenerateToken(instanceGuid, secret, "id-1");
        var result = await CreateSut().ValidateToken(token, instanceGuid, CommandKey);

        Assert.Equal(ActorHash, result?.ActorHash);
    }

    [Fact]
    public async Task ValidateToken_CommandNotAuthorizedByToken_Fails()
    {
        const string secret = "test-secret-that-is-long-enough-for-hmac";
        var instanceGuid = Guid.NewGuid();
        SetupSecrets(("id-1", secret));

        var token = GenerateToken(instanceGuid, secret, "id-1", commands: ["commit-process-state", CommandKey]);

        Assert.NotNull(await CreateSut().ValidateToken(token, instanceGuid, "commit-process-state"));
        Assert.Null(await CreateSut().ValidateToken(token, instanceGuid, "execute-service-task"));
    }

    [Fact]
    public async Task ValidateToken_CommandKeyMatchIsCaseSensitive()
    {
        const string secret = "test-secret-that-is-long-enough-for-hmac";
        var instanceGuid = Guid.NewGuid();
        SetupSecrets(("id-1", secret));

        var token = GenerateToken(instanceGuid, secret, "id-1");

        Assert.Null(await CreateSut().ValidateToken(token, instanceGuid, CommandKey.ToUpperInvariant()));
    }

    [Fact]
    public async Task ValidateToken_TokenWithoutCommands_Fails()
    {
        const string secret = "test-secret-that-is-long-enough-for-hmac";
        var instanceGuid = Guid.NewGuid();
        SetupSecrets(("id-1", secret));

        var token = GenerateToken(instanceGuid, secret, "id-1", omitCommands: true);

        Assert.Null(await CreateSut().ValidateToken(token, instanceGuid, CommandKey));
    }

    [Fact]
    public async Task ValidateToken_TokenWithoutActorBinding_Fails()
    {
        const string secret = "test-secret-that-is-long-enough-for-hmac";
        var instanceGuid = Guid.NewGuid();
        SetupSecrets(("id-1", secret));

        var token = GenerateToken(instanceGuid, secret, "id-1", omitActor: true);

        Assert.Null(await CreateSut().ValidateToken(token, instanceGuid, CommandKey));
    }
}
