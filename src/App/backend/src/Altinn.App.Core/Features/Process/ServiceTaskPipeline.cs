namespace Altinn.App.Core.Features.Process;

/// <summary>
/// A service task's composed pipeline: the ordered durable stages, the concluding step, and — when
/// one is declared — the mailbox a stage opens to be answered on. Built via
/// <see cref="ServiceTaskPipelineBuilder"/> and returned from
/// <see cref="IPipelineServiceTask.Define"/>; the runtime reads it to expand, dispatch and
/// validate the task — apps only compose and return it.
/// </summary>
public sealed class ServiceTaskPipeline
{
    private readonly ServiceTaskPipelineBuilder _origin;

    internal ServiceTaskPipeline(
        IReadOnlyList<ServiceTaskStage> stages,
        Func<ServiceTaskContext, Task<ServiceTaskResult>> final,
        ProcessStepOptions? finalStepOptions,
        ServiceTaskMailboxDeclaration? mailbox,
        ServiceTaskPipelineBuilder origin
    )
    {
        Stages = stages;
        Final = final;
        FinalStepOptions = finalStepOptions;
        Mailbox = mailbox;
        _origin = origin;
    }

    /// <summary>The durable stages, in execution order. Empty for a simple service task.</summary>
    internal IReadOnlyList<ServiceTaskStage> Stages { get; }

    /// <summary>The concluding step — for an <see cref="IServiceTask"/>, its <c>Execute</c>.</summary>
    internal Func<ServiceTaskContext, Task<ServiceTaskResult>> Final { get; }

    /// <summary>
    /// Options declared for the concluding step alone, winning field-wise over the task's own — the
    /// same precedence a stage's options have. Null for a simple <see cref="IServiceTask"/>, whose
    /// conclusion is configured by the task-level options and nothing else.
    /// </summary>
    internal ProcessStepOptions? FinalStepOptions { get; }

    /// <summary>
    /// The mailbox declared by <see cref="WithReplyFrom"/>, or <c>null</c> for a pipeline that opens none.
    /// </summary>
    internal ServiceTaskMailboxDeclaration? Mailbox { get; }

    /// <summary>
    /// Declares that the named stage opens a <strong>mailbox</strong>: a durable inbox the outside world answers
    /// into. The stage reads it from <see cref="ServiceTaskContext.Mailbox"/> and publishes
    /// <see cref="ServiceTaskMailbox.Id"/> in its outbound message as the reply address, and every message that
    /// comes back on that address is handed to the pipeline's conclusion, one message per execution.
    /// </summary>
    /// <remarks>
    /// The mailbox is minted when the named stage runs — keyed on that stage's own step id, so a retry is handed
    /// the same mailbox and an address already published stays valid — and it accepts messages until
    /// <see cref="MailboxOptions.Timeout"/> runs out. <see cref="ServiceTaskContext.Mailbox"/> is available in the
    /// named stage and nowhere else, and a pipeline declares at most one mailbox.
    /// <para>
    /// <strong>Use the value this returns.</strong> The declaration is not recorded on the pipeline it is called
    /// on, so <c>return pipeline.Stage(…).Finally(…).WithReplyFrom(…);</c> is the shape that works. Discarding the
    /// result is caught when the pipeline is resolved rather than silently dropping the mailbox.
    /// </para>
    /// </remarks>
    /// <param name="stageName">The stage that opens the mailbox — a stage composed in this pipeline.</param>
    /// <param name="options">The mailbox's declaration: how long it accepts messages.</param>
    /// <returns>A pipeline that is this one plus the mailbox declaration.</returns>
    /// <exception cref="ArgumentException">No stage of this pipeline has that name.</exception>
    /// <exception cref="InvalidOperationException">This pipeline already declares a mailbox.</exception>
    /// <exception cref="ArgumentOutOfRangeException">
    /// <see cref="MailboxOptions.Timeout"/> is not positive.
    /// </exception>
    public ServiceTaskPipeline WithReplyFrom(string stageName, MailboxOptions options)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(stageName);
        ArgumentNullException.ThrowIfNull(options);
        options.Validate();

        if (Mailbox is { } declared)
        {
            throw new InvalidOperationException(
                $"This pipeline already opens a mailbox from stage '{declared.StageName}'. A task declares at "
                    + "most one mailbox — one exchange, one address, one conclusion."
            );
        }

        if (FindStage(stageName) is null)
        {
            string composed = Stages.Count == 0 ? "none" : string.Join(", ", Stages.Select(s => $"'{s.Name}'"));
            throw new ArgumentException(
                $"No stage named '{stageName}' is composed in this pipeline, so it cannot open the mailbox. Only a "
                    + $"stage can: it is what sends the message the answer replies to. Stages composed: {composed}.",
                nameof(stageName)
            );
        }

        // Record the declaration on the builder this pipeline came from, not on this pipeline. The builder is
        // created fresh for each ResolvePipeline call, so the mark cannot outlive the call or reach another task
        // — where a mark on a shared or cached pipeline could latch a base and fail an innocent task.
        _origin.NoteMailboxDeclaration();
        return new ServiceTaskPipeline(
            Stages,
            Final,
            FinalStepOptions,
            new ServiceTaskMailboxDeclaration(stageName, options),
            _origin
        );
    }

    /// <summary>
    /// The stage with the given name (exact match — stage names are our own wire values), or
    /// <c>null</c>.
    /// </summary>
    internal ServiceTaskStage? FindStage(string stageName) =>
        Stages.FirstOrDefault(s => string.Equals(s.Name, stageName, StringComparison.Ordinal));
}

/// <summary>One composed stage: its wire identity, its work, and its optional per-stage options.</summary>
internal sealed record ServiceTaskStage(
    string Name,
    Func<ServiceTaskContext, Task<ServiceTaskStageResult>> Work,
    ProcessStepOptions? StepOptions
);

/// <summary>
/// One declared mailbox: the stage that opens it and the terms it is opened on. Produced by
/// <see cref="ServiceTaskPipeline.WithReplyFrom"/> and read at execution, where the named stage's attempt mints
/// the mailbox.
/// </summary>
internal sealed record ServiceTaskMailboxDeclaration(string StageName, MailboxOptions Options);
