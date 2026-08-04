namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Resolution of registered service tasks across their kinds. Tasks register against the kind
/// interface they implement (<see cref="IServiceTask"/> or <see cref="IStagedServiceTask"/>), so
/// every consumer that means "any service task" must query both — through here, so the set of
/// kinds lives in one place.
/// </summary>
internal static class ServiceTaskLookupExtensions
{
    /// <summary>
    /// All registered service tasks, of every kind.
    /// </summary>
    public static IEnumerable<IServiceTaskBase> GetServiceTasks(this AppImplementationFactory factory)
    {
        foreach (IServiceTask task in factory.GetAll<IServiceTask>())
        {
            yield return task;
        }

        foreach (IStagedServiceTask task in factory.GetAll<IStagedServiceTask>())
        {
            yield return task;
        }
    }

    /// <summary>
    /// The registered service task whose <c>Type</c> matches <paramref name="serviceTaskType"/>
    /// (ignoring case, matching the BPMN attribute semantics), or <c>null</c>.
    /// </summary>
    public static IServiceTaskBase? FindServiceTask(this AppImplementationFactory factory, string serviceTaskType) =>
        factory
            .GetServiceTasks()
            .FirstOrDefault(t => t.Type.Equals(serviceTaskType, StringComparison.OrdinalIgnoreCase));

    /// <summary>
    /// The whole pipeline in execution order: the work steps followed by the final step.
    /// </summary>
    public static IEnumerable<IServiceTaskStepBase> GetPipelineSteps(this IStagedServiceTask task)
    {
        foreach (IServiceTaskStep step in task.Steps)
        {
            yield return step;
        }

        yield return task.FinalStep;
    }

    /// <summary>
    /// The pipeline step with the given name (exact match — step names are our own wire values),
    /// or <c>null</c>.
    /// </summary>
    public static IServiceTaskStepBase? FindPipelineStep(this IStagedServiceTask task, string stepName) =>
        task.GetPipelineSteps().FirstOrDefault(s => string.Equals(s.Name, stepName, StringComparison.Ordinal));
}
