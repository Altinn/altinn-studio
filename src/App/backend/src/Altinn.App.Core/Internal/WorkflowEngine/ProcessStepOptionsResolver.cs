using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// Resolves the effective per-step execution options (timeout + retry strategy) for a workflow step by
/// walking the resolution chain: the options declared for the step — by the hook handler that backs it, or by
/// the pipeline item it runs (tier 3) — win over the command's own default (tier 2); when both leave a field
/// unset the engine's global default (tier 1) applies, so that field is left off the wire request entirely.
/// </summary>
/// <remarks>
/// The tier-2 command defaults are static per command type and built once. Tier 3 arrives on the step: the planner
/// puts the item's or the hook handler's options there when it composes the step, so this never looks a handler up.
/// </remarks>
internal sealed class ProcessStepOptionsResolver
{
    private readonly IReadOnlyDictionary<string, ProcessStepOptions?> _commandDefaults;

    public ProcessStepOptionsResolver(IEnumerable<IWorkflowEngineCommand> commands)
    {
        _commandDefaults = commands
            .GroupBy(c => c.GetKey(), StringComparer.Ordinal)
            .ToDictionary(g => g.Key, g => g.First().DefaultStepOptions, StringComparer.Ordinal);
    }

    /// <summary>
    /// Resolves the effective, validated options for the step, or <c>null</c> when no tier sets anything
    /// (so the caller leaves the wire fields unset and the engine applies its own global defaults).
    /// </summary>
    /// <param name="commandKey">The step's command key, used to select the tier-2 default.</param>
    /// <param name="declaredOptions">
    /// The options the planner put on the step, which are tier 3: those its pipeline item declared — a lifecycle
    /// stage, or a service task stage, reply handler or conclusion — or those of the hook handler it runs. Null on
    /// every other step, including the mailbox mint, which must not inherit the declaring stage's options.
    /// </param>
    public ProcessStepOptions? Resolve(string commandKey, ProcessStepOptions? declaredOptions = null)
    {
        ProcessStepOptions? commandDefault = _commandDefaults.GetValueOrDefault(commandKey);

        TimeSpan? maxExecutionTime = declaredOptions?.MaxExecutionTime ?? commandDefault?.MaxExecutionTime;
        ProcessStepRetryStrategy? retryStrategy = declaredOptions?.RetryStrategy ?? commandDefault?.RetryStrategy;
        TimeSpan? waitBudget = declaredOptions?.WaitBudget ?? commandDefault?.WaitBudget;

        if (maxExecutionTime is null && retryStrategy is null && waitBudget is null)
        {
            return null;
        }

        var resolved = new ProcessStepOptions
        {
            MaxExecutionTime = maxExecutionTime,
            RetryStrategy = retryStrategy,
            WaitBudget = waitBudget,
        };

        // Validate the merged result: a misconfigured handler fails fast here (at enqueue) rather than
        // producing a degenerate timeout/retry loop in the engine. Startup validation catches the common
        // constant case earlier; this covers merges and anything computed at request time.
        resolved.Validate();

        return resolved;
    }
}
