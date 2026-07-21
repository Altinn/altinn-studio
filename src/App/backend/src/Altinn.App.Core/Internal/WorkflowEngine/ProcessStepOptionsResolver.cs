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
        _commandDefaults = commands
            .GroupBy(c => c.GetKey(), StringComparer.Ordinal)
            .ToDictionary(g => g.Key, g => g.First().DefaultStepOptions, StringComparer.Ordinal);
        _appImplementationFactory = appImplementationFactory;
    }

    /// <summary>
    /// Resolves the effective, validated options for the step, or <c>null</c> when no tier sets anything
    /// (so the caller leaves the wire fields unset and the engine applies its own global defaults).
    /// </summary>
    /// <param name="operationId">The step's command key, used to select the tier-2 default and the tier-3 handler.</param>
    /// <param name="taskId">The task the step runs against, used to select the matching lifecycle hook (tier 3).</param>
    /// <param name="serviceTaskType">The service task type, used to select the matching service task (tier 3).</param>
    public ProcessStepOptions? Resolve(string operationId, string? taskId, string? serviceTaskType)
    {
        ProcessStepOptions? commandDefault = _commandDefaults.GetValueOrDefault(operationId);
        ProcessStepOptions? implementationOverride = ResolveImplementationStepOptions(
            operationId,
            taskId,
            serviceTaskType
        );

        TimeSpan? maxExecutionTime = implementationOverride?.MaxExecutionTime ?? commandDefault?.MaxExecutionTime;
        ProcessStepRetryStrategy? retryStrategy =
            implementationOverride?.RetryStrategy ?? commandDefault?.RetryStrategy;

        if (maxExecutionTime is null && retryStrategy is null)
        {
            return null;
        }

        var resolved = new ProcessStepOptions { MaxExecutionTime = maxExecutionTime, RetryStrategy = retryStrategy };

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
        string operationId,
        string? taskId,
        string? serviceTaskType
    )
    {
        if (operationId == ExecuteServiceTask.Key)
        {
            return serviceTaskType is null
                ? null
                : _appImplementationFactory
                    .GetAll<IServiceTask>()
                    .FirstOrDefault(t => t.Type.Equals(serviceTaskType, StringComparison.OrdinalIgnoreCase))
                    ?.StepOptions;
        }

        if (operationId == OnTaskStartingHook.Key)
            return ResolveHookStepOptions(
                _appImplementationFactory.GetAll<IOnTaskStartingHandler>(),
                taskId,
                static (h, t) => h.ShouldRunForTask(t)
            );

        if (operationId == OnTaskEndingHook.Key)
            return ResolveHookStepOptions(
                _appImplementationFactory.GetAll<IOnTaskEndingHandler>(),
                taskId,
                static (h, t) => h.ShouldRunForTask(t)
            );

        if (operationId == OnTaskAbandonHook.Key)
            return ResolveHookStepOptions(
                _appImplementationFactory.GetAll<IOnTaskAbandonHandler>(),
                taskId,
                static (h, t) => h.ShouldRunForTask(t)
            );

        if (operationId == OnProcessEndingHook.Key)
            return _appImplementationFactory.GetAll<IOnProcessEndingHandler>().FirstOrDefault()?.StepOptions;

        return null;
    }

    /// <summary>
    /// Returns the step options of the first task hook whose <paramref name="shouldRunForTask"/> matches,
    /// or null when no task is in scope or none matches — the same selection the hook command makes at
    /// execute time. The task hooks share no base interface, so the predicate supplies their common
    /// <c>ShouldRunForTask</c> member.
    /// </summary>
    private static ProcessStepOptions? ResolveHookStepOptions<THandler>(
        IEnumerable<THandler> handlers,
        string? taskId,
        Func<THandler, string, bool> shouldRunForTask
    )
        where THandler : IProcessStepConfigurable =>
        taskId is null ? null : handlers.FirstOrDefault(h => shouldRunForTask(h, taskId))?.StepOptions;
}
