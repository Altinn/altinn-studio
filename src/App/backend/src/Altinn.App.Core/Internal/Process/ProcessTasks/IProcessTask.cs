using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;

namespace Altinn.App.Core.Internal.Process.ProcessTasks;

/// <summary>
/// Implement this interface to create a new type of task for the process engine.
/// </summary>
/// <remarks>
/// The work a task does as it starts, ends or is abandoned is composed as stages, each saved and retried on its
/// own, the way a service task composes its pipeline. A stage reads and changes instance data through
/// <see cref="StageContext.InstanceDataMutator"/>; what it changes is saved when the stage completes.
/// </remarks>
[ImplementableByApps]
public interface IProcessTask
{
    /// <summary>
    /// The type is used to identify the correct task implementation for a given task type in the process config file.
    /// </summary>
    string Type { get; }

    /// <summary>
    /// Validates a BPMN task at app startup. Returns each configuration error, or an empty sequence if valid.
    /// Must not read or change instance data.
    /// </summary>
    /// <remarks>
    /// Added in v9. The default implementation accepts all configuration, so existing tasks need no override.
    /// Runs synchronously in a dependency injection scope. Must not cause side effects.
    /// </remarks>
    IEnumerable<string> ValidateConfiguration(ProcessTaskValidationContext context) => [];

    /// <summary>
    /// Composes the work to do when the task starts as stages, each saved and retried on its own, the way a service
    /// task composes its pipeline. The stages run inside the transition into the task, before it commits. The default
    /// composes no stages, so a task with nothing to do when it starts plans no step. Split the work into stages when
    /// it makes several calls that should not all be repeated when one fails.
    /// </summary>
    /// <remarks>
    /// Added in v9. The pipeline is composed again for every step and must not depend on the instance or on
    /// configuration that can change while a transition is in flight, since a step is dispatched by the position of
    /// its stage. For the same reason a deploy that changes the number or order of the stages reshapes the pipeline
    /// under transitions already in flight: each of their steps runs the stage now at its index and no other, so a
    /// stage added before the ones a transition has left to run changes what those steps do. Deploy such a change
    /// when no transition can be in flight, as for a service task pipeline.
    /// </remarks>
    ProcessTaskPipeline DefineStart(PipelineBuilder pipeline) => pipeline.Build();

    /// <summary>
    /// Composes the work to do when the task ends as stages. See <see cref="DefineStart"/>. The default composes no
    /// stages.
    /// </summary>
    ProcessTaskPipeline DefineEnd(PipelineBuilder pipeline) => pipeline.Build();

    /// <summary>
    /// Composes the work to do when the task is abandoned as stages. See <see cref="DefineStart"/>. The default
    /// composes no stages.
    /// </summary>
    ProcessTaskPipeline DefineAbandon(PipelineBuilder pipeline) => pipeline.Build();
}
