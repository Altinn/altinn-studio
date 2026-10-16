namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Work that follows a process transition without holding it up. A side effect is composed as a pipeline the way
/// a service task is: stages that send, and a conclusion that waits for the outcome, by polling with
/// <see cref="ServiceTaskResult.Defer"/> or by listening on a mailbox. It runs in workflows of its own once the
/// transition that started it is saved, so the process moves on while it waits, and a failure fails the side
/// effect alone.
/// </summary>
/// <remarks>
/// <para>
/// Start a side effect from a hook, a process task or a service task with
/// <c>context.SideEffects.Start&lt;TSideEffect&gt;(input)</c>. Register it with
/// <c>services.AddTransient&lt;ISideEffect, MySideEffect&gt;()</c>.
/// </para>
/// <para>
/// A side effect uses the same builder, stage results, mailboxes, values and step options as a service task,
/// with two differences:
/// </para>
/// <list type="bullet">
/// <item>
/// It cannot change instance data. It runs on the state the transition saved while the process moves on, so a
/// save would race the process. Hand values to later stages with <see cref="ServiceTaskContext.Values"/>.
/// </item>
/// <item>
/// Its conclusion ends the side effect and nothing else, so <see cref="ServiceTaskResult.Success"/> cannot name a
/// process action.
/// </item>
/// </list>
/// <para>
/// Read the input the side effect was started with through <see cref="ServiceTaskContext.GetInput{T}"/>.
/// Authoring guidance: <c>docs/service-task-pipelines.md</c> in the app-lib repository.
/// </para>
/// </remarks>
[ImplementableByApps]
public interface ISideEffect
{
    /// <summary>
    /// The side effect's name: the identity its workflows find it by, and what operators see. Keep it stable —
    /// a side effect still running when the app is redeployed is looked up by this name. Registering another side
    /// effect with the same name replaces it, as for service tasks.
    /// </summary>
    string Name { get; }

    /// <summary>
    /// Composes the pipeline. Like <see cref="IPipelineServiceTask.Define"/>, it runs when the side effect is
    /// enqueued, on every callback and at startup, so it must be cheap, deterministic and free of side effects.
    /// </summary>
    ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline);
}
