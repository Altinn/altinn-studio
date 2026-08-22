namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Lookup helpers for registered service tasks, so the matching rules — task type is
/// case-insensitive (BPMN attribute semantics), stage names are exact (they are our own wire
/// values) — live in one place.
/// </summary>
internal static class ServiceTaskLookupExtensions
{
    /// <summary>
    /// All registered service tasks. Queries both interfaces: DI registrations are per service
    /// type, so a task registered as <see cref="IServiceTask"/> is not returned for
    /// <c>GetAll&lt;IPipelineServiceTask&gt;()</c> even though the interface derives from it —
    /// and the inverse registration does not compile for a plain task, so each task appears
    /// under exactly one of the two.
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
    /// The task's composed pipeline — for an <see cref="IServiceTask"/>, the forwarding default
    /// (<c>Finally(Execute)</c>). Throws when <c>Define</c> returns null, which no honest
    /// implementation does (the builder is the only source of a pipeline) but mocks that bypass
    /// the interface default do — and when it composed a mailbox and then returned the pipeline
    /// from before that declaration.
    /// </summary>
    public static ServiceTaskPipeline ResolvePipeline(this IPipelineServiceTask task)
    {
        // Fresh per call, so anything it records is scoped to this one Define invocation.
        var builder = new ServiceTaskPipelineBuilder();

        ServiceTaskPipeline pipeline =
            task.Define(builder)
            ?? throw new InvalidOperationException(
                $"{task.GetType().Name}.{nameof(IPipelineServiceTask.Define)} returned null — a service task must "
                    + "return the pipeline composed from the supplied builder."
            );

        // WithReplyFrom returns the declared pipeline rather than mutating the one it was called on, so a Define
        // that ignores its return value composes a mailbox and then hands back the pipeline from before it. The
        // declaration marks the builder it came from — the one handed in here — so a builder that saw a
        // declaration while the returned pipeline carries none means the result was discarded and the mailbox
        // would never open.
        if (builder.MailboxDeclared && pipeline.Mailbox is null)
        {
            throw new InvalidOperationException(
                $"{task.GetType().Name}.{nameof(IPipelineServiceTask.Define)} called "
                    + $"{nameof(ServiceTaskPipeline.WithReplyFrom)} but returned the pipeline from before it, so the "
                    + $"mailbox would never be opened. Return what {nameof(ServiceTaskPipeline.WithReplyFrom)} gives "
                    + "you: 'return pipeline.Stage(…).Finally(…).WithReplyFrom(…);'."
            );
        }

        return pipeline;
    }
}
