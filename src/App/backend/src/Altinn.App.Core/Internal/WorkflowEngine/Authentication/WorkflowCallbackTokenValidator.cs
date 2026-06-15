using System.Text;
using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.App.Core.Internal.WorkflowEngine.Authentication;

/// <summary>
/// Validates the JWT replayed by the workflow engine on callbacks.
/// </summary>
internal interface IWorkflowCallbackTokenValidator
{
    /// <summary>
    /// Validates that <paramref name="token"/> is a JWT signed with a currently accepted
    /// <c>WorkflowEngineCallback</c> code and that it was issued for <paramref name="instanceGuid"/>.
    /// </summary>
    Task<bool> ValidateToken(string? token, Guid instanceGuid);
}

/// <inheritdoc />
internal sealed class WorkflowCallbackTokenValidator(
    IWorkflowCallbackSecretProvider secretProvider,
    ILogger<WorkflowCallbackTokenValidator> logger,
    TimeProvider? timeProvider = null
) : IWorkflowCallbackTokenValidator
{
    private static readonly TimeSpan _clockSkew = TimeSpan.FromMinutes(5);

    private readonly TimeProvider _timeProvider = timeProvider ?? TimeProvider.System;

    public async Task<bool> ValidateToken(string? token, Guid instanceGuid)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            logger.LogWarning("Workflow callback token validation failed: no token provided.");
            return false;
        }

        IReadOnlyList<AppCode> secrets;
        try
        {
            secrets = secretProvider.GetValidationSecrets();
        }
        catch (WorkflowCallbackSecretNotFoundException ex)
        {
            logger.LogWarning(ex, "Workflow callback token validation failed - secrets not found.");
            return false;
        }

        JsonWebTokenHandler handler = new();

        // Read secret_id from the token without validation to find the right secret (supports rotation).
        JsonWebToken jwt;
        try
        {
            jwt = handler.ReadJsonWebToken(token);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Workflow callback token validation failed: could not read token.");
            return false;
        }

        if (!jwt.TryGetClaim("secret_id", out var secretIdClaim))
        {
            logger.LogWarning(
                "Workflow callback token validation failed: token has no secret_id claim for instance {InstanceGuid}.",
                instanceGuid
            );
            return false;
        }

        string secretId = secretIdClaim.Value;
        AppCode? appCode = secrets.FirstOrDefault(s => s.Id == secretId);
        if (appCode is null)
        {
            logger.LogWarning(
                "Workflow callback token validation failed: no secret found for secret_id {SecretId} for instance {InstanceGuid}.",
                secretId,
                instanceGuid
            );
            return false;
        }

        SymmetricSecurityKey key = new(Encoding.UTF8.GetBytes(appCode.Code));
        TokenValidationResult result = await handler.ValidateTokenAsync(
            token,
            new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = key,
                ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateLifetime = true,
                // Use the injected clock for lifetime validation. TokenValidationParameters.TimeProvider
                // is not public in the referenced Microsoft.IdentityModel version, so override the
                // lifetime check directly (this also applies our clock skew, since the default skew
                // handling is bypassed when a custom LifetimeValidator is set).
                LifetimeValidator = ValidateLifetimeWithInjectedClock,
            }
        );

        if (!result.IsValid)
        {
            logger.LogWarning(
                "Workflow callback token validation failed: token is invalid for instance {InstanceGuid}. Reason: {Reason}",
                instanceGuid,
                result.Exception?.Message
            );
            return false;
        }

        bool jtiMatches =
            result.Claims.TryGetValue(JwtRegisteredClaimNames.Jti, out object? jti)
            && jti?.ToString() == instanceGuid.ToString();

        if (!jtiMatches)
        {
            logger.LogWarning(
                "Workflow callback token validation failed: jti claim {Jti} does not match instanceGuid {InstanceGuid}.",
                jti,
                instanceGuid
            );
            return false;
        }

        return true;
    }

    /// <summary>
    /// Validates the token lifetime against the injected <see cref="TimeProvider"/>, applying the same
    /// clock skew the default validator would. Tokens without an expiry are rejected.
    /// </summary>
    private bool ValidateLifetimeWithInjectedClock(
        DateTime? notBefore,
        DateTime? expires,
        SecurityToken securityToken,
        TokenValidationParameters validationParameters
    )
    {
        if (expires is null)
            return false;

        DateTime now = _timeProvider.GetUtcNow().UtcDateTime;

        if (now > expires.Value + _clockSkew)
            return false;

        if (notBefore is not null && now < notBefore.Value - _clockSkew)
            return false;

        return true;
    }
}
