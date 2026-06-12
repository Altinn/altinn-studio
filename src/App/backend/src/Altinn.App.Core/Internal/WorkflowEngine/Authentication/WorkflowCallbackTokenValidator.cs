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
    ILogger<WorkflowCallbackTokenValidator> logger
) : IWorkflowCallbackTokenValidator
{
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
                ClockSkew = TimeSpan.FromMinutes(5),
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
}
