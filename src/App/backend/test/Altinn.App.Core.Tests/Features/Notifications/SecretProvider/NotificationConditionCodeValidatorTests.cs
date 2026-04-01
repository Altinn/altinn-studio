using System.Text;
using Altinn.App.Core.Features.Notifications.SecretProvider;
using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using Moq;

namespace Altinn.App.Core.Tests.Features.Notifications.SecretProvider;

public class NotificationConditionCodeValidatorTests
{
    private readonly Mock<INotificationConditionSecretProvider> _secretProviderMock = new(MockBehavior.Strict);
    private readonly Mock<ILogger<NotificationConditionCodeValidator>> _loggerMock = new();

    private NotificationConditionCodeValidator CreateSut() => new(_secretProviderMock.Object, _loggerMock.Object);

    private static string GenerateToken(Guid instanceGuid, string secret, string secretId, DateTime? expires = null)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var handler = new JsonWebTokenHandler();
        return handler.CreateToken(
            new SecurityTokenDescriptor
            {
                Claims = new Dictionary<string, object>
                {
                    [JwtRegisteredClaimNames.Jti] = instanceGuid.ToString(),
                    ["secret_id"] = secretId,
                },
                Expires = expires ?? DateTime.UtcNow.AddDays(31),
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
                    ExpiresAt = DateTimeOffset.UtcNow.AddDays(62),
                }),
            ]);

    [Fact]
    public async Task ValidateCode_NullCode_ReturnsFalse()
    {
        var result = await CreateSut().ValidateCode(null, Guid.NewGuid());

        Assert.False(result);
    }

    [Fact]
    public async Task ValidateCode_EmptyCode_ReturnsFalse()
    {
        var result = await CreateSut().ValidateCode("", Guid.NewGuid());

        Assert.False(result);
    }

    [Fact]
    public async Task ValidateCode_WhitespaceCode_ReturnsFalse()
    {
        var result = await CreateSut().ValidateCode("   ", Guid.NewGuid());

        Assert.False(result);
    }

    [Fact]
    public async Task ValidateCode_ValidTokenMatchingSecret_ReturnsTrue()
    {
        const string secret = "test-secret-that-is-long-enough-for-hmac";
        const string secretId = "id-1";
        var instanceGuid = Guid.NewGuid();
        SetupSecrets((secretId, secret));

        var token = GenerateToken(instanceGuid, secret, secretId);
        var result = await CreateSut().ValidateCode(token, instanceGuid);

        Assert.True(result);
    }

    [Fact]
    public async Task ValidateCode_ValidTokenSignedWithOldSecret_ReturnsTrue()
    {
        const string newSecret = "new-secret-that-is-long-enough-for-hmac";
        const string oldSecret = "old-secret-that-is-long-enough-for-hmac";
        const string oldSecretId = "id-old";
        var instanceGuid = Guid.NewGuid();
        SetupSecrets(("id-new", newSecret), (oldSecretId, oldSecret));

        var token = GenerateToken(instanceGuid, oldSecret, oldSecretId);
        var result = await CreateSut().ValidateCode(token, instanceGuid);

        Assert.True(result);
    }

    [Fact]
    public async Task ValidateCode_UnknownSecretId_ReturnsFalse()
    {
        const string secret = "correct-secret-that-is-long-enough-ok";
        var instanceGuid = Guid.NewGuid();
        SetupSecrets(("id-1", secret));

        var token = GenerateToken(instanceGuid, secret, "unknown-id");
        var result = await CreateSut().ValidateCode(token, instanceGuid);

        Assert.False(result);
    }

    [Fact]
    public async Task ValidateCode_WrongSecret_ReturnsFalse()
    {
        const string secret = "correct-secret-that-is-long-enough-ok";
        const string secretId = "id-1";
        var instanceGuid = Guid.NewGuid();
        SetupSecrets((secretId, secret));

        var token = GenerateToken(instanceGuid, "wrong-secret-that-is-long-enough-ok", secretId);
        var result = await CreateSut().ValidateCode(token, instanceGuid);

        Assert.False(result);
    }

    [Fact]
    public async Task ValidateCode_ExpiredToken_ReturnsFalse()
    {
        const string secret = "test-secret-that-is-long-enough-for-hmac";
        const string secretId = "id-1";
        var instanceGuid = Guid.NewGuid();
        SetupSecrets((secretId, secret));

        var token = GenerateToken(instanceGuid, secret, secretId, expires: DateTime.UtcNow.AddMinutes(-10));
        var result = await CreateSut().ValidateCode(token, instanceGuid);

        Assert.False(result);
    }

    [Fact]
    public async Task ValidateCode_JtiDoesNotMatchInstanceGuid_ReturnsFalse()
    {
        const string secret = "test-secret-that-is-long-enough-for-hmac";
        const string secretId = "id-1";
        SetupSecrets((secretId, secret));

        var token = GenerateToken(Guid.NewGuid(), secret, secretId);
        var result = await CreateSut().ValidateCode(token, Guid.NewGuid());

        Assert.False(result);
    }

    [Fact]
    public async Task ValidateCode_InvalidJwt_ReturnsFalse()
    {
        SetupSecrets(("id-1", "test-secret-that-is-long-enough-for-hmac"));

        var result = await CreateSut().ValidateCode("not.a.jwt", Guid.NewGuid());

        Assert.False(result);
    }

    [Fact]
    public async Task ValidateCode_NullCode_DoesNotCallSecretProvider()
    {
        var result = await CreateSut().ValidateCode(null, Guid.NewGuid());

        Assert.False(result);
        _secretProviderMock.Verify(x => x.GetValidationSecrets(), Times.Never);
    }
}
