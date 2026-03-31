using System.Diagnostics;
using System.Text;
using Altinn.App.Core.Features.Notifications.Exceptions;
using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.App.Core.Features.Notifications.SecretProvider;

/// <summary>
/// Generates JWT tokens for use in notification condition endpoints.
/// </summary>
internal interface INotificationConditionTokenGenerator
{
    /// <summary>
    /// Generates a signed JWT token for the given instance, valid for 31 days.
    /// </summary>
    string GenerateToken(Guid instanceGuid, Telemetry? telemetry = null, CancellationToken ct = default);
}

/// <inheritdoc />
internal sealed class NotificationConditionTokenGenerator(INotificationConditionSecretProvider secretProvider)
    : INotificationConditionTokenGenerator
{
    /// <inheritdoc />
    public string GenerateToken(Guid instanceGuid, Telemetry? telemetry = null, CancellationToken ct = default)
    {
        using var activity = telemetry?.StartNotificationConditionTokenGenerateActivity(instanceGuid);
        AppCode appCode;
        try
        {
            appCode = secretProvider.GetSigningSecret();
        }
        catch (NotificationConditionSecretNotFoundException)
        {
            activity?.SetStatus(
                ActivityStatusCode.Error,
                "Generating token for notification callback failed - secret not found"
            );
            throw;
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(appCode.Code));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Claims = new Dictionary<string, object>
            {
                [JwtRegisteredClaimNames.Jti] = instanceGuid.ToString(),
                ["secret_id"] = appCode.Id,
            },
            Expires = DateTime.UtcNow.AddDays(31),
            SigningCredentials = credentials,
        };

        var handler = new JsonWebTokenHandler();
        return handler.CreateToken(tokenDescriptor);
    }
}
