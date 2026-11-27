using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

internal static class CommittedVerdict
{
    /// <summary>
    /// What the callback goes on with when Storage commits this run's own verdict: the result derived from the
    /// verdict as it reads back from the stored format. Any other result passes through.
    /// </summary>
    public static WorkflowEngineCommandResult AfterCommit(this WorkflowEngineCommandResult result) =>
        result is DecidedWorkflowEngineCommandResult decided
            ? decided.Derive(
                ServiceTaskVerdictFormat.Read(ServiceTaskVerdictFormat.Write(decided.Verdict))
                    ?? throw new InvalidOperationException("The stored format does not read back what it wrote.")
            )
            : result;
}
