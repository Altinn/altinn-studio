using System.Diagnostics;
using System.Text;
using Altinn.App.Core.Features.Notifications.Exceptions;
using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.App.Core.Features.Notifications.SecretProvider;

/// <summary>
/// Validates JWT codes used for notification condition endpoints.
/// </summary>
public interface INotificationConditionCodeValidator
{
    /// <summary>
    /// Validates that the provided code is a valid JWT signed with the notification condition secret,
    /// and that it was issued for the specified instance.
    /// </summary>
    Task<bool> ValidateCode(string? code, Guid instanceGuid, Telemetry? telemetry = null);
}

/// <inheritdoc />
internal sealed class NotificationConditionCodeValidator(
    INotificationConditionSecretProvider secretProvider,
    ILogger<NotificationConditionCodeValidator> logger
) : INotificationConditionCodeValidator
{
    public async Task<bool> ValidateCode(string? code, Guid instanceGuid, Telemetry? telemetry = null)
    {
        using var activity = telemetry?.StartNotificationConditionValidateActivity(instanceGuid);

        if (string.IsNullOrWhiteSpace(code))
        {
            logger.LogWarning("Notification condition code validation failed: no code provided.");
            return false;
        }

        IReadOnlyList<AppCode> secrets;
        try
        {
            secrets = secretProvider.GetValidationSecrets();
        }
        catch (NotificationConditionSecretNotFoundException ex)
        {
            logger.LogWarning(ex, "Notification condition code validation failed - secrets not found.");
            activity?.SetStatus(
                ActivityStatusCode.Error,
                "Notification condition code validation failed - secrets not found."
            );
            return false;
        }

        JsonWebTokenHandler handler = new();

        // Read secret_id from token without validation to find the right secret
        JsonWebToken jwt;
        try
        {
            jwt = handler.ReadJsonWebToken(code);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Notification condition code validation failed: could not read token.");
            activity?.SetStatus(ActivityStatusCode.Error, "Could not read token.");
            return false;
        }

        string? secretId = jwt.GetClaim("secret_id")?.Value;
        AppCode? appCode = secretId is not null
            ? secrets.FirstOrDefault(s => s.Id == secretId)
            : secrets.FirstOrDefault();

        if (appCode is null)
        {
            logger.LogWarning(
                "Notification condition code validation failed: no secret found for secret_id {SecretId} for instance {InstanceGuid}.",
                secretId,
                instanceGuid
            );
            activity?.SetStatus(ActivityStatusCode.Error, "No secret found for token secret_id.");
            return false;
        }

        SymmetricSecurityKey key = new(Encoding.UTF8.GetBytes(appCode.Code));
        TokenValidationResult result = await handler.ValidateTokenAsync(
            code,
            new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = key,
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(5),
            }
        );

        if (!result.IsValid)
        {
            logger.LogWarning(
                "Notification condition code validation failed: token is invalid for instance {InstanceGuid}. Reason: {Reason}",
                instanceGuid,
                result.Exception?.Message
            );
            activity?.SetStatus(ActivityStatusCode.Error, "Token validation failed.");
            return false;
        }

        bool jtiMatches =
            result.Claims.TryGetValue(JwtRegisteredClaimNames.Jti, out object? jti)
            && jti?.ToString() == instanceGuid.ToString();

        if (!jtiMatches)
        {
            logger.LogWarning(
                "Notification condition code validation failed: jti claim {Jti} does not match instanceGuid {InstanceGuid}.",
                jti,
                instanceGuid
            );
            activity?.SetStatus(ActivityStatusCode.Error, "Token jti did not match instance guid.");
            return false;
        }

        return true;
    }
}
