using System.Diagnostics;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.AltinnEvents;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.ProcessEnd;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskAbandon;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskEnd;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// A segment's receive half: the one step its receive workflows run — the handler answering the exchange the
/// segment ends on, whether that is a mid-pipeline one or the pipeline's terminal — and the stage that opens
/// the exchange that step answers.
/// </summary>
/// <remarks>
/// <para>
/// The step belongs to the enqueued receiver, never to the workflow running the segment, and has its options
/// resolved by the caller like any other step's. The stage name is the exchange's identity, fixed at assembly
/// time and never re-derived later, so a mid-flight rename cannot silently address a different mailbox. One
/// type rather than two nullable fields because neither half means anything without the other.
/// </para>
/// <para>
/// <see cref="OpeningStageName"/> is deliberately the same string that sits inside <see cref="Step"/>'s
/// serialized payload, held twice: the enqueueing hop needs it to tell <c>EnqueueReceiveWorkflow</c> which
/// carried mailbox to declare, and reading it back out of the step would mean deserializing a payload this
/// plan just wrote. Do not "deduplicate" it away.
/// </para>
/// </remarks>
/// <param name="Step">The receive workflow's single step.</param>
/// <param name="OpeningStageName">The stage whose mint the receiver is enqueued against.</param>
internal sealed record MailboxReceivePlan(StepRequest Step, string OpeningStageName);

/// <summary>
/// One planned pipeline segment: the engine steps the workflow that runs the segment carries, and — when the
/// segment ends on an exchange — the receive half its last step enqueues instead of concluding.
/// </summary>
/// <remarks>
/// <para>
/// The two halves are one type because a segment is one shape: <see cref="Receive"/> null means
/// <see cref="Steps"/> already ends with the concluding step, and non-null means the enqueuing hop must end
/// the segment with an <c>EnqueueReceiveWorkflow</c> step of its own. That last step is deliberately not
/// planned here — its labels, operation id and callback context belong to the hop doing the enqueueing, and
/// no two hops assemble them the same way.
/// </para>
/// </remarks>
/// <param name="Steps">The segment's steps, in execution order, with options unresolved.</param>
/// <param name="Receive">The exchange the segment ends on, or null when it ends with the conclusion.</param>
internal sealed record ServiceTaskSegmentPlan(IReadOnlyList<StepRequest> Steps, MailboxReceivePlan? Receive);

/// <summary>
/// Defines a group of commands that should be executed for a process event.
/// </summary>
internal sealed class WorkflowCommandSet
{
    private readonly List<StepRequest> _commands = [];
    private readonly List<StepRequest> _criticalPostCommitCommands = [];
    private readonly List<StepRequest> _sideEffectCommands = [];

    /// <summary>
    /// Gets the main commands for this event. SaveProcessStateToStorage will be added after these.
    /// </summary>
    public IReadOnlyList<StepRequest> Commands => _commands;

    /// <summary>
    /// Gets the post-commit commands that must complete before the transition is considered done
    /// (e.g., ExecuteServiceTask). These stay in the Main workflow and gate the next transition.
    /// </summary>
    public IReadOnlyList<StepRequest> CriticalPostCommitCommands => _criticalPostCommitCommands;

    /// <summary>
    /// Gets the non-critical, fire-and-forget post-commit commands (e.g., MovedToAltinnEvent).
    /// These run in a separate side-effects workflow that never gates the next transition.
    /// </summary>
    public IReadOnlyList<StepRequest> SideEffectCommands => _sideEffectCommands;

    /// <summary>
    /// For a mailbox-opening service task: the one step its receive workflows run, and the exchange it
    /// answers. Null for every other event.
    /// </summary>
    public MailboxReceivePlan? MailboxReceive { get; private set; }

    /// <summary>
    /// Creates command group for task start events.
    /// </summary>
    public static WorkflowCommandSet GetTaskStartSteps(TaskStartContext context)
    {
        // CleanupGeneratedFromTask runs before the hooks so that all task-start logic (including
        // app-supplied IOnTaskStartingHandler implementations) reads a clean slate, free of stale
        // elements generated by previous visits to the entering task.
        var group = new WorkflowCommandSet()
            .AddCommand(UnlockTaskData.Key)
            .AddCommand(CleanupGeneratedFromTask.Key)
            .AddCommand(OnTaskStartingHook.Key)
            .AddCommand(CommonTaskInitialization.Key, new CommonTaskInitializationPayload(context.Prefill))
            .AddCommand(StartTask.Key);

        if (context.RegisterEvents)
        {
            group.AddSideEffectCommand(MovedToAltinnEvent.Key);
        }

        if (context.ServiceTask is { } serviceTask)
        {
            // The pipeline's own steps are planned in one place, shared with every other hop that runs a
            // segment, and spliced in here: they are critical, so the next transition waits on them.
            ServiceTaskSegmentPlan segment = PlanSegment(serviceTask.Type, serviceTask.Pipeline);
            group.AddCriticalPostCommitSteps(segment.Steps);
            group.MailboxReceive = segment.Receive;
        }

        if (context.IsInstantiation && context.RegisterEvents)
        {
            group.AddSideEffectCommand(InstanceCreatedAltinnEvent.Key);
        }

        if (context.IsInstantiation && context.Notification is not null)
        {
            group.AddSideEffectCommand(
                NotifyInstanceOwnerOnInstantiation.Key,
                new NotifyInstanceOwnerOnInstantiationPayload(context.Notification)
            );
        }

        return group;
    }

    /// <summary>
    /// Creates command group for task end events.
    /// </summary>
    public static WorkflowCommandSet GetTaskEndSteps()
    {
        return new WorkflowCommandSet()
            .AddCommand(EndTask.Key)
            .AddCommand(CommonTaskFinalization.Key)
            .AddCommand(OnTaskEndingHook.Key)
            .AddCommand(LockTaskData.Key);
    }

    /// <summary>
    /// Creates command group for task abandon events.
    /// </summary>
    public static WorkflowCommandSet GetTaskAbandonSteps()
    {
        return new WorkflowCommandSet().AddCommand(AbandonTask.Key).AddCommand(OnTaskAbandonHook.Key);
    }

    /// <summary>
    /// Creates command group for process end events.
    /// </summary>
    public static WorkflowCommandSet GetProcessEndSteps(ProcessEndContext context)
    {
        // EndProcessLegacyHook runs post-commit because IProcessEnd.End reads instance.Process.EndEvent,
        // which is only set when the process state is persisted. This matches the old ProcessEngine behavior
        // where RunAppDefinedProcessEndHandlers ran after HandleEventsAndUpdateStorage.
        var group = new WorkflowCommandSet()
            .AddCommand(OnProcessEndingHook.Key)
            .AddCriticalPostCommitCommand(EndProcessLegacyHook.Key);

        if (context.HasAutoDeleteDataTypes)
        {
            group.AddCriticalPostCommitCommand(DeleteDataElementsIfConfigured.Key);
        }

        if (context.AutoDeleteInstanceOnProcessEnd)
        {
            group.AddCriticalPostCommitCommand(DeleteInstanceIfConfigured.Key);
        }

        if (context.RegisterEvents)
        {
            group.AddSideEffectCommand(CompletedAltinnEvent.Key);
        }

        return group;
    }

    /// <summary>
    /// Adds a command to the main sequence.
    /// </summary>
    private WorkflowCommandSet AddCommand(string commandKey, CommandRequestPayload? payload = null)
    {
        _commands.Add(CreateCommand(commandKey, payload));
        return this;
    }

    /// <summary>
    /// Adds a command that executes after the ProcessNext has been committed to storage via
    /// SaveProcessStateToStorage, and that must complete before the transition settles.
    /// </summary>
    /// <param name="commandKey">The command's registered key.</param>
    /// <param name="payload">Optional command payload.</param>
    private WorkflowCommandSet AddCriticalPostCommitCommand(string commandKey, CommandRequestPayload? payload = null)
    {
        _criticalPostCommitCommands.Add(CreateCommand(commandKey, payload));
        return this;
    }

    /// <summary>
    /// Adds already-built critical post-commit steps, in order — the same door as
    /// <see cref="AddCriticalPostCommitCommand"/> for steps a planner assembled rather than this class.
    /// </summary>
    private WorkflowCommandSet AddCriticalPostCommitSteps(IEnumerable<StepRequest> steps)
    {
        _criticalPostCommitCommands.AddRange(steps);
        return this;
    }

    /// <summary>
    /// Adds a non-critical post-commit command that runs in the fire-and-forget side-effects workflow.
    /// </summary>
    private WorkflowCommandSet AddSideEffectCommand(string commandKey, CommandRequestPayload? payload = null)
    {
        _sideEffectCommands.Add(CreateCommand(commandKey, payload));
        return this;
    }

    /// <summary>
    /// Plans one pipeline segment: one <c>ExecuteServiceTask</c> step per stage in composition order, each
    /// preceded by a <c>MintMailbox</c> step where the stage opens a mailbox, ended by whatever ends the
    /// segment — the next <see cref="ReplySegment"/>'s receive half, or, when no handler follows, the
    /// pipeline's conclusion (the concluding step for a <see cref="PipelineConclusion.FinalStep"/>, the
    /// receive half for a <see cref="PipelineConclusion.ReplyExchange"/>). A receive half's enqueue step is
    /// the caller's to append.
    /// </summary>
    /// <remarks>
    /// <para>
    /// <strong>Segments are the items split at each reply handler.</strong> Segment 0 — the whole pipeline
    /// for a task with no mid-pipeline handler — rides Main; segment k rides the continuation the relay
    /// enqueues when exchange k concludes. A handler is never a step of the segment it ends: it runs on the
    /// receive workflows that segment's last step enqueues, once per message. So the two callers ask for a
    /// segment the same way — the factory for the first, the relay naming the handler it just ran past.
    /// </para>
    /// <para>
    /// Options are left unresolved, as <see cref="CreateReceiveHandlerStep"/> leaves them: the task the steps
    /// run under is the enqueueing hop's to know, so the hop resolves them.
    /// </para>
    /// <para>
    /// A segment is planned from the pipeline as resolved at that hop, never from a projection of it carried
    /// along — the identity travelling in payloads is the stage name, and the shape around it is re-derived.
    /// The expansion fixes that shape for the workflow's lifetime, so a stage name is a compatibility surface
    /// for in-flight workflows even though the plan is rebuilt.
    /// </para>
    /// <para>
    /// <strong>Frontier-never-empty is the caller's to hold, not this method's.</strong> What keeps the
    /// collection non-empty is that the step enqueueing the next receiver is the segment's <em>last</em>
    /// step, and that step is appended by the hop — so each hop reproduces that ordering itself, and a
    /// reviewer cannot read it off this method.
    /// </para>
    /// </remarks>
    /// <param name="serviceTaskType">The service task the steps dispatch back to.</param>
    /// <param name="pipeline">The task's pipeline, resolved at this hop.</param>
    /// <param name="afterExchange">
    /// The exchange whose handler this segment follows, naming it by the stage that opened it — so the
    /// segment starts at the item after that handler. Null for segment 0, which starts at the beginning.
    /// </param>
    internal static ServiceTaskSegmentPlan PlanSegment(
        string serviceTaskType,
        ServiceTaskPipeline pipeline,
        string? afterExchange = null
    )
    {
        var steps = new List<StepRequest>();

        for (int index = FindSegmentStart(pipeline, afterExchange); index < pipeline.Items.Count; index++)
        {
            switch (pipeline.Items[index])
            {
                case ReplySegment handler:
                    // The segment ends here: its exchange is answered on receive workflows, not in this
                    // workflow, so the hop ends the segment by enqueueing the first of them. Everything
                    // composed after this handler belongs to the segment that exchange's conclusion starts.
                    return new ServiceTaskSegmentPlan(
                        steps,
                        new MailboxReceivePlan(
                            CreateReceiveHandlerStep(serviceTaskType, handler.OpeningStageName),
                            handler.OpeningStageName
                        )
                    );

                case ServiceTaskStage stage:
                    if (stage is ServiceTaskStage.MailboxOpening)
                    {
                        // The mint hugs the stage that sends, on both sides: the deadline clock starts here, so
                        // no earlier stage may erode it, and the stage must never send without an address, so
                        // the mint cannot come later. No serviceTaskStageName: it is not the stage, and must not
                        // inherit the stage's options — its own key resolves to whatever MintMailbox declares,
                        // today nothing, so the engine's defaults apply to what is one HTTP call.
                        steps.Add(
                            CreateCommand(
                                MintMailbox.Key,
                                new MintMailboxPayload(serviceTaskType, stage.Name),
                                operationId: $"{MintMailbox.Key}: {stage.Name}"
                            )
                        );
                    }

                    // One engine step per pipeline stage. Each gets a distinct OperationId for the engine's
                    // records and dashboards; the payload's stage name is what callback dispatch keys on.
                    steps.Add(
                        CreateCommand(
                            ExecuteServiceTask.Key,
                            new ExecuteServiceTaskPayload(serviceTaskType, stage.Name),
                            operationId: $"{ExecuteServiceTask.Key}: {stage.Name}",
                            serviceTaskStageName: stage.Name
                        )
                    );
                    break;

                // Drift guard for this assembly's own model: PipelineItem is a closed two-shape set and both
                // shapes are planned above, so the only way here is a third shape added without a plan for
                // the steps it expands to.
                default:
                    throw new UnreachableException(
                        $"Unknown pipeline item type: {pipeline.Items[index].GetType().Name}"
                    );
            }
        }

        // No handler follows, so this is the pipeline's last segment and the conclusion ends it.
        switch (pipeline.Conclusion)
        {
            case PipelineConclusion.ReplyExchange exchange:
                // A task concluded by an exchange expands to no concluding step here — the reply terminal runs
                // on the receive workflows, once per message. The enqueuing hop ends the segment with the step
                // that enqueues the first receiver instead.
                return new ServiceTaskSegmentPlan(
                    steps,
                    new MailboxReceivePlan(
                        CreateReceiveHandlerStep(serviceTaskType, exchange.OpeningStageName),
                        exchange.OpeningStageName
                    )
                );

            case PipelineConclusion.FinalStep:
                // The concluding engine step — the pipeline's Finally, identified by naming neither a stage nor
                // an exchange.
                steps.Add(CreateCommand(ExecuteServiceTask.Key, new ExecuteServiceTaskPayload(serviceTaskType)));
                return new ServiceTaskSegmentPlan(steps, Receive: null);

            default:
                throw new UnreachableException(
                    $"Unknown pipeline conclusion type: {pipeline.Conclusion.GetType().Name}"
                );
        }
    }

    /// <summary>
    /// Where the requested segment starts: the beginning for segment 0, and otherwise the item after the
    /// handler answering <paramref name="afterExchange"/>.
    /// </summary>
    /// <remarks>
    /// A name matching no handler throws rather than silently planning segment 0 — which would re-run every
    /// stage of the task, re-minting mailboxes and re-sending. Unreachable in practice and therefore not a
    /// failure result: the only caller naming an exchange is the relay, running inside the very callback
    /// whose dispatch found that handler in this same pipeline, and <c>Define</c> is contractually
    /// deterministic. It throws (rather than <see cref="UnreachableException"/>) because what it would take
    /// to get here is an app's <c>Define</c> breaking that contract, not this assembly's model drifting.
    /// </remarks>
    private static int FindSegmentStart(ServiceTaskPipeline pipeline, string? afterExchange)
    {
        if (afterExchange is null)
        {
            return 0;
        }

        for (int index = 0; index < pipeline.Items.Count; index++)
        {
            if (
                pipeline.Items[index] is ReplySegment handler
                && string.Equals(handler.OpeningStageName, afterExchange, StringComparison.Ordinal)
            )
            {
                return index + 1;
            }
        }

        throw new InvalidOperationException(
            $"The pipeline composes no handler for the exchange opened by stage '{afterExchange}', so the "
                + "segment that follows it cannot be planned. Define must return the same pipeline every time "
                + "it is called."
        );
    }

    /// <summary>
    /// The one step a receive workflow runs: an <c>ExecuteServiceTask</c> step that names the exchange it
    /// answers rather than a stage it runs.
    /// </summary>
    /// <remarks>
    /// The name is fixed here, at the receiver's enqueue, and never re-derived at the hop that runs the step —
    /// a stage renamed mid-flight would otherwise address a different exchange, or silently none. It travels
    /// twice, deliberately: in the payload, which is what dispatch reads at the hop that runs the step, and in
    /// <see cref="StepRequest.ServiceTaskRepliesTo"/>, which is what the enqueueing hop resolves the step's
    /// options by — the second would otherwise mean re-deserializing the payload the hop just wrote. No
    /// <c>ServiceTaskStageName</c>: a receive step runs no stage.
    /// </remarks>
    /// <param name="serviceTaskType">The service task whose pipeline answers the exchange.</param>
    /// <param name="openingStageName">The stage that opened the exchange this receiver answers.</param>
    internal static StepRequest CreateReceiveHandlerStep(string serviceTaskType, string openingStageName) =>
        CreateCommand(
            ExecuteServiceTask.Key,
            new ExecuteServiceTaskPayload(serviceTaskType, RepliesTo: openingStageName),
            serviceTaskRepliesTo: openingStageName
        );

    /// <summary>
    /// The step that ends a segment ending on an exchange: it enqueues the exchange's first receive workflow,
    /// carrying the workflow its hop pre-assembled and the name of the stage whose mailbox that receiver is
    /// declared against.
    /// </summary>
    /// <remarks>
    /// Shared by the two hops that end a segment — Main's assembly and the relay's continuation — because the
    /// step is the same either way. What is <em>not</em> shared is the workflow inside it: its labels,
    /// operation id and callback context are the enqueueing hop's, and no two hops assemble them alike.
    /// </remarks>
    /// <param name="receiveEnqueueRequest">The receive workflow, pre-assembled by the hop.</param>
    /// <param name="openingStageName">The stage whose carried mailbox the receiver is declared against.</param>
    internal static StepRequest CreateReceiveEnqueueStep(
        WorkflowEnqueueRequest receiveEnqueueRequest,
        string openingStageName
    ) =>
        CreateCommand(
            EnqueueReceiveWorkflow.Key,
            new EnqueueReceiveWorkflowPayload(receiveEnqueueRequest, openingStageName)
        );

    private static StepRequest CreateCommand(
        string commandKey,
        CommandRequestPayload? payload = null,
        string? operationId = null,
        string? serviceTaskStageName = null,
        string? serviceTaskRepliesTo = null
    )
    {
        string? serializedPayload = CommandPayloadSerializer.Serialize(payload);
        return new StepRequest
        {
            OperationId = operationId ?? commandKey,
            Command = CommandDefinition.Create(
                "app",
                new AppCommandData { CommandKey = commandKey, Payload = serializedPayload }
            ),
            CommandKey = commandKey,
            ServiceTaskStageName = serviceTaskStageName,
            ServiceTaskRepliesTo = serviceTaskRepliesTo,
        };
    }
}
