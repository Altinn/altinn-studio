using Altinn.App.Core.Internal.Process.ProcessTasks;

namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Finds registered service tasks by exact task type. Uses the last matching registration.
/// </summary>
internal static class ServiceTaskLookupExtensions
{
    /// <summary>All registered service tasks, in registration order.</summary>
    public static IEnumerable<IServiceTask> GetServiceTasks(this AppImplementationFactory factory) =>
        factory.GetAll<IServiceTask>();

    /// <summary>
    /// Returns the last service task registered with the exact <paramref name="serviceTaskType"/>, or <c>null</c>.
    /// </summary>
    public static IServiceTask? FindServiceTask(this AppImplementationFactory factory, string serviceTaskType) =>
        factory.GetServiceTasks().ResolveByTaskType(serviceTaskType);

    /// <summary>
    /// Returns the last task whose <c>Type</c> exactly matches <paramref name="altinnTaskType"/>, or <c>null</c>.
    /// An app can replace a built-in task by registering its implementation after the built-in task.
    /// </summary>
    public static T? ResolveByTaskType<T>(this IEnumerable<T> tasks, string altinnTaskType)
        where T : class, IProcessTask => tasks.LastOrDefault(task => task.Type == altinnTaskType);

    /// <summary>
    /// The pipeline the task composes, on a fresh builder. Throws when it composes no step, which app startup
    /// reports for the task.
    /// </summary>
    public static ServiceTaskPipeline ResolvePipeline(this IServiceTask task)
    {
        var builder = new PipelineBuilder.ServiceTask();
        task.DefineExecute(builder);
        ServiceTaskPipeline pipeline = builder.ToPipeline();

        if (pipeline.Items.Count == 0)
        {
            throw new InvalidOperationException(
                $"{task.GetType().Name}.{nameof(IServiceTask.DefineExecute)} composes no step, so the "
                    + $"'{task.Type}' service task would have nothing to run. Compose at least one "
                    + $"{nameof(PipelineBuilder.ServiceTask.Stage)} or {nameof(PipelineBuilder.ServiceTask.ExternalStage)} "
                    + "on the builder it is handed."
            );
        }

        return pipeline;
    }
}
