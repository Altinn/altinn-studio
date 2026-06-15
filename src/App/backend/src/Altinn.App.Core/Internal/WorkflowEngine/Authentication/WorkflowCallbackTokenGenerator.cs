using System.Text;
using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.App.Core.Internal.WorkflowEngine.Authentication;

/// <summary>
/// Generates the JWT carried through the workflow engine and replayed on every callback.
/// </summary>
internal interface IWorkflowCallbackTokenGenerator
{
    /// <summary>
    /// Generates a signed JWT bound to <paramref name="instanceGuid"/>. The token is signed with the
    /// newest available <c>WorkflowEngineCallback</c> code and expires when that code expires.
    /// </summary>
    string GenerateToken(Guid instanceGuid);
}

/// <inheritdoc />
internal sealed class WorkflowCallbackTokenGenerator(
    IWorkflowCallbackSecretProvider secretProvider,
    TimeProvider? timeProvider = null
) : IWorkflowCallbackTokenGenerator
{
    private readonly TimeProvider _timeProvider = timeProvider ?? TimeProvider.System;

    /// <inheritdoc />
    public string GenerateToken(Guid instanceGuid)
    {
        AppCode appCode = secretProvider.GetSigningSecret();

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(appCode.Code));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Claims = new Dictionary<string, object>
            {
                [JwtRegisteredClaimNames.Jti] = instanceGuid.ToString(),
                ["secret_id"] = appCode.Id,
            },
            // Bind the token lifetime to the signing code: the engine replays the same token on every
            // callback, so it must remain valid for as long as the code that signed it is accepted.
            IssuedAt = _timeProvider.GetUtcNow().UtcDateTime,
            Expires = appCode.ExpiresAt.UtcDateTime,
            SigningCredentials = credentials,
        };

        var handler = new JsonWebTokenHandler();
        return handler.CreateToken(tokenDescriptor);
    }
}
