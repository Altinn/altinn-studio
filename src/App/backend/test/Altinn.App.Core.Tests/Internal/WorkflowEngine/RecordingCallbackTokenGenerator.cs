using System.Text.Json;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

/// <summary>
/// Mints a distinct token per call and remembers what each was minted for, so a test can check that the token
/// an enqueue carries was minted for that enqueue's own workflows and actor.
/// </summary>
internal sealed class RecordingCallbackTokenGenerator : IWorkflowCallbackTokenGenerator
{
    public List<(
        string Token,
        Guid InstanceGuid,
        Actor Actor,
        IReadOnlyList<WorkflowRequest> Workflows
    )> Mints { get; } = [];

    public string GenerateToken(Guid instanceGuid, Actor actor, IEnumerable<WorkflowRequest> workflows)
    {
        string token = $"callback-token-{Mints.Count}";
        Mints.Add((token, instanceGuid, actor, [.. workflows]));
        return token;
    }

    /// <summary>
    /// Asserts that <paramref name="request"/>'s context carries a token minted for exactly its workflows and
    /// for the actor and instance the context names.
    /// </summary>
    public void AssertMintedFor(WorkflowEnqueueRequest request)
    {
        AppWorkflowContext? context = request.Context?.Deserialize<AppWorkflowContext>();
        Assert.NotNull(context);
        var mint = Assert.Single(Mints, m => m.Token == context.CallbackToken);
        Assert.Equal(context.InstanceGuid, mint.InstanceGuid);
        Assert.Equal(context.Actor, mint.Actor);
        Assert.Equal(request.Workflows, mint.Workflows);
    }
}
