using Altinn.App.Core.Internal.Process.ProcessTasks;

namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Finds registered service tasks and action pipeline tasks by exact task type. Uses the last matching registration.
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
    /// Returns the last task registered with the exact <paramref name="taskType"/> when it is an action pipeline task,
    /// or <c>null</c>.
    /// </summary>
    public static IActionPipelineTask? FindActionPipelineTask(this AppImplementationFactory factory, string taskType) =>
        factory.GetAll<IProcessTask>().ResolveByTaskType(taskType) as IActionPipelineTask;

    /// <summary>The pipeline <paramref name="pipelineId"/> names, or <c>null</c> when no registered task composes it.</summary>
    public static ServiceTaskPipeline? ResolvePipeline(this AppImplementationFactory factory, PipelineId pipelineId) =>
        pipelineId.Action is { } action
            ? factory.FindActionPipelineTask(pipelineId.TaskType) is { } task && task.StartAction == action
                ? task.ResolveActionPipeline()
                : null
            : factory.FindServiceTask(pipelineId.TaskType)?.ResolvePipeline();

    /// <summary>
    /// The task's composed pipeline. Throws when <c>DefineExecute</c> returns null, which no honest implementation
    /// does (the builder is the only source of a pipeline) but an unstubbed mock does.
    /// </summary>
    public static ServiceTaskPipeline ResolvePipeline(this IServiceTask task)
    {
        // Fresh per call, so the mailbox handle it issues cannot be answered from another task's DefineExecute.
        var builder = new PipelineBuilder();

        ServiceTaskPipeline pipeline =
            task.DefineExecute(builder)
            ?? throw new InvalidOperationException(
                $"{task.GetType().Name}.{nameof(IServiceTask.DefineExecute)} returned null — a service task must "
                    + "return the pipeline composed from the supplied builder."
            );

        return pipeline;
    }

    /// <summary>The task's composed action pipeline, checked as <see cref="ResolvePipeline(IServiceTask)"/> is.</summary>
    public static ServiceTaskPipeline ResolveActionPipeline(this IActionPipelineTask task) =>
        task.DefineActionPipeline(new PipelineBuilder())
        ?? throw new InvalidOperationException(
            $"{task.GetType().Name}.{nameof(IActionPipelineTask.DefineActionPipeline)} returned null — an action "
                + "pipeline task must return the pipeline composed from the supplied builder."
        );
}
