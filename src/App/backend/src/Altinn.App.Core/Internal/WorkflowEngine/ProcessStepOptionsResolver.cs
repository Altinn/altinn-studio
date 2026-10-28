using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.ProcessEnd;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskAbandon;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskEnd;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// Resolves the effective per-step execution options (timeout + retry strategy) for a workflow step by
/// walking the resolution chain: the options declared for the step — by the hook handler that backs it, or by
/// the pipeline item it runs (tier 3) — win over the command's own default (tier 2); when both leave a field
/// unset the engine's global default (tier 1) applies, so that field is left off the wire request entirely.
/// </summary>
/// <remarks>
/// The tier-2 command defaults are static per command type and built once. The tier-3 lookup goes through
/// <see cref="AppImplementationFactory"/> on every call — never a cached instance — so it resolves the
/// same handler (in the same request scope) that the command will resolve at execute time. That keeps
/// build-time and run-time selection in agreement even when handlers are registered as scoped/transient.
/// </remarks>
internal sealed class ProcessStepOptionsResolver
{
    private readonly IReadOnlyDictionary<string, ProcessStepOptions?> _commandDefaults;
    private readonly AppImplementationFactory _appImplementationFactory;

    public ProcessStepOptionsResolver(
        IEnumerable<IWorkflowEngineCommand> commands,
        AppImplementationFactory appImplementationFactory
    )
    {
        _appImplementationFactory = appImplementationFactory;
        _commandDefaults = commands
            .GroupBy(c => c.GetKey(), StringComparer.Ordinal)
            .ToDictionary(g => g.Key, g => g.First().DefaultStepOptions, StringComparer.Ordinal);
    }

    /// <summary>
    /// Resolves the effective, validated options for the step, or <c>null</c> when no tier sets anything
    /// (so the caller leaves the wire fields unset and the engine applies its own global defaults).
    /// </summary>
    /// <param name="commandKey">The step's command key, used to select the tier-2 default and the tier-3 handler.</param>
    /// <param name="taskId">The task the step runs against, used to select the matching lifecycle hook (tier 3).</param>
    /// <param name="stageOptions">
    /// The options the step's pipeline item declared — a lifecycle stage, or a service task stage, reply handler
    /// or conclusion — put on the step by the planner; they are tier 3 for that step. Null on every other step,
    /// including the mailbox mint, which must not inherit the declaring stage's options.
    /// </param>
    public ProcessStepOptions? Resolve(string commandKey, string? taskId, ProcessStepOptions? stageOptions = null)
    {
        ProcessStepOptions? commandDefault = _commandDefaults.GetValueOrDefault(commandKey);
        ProcessStepOptions? implementationOverride = ResolveImplementationStepOptions(commandKey, taskId, stageOptions);

        TimeSpan? maxExecutionTime = implementationOverride?.MaxExecutionTime ?? commandDefault?.MaxExecutionTime;
        ProcessStepRetryStrategy? retryStrategy =
            implementationOverride?.RetryStrategy ?? commandDefault?.RetryStrategy;
        TimeSpan? waitBudget = implementationOverride?.WaitBudget ?? commandDefault?.WaitBudget;

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

    /// <summary>
    /// The step's tier-3 options: for a hook step, the options of the app-provided handler backing the command, or
    /// null when none matches, mirroring the handler selection the command performs at execute time so build-time
    /// and run-time agree; for every other step, the options its pipeline item declared.
    /// </summary>
    private ProcessStepOptions? ResolveImplementationStepOptions(
        string commandKey,
        string? taskId,
        ProcessStepOptions? stageOptions
    )
    {
        if (commandKey == OnTaskStartingHook.Key && taskId is not null)
        {
            return _appImplementationFactory
                .GetAll<IOnTaskStartingHandler>()
                .FirstOrDefault(x => x.ShouldRunForTask(taskId))
                ?.StepOptions;
        }

        if (commandKey == OnTaskEndingHook.Key && taskId is not null)
        {
            return _appImplementationFactory
                .GetAll<IOnTaskEndingHandler>()
                .FirstOrDefault(x => x.ShouldRunForTask(taskId))
                ?.StepOptions;
        }

        if (commandKey == OnTaskAbandonHook.Key && taskId is not null)
        {
            return _appImplementationFactory
                .GetAll<IOnTaskAbandoningHandler>()
                .FirstOrDefault(x => x.ShouldRunForTask(taskId))
                ?.StepOptions;
        }

        if (commandKey == OnProcessEndedHook.Key)
        {
            return _appImplementationFactory.GetAll<IOnProcessEndedHandler>().FirstOrDefault()?.StepOptions;
        }

        return stageOptions;
    }
}
