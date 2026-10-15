using Altinn.App.Core.Internal.Process.ProcessTasks;

namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Finds registered service tasks by exact task type, and side effects by exact name. Uses the last matching
/// registration.
/// </summary>
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
    /// Returns the last service task registered with the exact <paramref name="serviceTaskType"/>, or <c>null</c>.
    /// </summary>
    public static IPipelineServiceTask? FindServiceTask(
        this AppImplementationFactory factory,
        string serviceTaskType
    ) => factory.GetServiceTasks().ResolveByTaskType(serviceTaskType);

    /// <summary>
    /// Returns the last task whose <c>Type</c> exactly matches <paramref name="altinnTaskType"/>, or <c>null</c>.
    /// An app can replace a built-in task by registering its implementation after the built-in task.
    /// </summary>
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

    /// <summary>
    /// Returns the last side effect registered with the exact <paramref name="name"/>, or <c>null</c>.
    /// </summary>
    public static ISideEffectPipeline? FindSideEffect(this IEnumerable<ISideEffectPipeline> sideEffects, string name) =>
        sideEffects.LastOrDefault(sideEffect => sideEffect.Name == name);

    /// <summary>
    /// The side effect's composed pipeline. Throws when <c>Define</c> returns null, like
    /// <see cref="ResolvePipeline(IPipelineServiceTask)"/>.
    /// </summary>
    public static ServiceTaskPipeline ResolvePipeline(this ISideEffectPipeline sideEffect)
    {
        var builder = new ServiceTaskPipelineBuilder();

        return sideEffect.Define(builder)
            ?? throw new InvalidOperationException(
                $"{sideEffect.GetType().Name}.{nameof(ISideEffectPipeline.Define)} returned null — a side effect must "
                    + "return the pipeline composed from the supplied builder."
            );
    }
}
