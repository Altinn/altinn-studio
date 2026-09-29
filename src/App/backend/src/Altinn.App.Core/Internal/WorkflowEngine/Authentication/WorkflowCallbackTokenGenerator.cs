using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
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
    private static readonly JsonSerializerOptions _commandDataOptions = new() { PropertyNameCaseInsensitive = true };

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
                [JwtClaimTypes.WorkflowCallback.ActorHash] = ActorHash(actor),
                [JwtClaimTypes.WorkflowCallback.Commands] = CommandKeys(workflows),
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

    /// <summary>
    /// A base64url SHA-256 over the actor's identity fields: the value of the actor claim, which the callback
    /// controller recomputes from the actor a callback claims.
    /// </summary>
    /// <remarks>
    /// Covers a fixed field list rather than the whole record: the engine host keeps its own copy of
    /// <see cref="Actor"/> and echoes only the fields it knows, so a field added here alone must not change
    /// the hash. <see cref="Actor.Language"/> is left out because it only selects a display language.
    /// The fields are hashed as a JSON array, so every value is escaped and a null stays distinct from an
    /// empty string: no two actors share an encoding.
    /// </remarks>
    internal static string ActorHash(Actor actor)
    {
        byte[] canonical = JsonSerializer.SerializeToUtf8Bytes<object?[]>([
            actor.UserId,
            actor.OrgId,
            actor.AuthenticationLevel,
            actor.NationalIdentityNumber,
            actor.SystemUserId,
            actor.SystemUserOwnerOrgNo,
            actor.SystemUserName,
        ]);
        return Base64UrlEncoder.Encode(SHA256.HashData(canonical));
    }

    /// <summary>
    /// The distinct app command keys across every step of <paramref name="workflows"/>, read from the
    /// command data the engine routes each callback on.
    /// </summary>
    private static IReadOnlyList<string> CommandKeys(IEnumerable<WorkflowRequest> workflows)
    {
        var keys = new SortedSet<string>(StringComparer.Ordinal);
        foreach (WorkflowRequest workflow in workflows)
        {
            foreach (StepRequest step in workflow.Steps)
            {
                if (step.Command is not { Type: "app", Data: { } data })
                    continue;

                AppCommandData? commandData = data.Deserialize<AppCommandData>(_commandDataOptions);
                if (commandData is not null)
                    keys.Add(commandData.CommandKey);
            }
        }
        return [.. keys];
    }
}
