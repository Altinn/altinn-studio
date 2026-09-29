using System.Text;
using Altinn.App.Core.Constants;
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
    /// <c>WorkflowEngineCallback</c> code, issued for <paramref name="instanceGuid"/>, and authorizing
    /// <paramref name="commandKey"/>. Returns <c>null</c> when it is not.
    /// </summary>
    Task<ValidatedWorkflowCallbackToken?> ValidateToken(string? token, Guid instanceGuid, string commandKey);
}

/// <summary>
/// A callback token that passed validation, carrying what the request itself must still be checked against.
/// </summary>
/// <param name="ActorHash">
/// <see cref="WorkflowCallbackTokenBinding.ActorHash"/> of the actor the token was minted for.
/// </param>
internal sealed record ValidatedWorkflowCallbackToken(string ActorHash);

/// <inheritdoc />
internal sealed class WorkflowCallbackTokenValidator : IWorkflowCallbackTokenValidator
{
    private static readonly TimeSpan _clockSkew = TimeSpan.FromMinutes(5);

    private readonly TimeProvider _timeProvider;
    private readonly IWorkflowCallbackSecretProvider _secretProvider;
    private readonly ILogger<WorkflowCallbackTokenValidator> _logger;

    public WorkflowCallbackTokenValidator(
        IWorkflowCallbackSecretProvider secretProvider,
        ILogger<WorkflowCallbackTokenValidator> logger,
        TimeProvider? timeProvider = null
    )
    {
        _timeProvider = timeProvider ?? TimeProvider.System;
        _logger = logger;
        _secretProvider = secretProvider;
    }

    public async Task<ValidatedWorkflowCallbackToken?> ValidateToken(
        string? token,
        Guid instanceGuid,
        string commandKey
    )
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            _logger.LogWarning("Workflow callback token validation failed: no token provided.");
            return null;
        }

        IReadOnlyList<AppCode> secrets;
        try
        {
            secrets = _secretProvider.GetValidationSecrets();
        }
        catch (WorkflowCallbackSecretNotFoundException ex)
        {
            _logger.LogWarning(ex, "Workflow callback token validation failed - secrets not found.");
            return null;
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
            _logger.LogWarning(ex, "Workflow callback token validation failed: could not read token.");
            return null;
        }

        if (!jwt.TryGetClaim(JwtClaimTypes.AppCode.SecretId, out var secretIdClaim))
        {
            _logger.LogWarning(
                "Workflow callback token validation failed: token has no secret_id claim for instance {InstanceGuid}.",
                instanceGuid
            );
            return null;
        }

        string secretId = secretIdClaim.Value;
        AppCode? appCode = secrets.FirstOrDefault(s => s.Id == secretId);
        if (appCode is null)
        {
            _logger.LogWarning(
                "Workflow callback token validation failed: no secret found for secret_id {SecretId} for instance {InstanceGuid}.",
                secretId,
                instanceGuid
            );
            return null;
        }

        // Reject codes that are themselves expired (with the same clock skew applied to token lifetime).
        // Token expiry is bound to the signing code's expiry, so a legitimate token from an expired code is
        // already expired; this additionally blocks forged tokens (future exp) minted from a leaked code that
        // is still mounted but past its expiry, so code expiry remains a meaningful security boundary.
        if (_timeProvider.GetUtcNow() > appCode.ExpiresAt + _clockSkew)
        {
            _logger.LogWarning(
                "Workflow callback token validation failed: secret {SecretId} is expired for instance {InstanceGuid}.",
                secretId,
                instanceGuid
            );
            return null;
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
                LifetimeValidator = TokenLifetimeValidator,
            }
        );

        if (!result.IsValid)
        {
            _logger.LogWarning(
                "Workflow callback token validation failed: token is invalid for instance {InstanceGuid}. Reason: {Reason}",
                instanceGuid,
                result.Exception?.Message
            );
            return null;
        }

        bool jtiMatches =
            result.Claims.TryGetValue(JwtClaimTypes.JwtId, out object? jti)
            && jti?.ToString() == instanceGuid.ToString();

        if (!jtiMatches)
        {
            _logger.LogWarning(
                "Workflow callback token validation failed: jti claim {Jti} does not match instanceGuid {InstanceGuid}.",
                jti,
                instanceGuid
            );
            return null;
        }

        var validatedJwt = (JsonWebToken)result.SecurityToken;
        if (
            !validatedJwt.TryGetPayloadValue(WorkflowCallbackTokenBinding.CommandsClaim, out string[]? commandKeys)
            || commandKeys?.Contains(commandKey, StringComparer.Ordinal) is not true
        )
        {
            _logger.LogWarning(
                "Workflow callback token validation failed: command {CommandKey} is not authorized by the token for instance {InstanceGuid}.",
                commandKey,
                instanceGuid
            );
            return null;
        }

        if (
            !validatedJwt.TryGetPayloadValue(WorkflowCallbackTokenBinding.ActorClaim, out string? actorHash)
            || string.IsNullOrEmpty(actorHash)
        )
        {
            _logger.LogWarning(
                "Workflow callback token validation failed: token has no actor binding for instance {InstanceGuid}.",
                instanceGuid
            );
            return null;
        }

        return new ValidatedWorkflowCallbackToken(actorHash);
    }

    /// <summary>
    /// Validates the token lifetime against the injected <see cref="TimeProvider"/>, applying the same
    /// clock skew the default validator would. Tokens without an expiry are rejected.
    /// </summary>
    private bool TokenLifetimeValidator(
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
