using Altinn.App.Core.Internal.Process.ProcessTasks;

namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Lookup helpers for registered service tasks, so each matching rule lives in one place.
/// </summary>
/// <remarks>
/// There are two rules, and they disagree.
/// <see cref="FindServiceTask(AppImplementationFactory, string)"/> matches case-insensitively and takes
/// the first registration; <see cref="ResolveByTaskType{T}"/> matches exactly and takes the last, which
/// is what <c>ProcessTaskResolver</c> uses to pick the implementation a transition actually runs. A task
/// type differing only in case therefore enqueues as a service task and then fails to dispatch. That
/// divergence is a known pre-existing bug; until it is fixed, anything predicting what will run at
/// runtime must use <see cref="ResolveByTaskType{T}"/>.
/// </remarks>
internal static class ServiceTaskLookupExtensions
{
    /// <summary>
    /// All registered service tasks. Queries both interfaces: DI registrations are per service type, so each
    /// task appears under exactly one of the two.
    /// </summary>
    public static IEnumerable<IPipelineServiceTask> GetServiceTasks(this AppImplementationFactory factory)
    {
        foreach (IServiceTask task in factory.GetAll<IServiceTask>())
        {
            yield return task;
        }

        foreach (IPipelineServiceTask task in factory.GetAll<IPipelineServiceTask>())
        {
            yield return task;
        }
    }

    /// <summary>
    /// The registered service task whose <c>Type</c> matches <paramref name="serviceTaskType"/>
    /// (ignoring case, matching the BPMN attribute semantics), or <c>null</c>.
    /// </summary>
    public static IPipelineServiceTask? FindServiceTask(
        this AppImplementationFactory factory,
        string serviceTaskType
    ) =>
        factory
            .GetServiceTasks()
            .FirstOrDefault(t => t.Type.Equals(serviceTaskType, StringComparison.OrdinalIgnoreCase));

    /// <summary>
    /// The task in <paramref name="tasks"/> that <paramref name="altinnTaskType"/> resolves to, or
    /// <c>null</c>. This is the rule the runtime dispatches by: an exact (ordinal) match on
    /// <c>Type</c>, last registration winning, so an app's own implementation shadows a built-in it
    /// was registered after.
    /// </summary>
    /// <remarks>
    /// Takes the candidates as an argument rather than reaching for
    /// <see cref="AppImplementationFactory"/>, so a caller that already holds a resolved set — a
    /// startup validator running in its own scope, above all — asks the question once against the
    /// implementations it can actually construct.
    /// </remarks>
    public static T? ResolveByTaskType<T>(this IEnumerable<T> tasks, string altinnTaskType)
        where T : class, IProcessTask => tasks.LastOrDefault(task => task.Type == altinnTaskType);

    /// <summary>
    /// The task's composed pipeline — for an <see cref="IServiceTask"/>, the forwarding default
    /// (<c>Finally(Execute)</c>). Throws when <c>Define</c> returns null, which no honest
    /// implementation does (the builder is the only source of a pipeline) but mocks that bypass
    /// the interface default do.
    /// </summary>
    public static ServiceTaskPipeline ResolvePipeline(this IPipelineServiceTask task)
    {
        // Fresh per call, so the mailbox handle it issues cannot be answered from another task's Define.
        var builder = new ServiceTaskPipelineBuilder();

        ServiceTaskPipeline pipeline =
            task.Define(builder)
            ?? throw new InvalidOperationException(
                $"{task.GetType().Name}.{nameof(IPipelineServiceTask.Define)} returned null — a service task must "
                    + "return the pipeline composed from the supplied builder."
            );

        return pipeline;
    }
}
