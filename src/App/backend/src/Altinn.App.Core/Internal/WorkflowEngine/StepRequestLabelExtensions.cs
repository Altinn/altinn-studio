using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// Stamps the BPMN element label (<see cref="ProcessNextRequestFactory.ProcessNextElementLabel"/>) onto
/// outgoing <see cref="StepRequest"/> wire requests. Kept apart from
/// <see cref="StepRequestStepOptionsExtensions"/> because the two answer different questions about a step —
/// how long it may run versus which element it runs for — and only the options pass needs the resolver.
/// </summary>
internal static class StepRequestLabelExtensions
{
    /// <summary>
    /// Labels every step in the sequence with the element its commands run for. See
    /// <see cref="WithProcessElement(StepRequest, string?)"/> for the null semantics.
    /// </summary>
    public static IEnumerable<StepRequest> WithProcessElement(this IEnumerable<StepRequest> steps, string? elementId)
    {
        foreach (StepRequest step in steps)
            yield return step.WithProcessElement(elementId);
    }

    /// <summary>
    /// Labels a single step with the element its command runs for. A null or empty
    /// <paramref name="elementId"/> leaves the step untouched rather than writing an empty label: a
    /// consumer must be able to tell "this step names no element" from "this step names the element with
    /// the empty id", and only the first of those is a thing that happens.
    /// </summary>
    public static StepRequest WithProcessElement(this StepRequest step, string? elementId)
    {
        if (string.IsNullOrEmpty(elementId))
            return step;

        Dictionary<string, string> labels = step.Labels is null
            ? new Dictionary<string, string>(StringComparer.Ordinal)
            : new Dictionary<string, string>(step.Labels, StringComparer.Ordinal);

        labels[ProcessNextRequestFactory.ProcessNextElementLabel] = elementId;

        return step with
        {
            Labels = labels,
        };
    }
}
