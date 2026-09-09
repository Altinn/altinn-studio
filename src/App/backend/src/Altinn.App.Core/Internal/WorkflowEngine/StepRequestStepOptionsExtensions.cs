using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// Maps per-step execution options (timeout + retry strategy) onto outgoing <see cref="StepRequest"/> wire
/// requests. Split into a resolving pass (<see cref="ApplyStepOptions(StepRequest, ProcessStepOptionsResolver, string?, string?)"/>,
/// which needs the <see cref="ProcessStepOptionsResolver"/>) and a pure mapping pass
/// (<see cref="WithStepOptions"/>, which needs nothing) so both read as a fluent transform at the call site.
/// </summary>
internal static class StepRequestStepOptionsExtensions
{
    /// <summary>
    /// Resolves and applies the effective step options for every step in the sequence. See
    /// <see cref="WithStepOptions"/> for the null/tier-1 semantics of an unresolved step.
    /// </summary>
    public static IEnumerable<StepRequest> ApplyStepOptions(
        this IEnumerable<StepRequest> steps,
        ProcessStepOptionsResolver resolver,
        string? taskId,
        string? serviceTaskType
    )
    {
        foreach (StepRequest step in steps)
            yield return step.ApplyStepOptions(resolver, taskId, serviceTaskType);
    }

    /// <summary>
    /// Resolves the effective step options for a single step (via <paramref name="resolver"/>) and maps
    /// them onto the wire request. Resolution keys off the step's <see cref="StepRequest.CommandKey"/>,
    /// falling back to its OperationId for a step assembled without one (where the two are the same
    /// string): an OperationId can be a display identity — a service-task stage or the mailbox mint carries
    /// its item index there — and keying off it would silently miss the command's own tier-2 default. A
    /// service-task step additionally resolves the options of the one pipeline item it runs by
    /// <see cref="StepRequest.ServiceTaskItemIndex"/>.
    /// </summary>
    public static StepRequest ApplyStepOptions(
        this StepRequest step,
        ProcessStepOptionsResolver resolver,
        string? taskId,
        string? serviceTaskType
    ) =>
        step.WithStepOptions(
            resolver.Resolve(step.CommandKey ?? step.OperationId, taskId, serviceTaskType, step.ServiceTaskItemIndex)
        );

    /// <summary>
    /// Maps already-resolved options onto the wire request. A null <paramref name="options"/> leaves the
    /// wire fields unset so the engine applies its own global defaults (tier 1). Pure — no resolution or DI.
    /// </summary>
    public static StepRequest WithStepOptions(this StepRequest step, ProcessStepOptions? options)
    {
        if (options is null)
            return step;

        return step with
        {
            Command =
                options.MaxExecutionTime is not null || options.WaitBudget is not null
                    ? step.Command with
                    {
                        MaxExecutionTime = options.MaxExecutionTime ?? step.Command.MaxExecutionTime,
                        WaitBudget = options.WaitBudget ?? step.Command.WaitBudget,
                    }
                    : step.Command,
            RetryStrategy = options.RetryStrategy?.ToRetryStrategy() ?? step.RetryStrategy,
        };
    }
}
