using System.Security.Cryptography;
using System.Text.Json;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.App.Core.Internal.WorkflowEngine.Authentication;

/// <summary>
/// What a callback token binds beyond its instance: the actor the work was enqueued for, and the app
/// commands its workflows may call back for. Minting and checking share this one computation.
/// </summary>
internal static class WorkflowCallbackTokenBinding
{
    /// <summary>
    /// Claim holding <see cref="ActorHash"/> of the actor the token was minted for.
    /// </summary>
    public const string ActorClaim = "actor_sha256";

    /// <summary>
    /// Claim holding the command keys the token authorizes, as a JSON array.
    /// </summary>
    public const string CommandsClaim = "commands";

    private static readonly JsonSerializerOptions _commandDataOptions = new() { PropertyNameCaseInsensitive = true };

    /// <summary>
    /// A base64url SHA-256 over the actor's identity fields.
    /// </summary>
    /// <remarks>
    /// Covers a fixed field list rather than the whole record: the engine host keeps its own copy of
    /// <see cref="Actor"/> and echoes only the fields it knows, so a field added here alone must not change
    /// the hash. <see cref="Actor.Language"/> is left out because it only selects a display language.
    /// The fields are hashed as a JSON array, so every value is escaped and a null stays distinct from an
    /// empty string: no two actors share an encoding.
    /// </remarks>
    public static string ActorHash(Actor actor)
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
    public static IReadOnlyList<string> CommandKeys(IEnumerable<WorkflowRequest> workflows)
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
