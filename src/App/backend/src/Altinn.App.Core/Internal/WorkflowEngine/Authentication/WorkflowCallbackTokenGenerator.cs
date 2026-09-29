using System.Text;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.App.Core.Internal.WorkflowEngine.Authentication;

/// <summary>
/// Generates the JWT carried through the workflow engine and replayed on every callback.
/// </summary>
internal interface IWorkflowCallbackTokenGenerator
{
    /// <summary>
    /// Generates a signed JWT bound to <paramref name="instanceGuid"/>, to <paramref name="actor"/>, and to
    /// the app commands in <paramref name="workflows"/>: the callbacks the enqueue it rides on can make.
    /// The token is signed with the newest available <c>WorkflowEngineCallback</c> code and expires when
    /// that code expires.
    /// </summary>
    string GenerateToken(Guid instanceGuid, Actor actor, IEnumerable<WorkflowRequest> workflows);
}

/// <inheritdoc />
internal sealed class WorkflowCallbackTokenGenerator : IWorkflowCallbackTokenGenerator
{
    private readonly TimeProvider _timeProvider;
    private readonly IWorkflowCallbackSecretProvider _secretProvider;

    public WorkflowCallbackTokenGenerator(
        IWorkflowCallbackSecretProvider secretProvider,
        TimeProvider? timeProvider = null
    )
    {
        _timeProvider = timeProvider ?? TimeProvider.System;
        _secretProvider = secretProvider;
    }

    /// <inheritdoc />
    public string GenerateToken(Guid instanceGuid, Actor actor, IEnumerable<WorkflowRequest> workflows)
    {
        AppCode appCode = _secretProvider.GetSigningSecret();

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(appCode.Code));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Claims = new Dictionary<string, object>
            {
                [JwtClaimTypes.JwtId] = instanceGuid.ToString(),
                [JwtClaimTypes.AppCode.SecretId] = appCode.Id,
                [WorkflowCallbackTokenBinding.ActorClaim] = WorkflowCallbackTokenBinding.ActorHash(actor),
                [WorkflowCallbackTokenBinding.CommandsClaim] = WorkflowCallbackTokenBinding.CommandKeys(workflows),
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
