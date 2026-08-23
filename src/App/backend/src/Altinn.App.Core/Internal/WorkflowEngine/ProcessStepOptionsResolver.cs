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
/// walking the resolution chain: a per-implementation override declared by the app handler (tier 3) wins
/// over the command's own default (tier 2); when both leave a field unset the engine's global default
/// (tier 1) applies, so that field is left off the wire request entirely.
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
    /// <param name="serviceTaskType">The service task type, used to select the matching service task (tier 3).</param>
    /// <param name="serviceTaskStageName">
    /// For a service-task pipeline stage: the stage's name. Null for the pipeline's conclusion.
    /// Either way tier 3 is that one step's own options over the task's, field-wise — a stage's from
    /// the builder's <c>Stage</c>, the conclusion's from whichever terminal ended the chain
    /// (<c>Finally</c>, <c>ConcludeOnReply</c> or <c>ConcludeOnReplies</c>).
    /// </param>
    public ProcessStepOptions? Resolve(
        string commandKey,
        string? taskId,
        string? serviceTaskType,
        string? serviceTaskStageName = null
    )
    {
        ProcessStepOptions? commandDefault = _commandDefaults.GetValueOrDefault(commandKey);
        ProcessStepOptions? implementationOverride = ResolveImplementationStepOptions(
            commandKey,
            taskId,
            serviceTaskType,
            serviceTaskStageName
        );

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
    /// Resolves the app-provided handler backing a command and returns its per-implementation step
    /// options (tier 3), or null when the command has no app-facing handler or none matches. Mirrors the
    /// handler selection each command performs at execute time so build-time and run-time agree.
    /// </summary>
    private ProcessStepOptions? ResolveImplementationStepOptions(
        string commandKey,
        string? taskId,
        string? serviceTaskType,
        string? serviceTaskStageName
    )
    {
        if (commandKey == ExecuteServiceTask.Key && serviceTaskType is not null)
        {
            IPipelineServiceTask? serviceTask = _appImplementationFactory.FindServiceTask(serviceTaskType);
            if (serviceTask is null)
            {
                return null;
            }

            // Options declared for one step — a stage by name, or the conclusion — win field-wise
            // over the task's own, mirroring how the merged result then wins over the command
            // default in Resolve. A null stage name is the conclusion by construction.
            ServiceTaskPipeline pipeline = serviceTask.ResolvePipeline();
            ProcessStepOptions? stepOptions = serviceTaskStageName is not null
                ? pipeline.FindStage(serviceTaskStageName)?.StepOptions
                : pipeline.Conclusion.StepOptions;
            ProcessStepOptions? taskOptions = serviceTask.StepOptions;
            if (stepOptions is null && taskOptions is null)
            {
                return null;
            }

            // Every field is listed deliberately: the merge is the only thing standing between a new
            // ProcessStepOptions field and being silently dropped for service tasks.
            return new ProcessStepOptions
            {
                MaxExecutionTime = stepOptions?.MaxExecutionTime ?? taskOptions?.MaxExecutionTime,
                RetryStrategy = stepOptions?.RetryStrategy ?? taskOptions?.RetryStrategy,
                WaitBudget = stepOptions?.WaitBudget ?? taskOptions?.WaitBudget,
            };
        }

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
                .GetAll<IOnTaskAbandonHandler>()
                .FirstOrDefault(x => x.ShouldRunForTask(taskId))
                ?.StepOptions;
        }

        if (commandKey == OnProcessEndingHook.Key)
        {
            return _appImplementationFactory.GetAll<IOnProcessEndingHandler>().FirstOrDefault()?.StepOptions;
        }

        return null;
    }
}
