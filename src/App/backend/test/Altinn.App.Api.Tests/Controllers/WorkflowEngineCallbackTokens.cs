using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Api.Tests.Controllers;

internal static class WorkflowEngineCallbackTokens
{
    /// <summary>
    /// The actor the callback tests post, and so the one their tokens bind by default.
    /// </summary>
    public static readonly Actor DefaultActor = new() { Language = "nb" };

    /// <summary>
    /// Mints a callback token with the app's real generator, bound to <paramref name="instanceGuid"/>, to
    /// <paramref name="actor"/> (or <see cref="DefaultActor"/>), and to a workflow whose steps call
    /// <paramref name="commandKeys"/>.
    /// </summary>
    public static string GenerateCallbackToken(
        this IServiceProvider services,
        Guid instanceGuid,
        Actor? actor = null,
        params string[] commandKeys
    ) =>
        services
            .GetRequiredService<IWorkflowCallbackTokenGenerator>()
            .GenerateToken(instanceGuid, actor ?? DefaultActor, [Workflow(commandKeys)]);

    /// <summary>
    /// A workflow whose steps are app commands with <paramref name="commandKeys"/>, shaped as the app enqueues them.
    /// </summary>
    public static WorkflowRequest Workflow(params string[] commandKeys) =>
        new()
        {
            OperationId = "test",
            Steps =
            [
                .. commandKeys.Select(key => new StepRequest
                {
                    OperationId = key,
                    Command = CommandDefinition.Create("app", new AppCommandData { CommandKey = key }),
                }),
            ],
        };
}
