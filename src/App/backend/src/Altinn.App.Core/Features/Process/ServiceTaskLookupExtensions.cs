namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Lookup helpers for registered service tasks and their steps, so the matching rules — task type
/// is case-insensitive (BPMN attribute semantics), step names are exact (they are our own wire
/// values) — live in one place.
/// </summary>
internal static class ServiceTaskLookupExtensions
{
    /// <summary>
    /// The registered service task whose <c>Type</c> matches <paramref name="serviceTaskType"/>
    /// (ignoring case, matching the BPMN attribute semantics), or <c>null</c>.
    /// </summary>
    public static IServiceTask? FindServiceTask(this AppImplementationFactory factory, string serviceTaskType) =>
        factory
            .GetAll<IServiceTask>()
            .FirstOrDefault(t => t.Type.Equals(serviceTaskType, StringComparison.OrdinalIgnoreCase));

    /// <summary>
    /// The task's declared steps. Tolerates a null <see cref="IServiceTask.Steps"/>: the interface
    /// default is an empty sequence, but mocks and hand-rolled test doubles routinely bypass
    /// default interface members and return null.
    /// </summary>
    public static IEnumerable<IServiceTaskStep> GetSteps(this IServiceTask task) => task.Steps ?? [];

    /// <summary>
    /// The task's step with the given name (exact match — step names are our own wire values),
    /// or <c>null</c>.
    /// </summary>
    public static IServiceTaskStep? FindStep(this IServiceTask task, string stepName) =>
        task.GetSteps().FirstOrDefault(s => string.Equals(s.Name, stepName, StringComparison.Ordinal));
}
