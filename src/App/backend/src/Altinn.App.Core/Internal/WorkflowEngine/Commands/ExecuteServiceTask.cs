using System.Diagnostics;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// Request payload for the ExecuteServiceTask command: the service task type and, optionally, the
/// pipeline stage this engine step executes. <see cref="StageName"/> is null exactly when the
/// step runs the pipeline's conclusion (its <c>Finally</c> — for an <see cref="IServiceTask"/>,
/// its <c>Execute</c>).
/// </summary>
internal sealed record ExecuteServiceTaskPayload(string ServiceTaskType, string? StageName = null)
    : CommandRequestPayload;

internal sealed class ExecuteServiceTask(
    AppImplementationFactory appImplementationFactory,
    IWorkflowEngineClient workflowEngineClient,
    Telemetry? telemetry = null
) : WorkflowEngineCommandBase<ExecuteServiceTaskPayload>
{
    public static string Key => "ExecuteServiceTask";

    /// <summary>
    /// Service tasks routinely call slow external systems (eFormidling, payment providers), so
    /// they get a far more generous default timeout than the engine's. Override per task via
    /// <see cref="IProcessStepConfigurable.StepOptions"/> or per stage on the builder.
    /// </summary>
    internal static readonly TimeSpan DefaultServiceTaskTimeout = TimeSpan.FromMinutes(10);

    /// <summary>
    /// What <see cref="ServiceTaskContext.Mailbox"/> says when the task opens none — a constant,
    /// since it is the answer for every execution of every service task that never asked for one.
    /// </summary>
    private const string NoMailboxDeclaredReason =
        "ServiceTaskContext.Mailbox was read, but this task opens no mailbox. Declare one on the pipeline with "
        + "WithReplyFrom(\"<stage>\", new MailboxOptions { Timeout = … }), and read it in that stage.";

    public override string GetKey() => Key;

    public override ProcessStepOptions? DefaultStepOptions { get; } =
        new() { MaxExecutionTime = DefaultServiceTaskTimeout };

    public override async Task<ProcessEngineCommandResult> Execute(
        ProcessEngineCommandContext context,
        ExecuteServiceTaskPayload payload
    )
    {
        IInstanceDataMutator instanceDataMutator = context.InstanceDataMutator;
        Instance instance = context.InstanceDataMutator.Instance;
        string serviceTaskType = payload.ServiceTaskType;

        using Activity? activity = telemetry?.StartProcessExecuteServiceTaskActivity(instance, serviceTaskType);

        try
        {
            IPipelineServiceTask serviceTask =
                appImplementationFactory.FindServiceTask(serviceTaskType)
                ?? throw new ProcessException($"No service task found for type {serviceTaskType}");

            // The stage name routes within the pipeline: null is the conclusion (the pipeline's
            // Finally — for a simple task, its Execute), a name is one of the composed stages.
            ServiceTaskPipeline pipeline = serviceTask.ResolvePipeline();

            // The mailbox is opened before the declaring stage's work runs, so the stage has an
            // address to publish in the very message it sends. Minting it is keyed on this step, so
            // an attempt that sent and then crashed is handed the same address on its retry.
            MailboxResolution mailbox = await ResolveMailbox(context, pipeline, payload.StageName);
            if (mailbox.Failure is { } mintFailure)
            {
                return mintFailure;
            }

            ServiceTaskContext serviceTaskContext = new()
            {
                InstanceDataMutator = instanceDataMutator,
                CancellationToken = context.CancellationToken,
                WorkflowId = context.Payload.WorkflowId,
                StepId = context.Payload.StepId,
                ExecutionReferenceTime = context.Payload.ExecutionReferenceTime,
                Attempt = new ServiceTaskAttempt
                {
                    RetryCount = context.Payload.RetryCount,
                    Deadline = context.Payload.ExecutionDeadline,
                },
                Wait = new ServiceTaskWait
                {
                    DeferCount = context.Payload.DeferCount,
                    StartedAt = context.Payload.FirstDeferredAt,
                    Deadline = context.Payload.WaitDeadline,
                },
                MailboxOrDefault = mailbox.Mailbox,
                MailboxUnavailableReason = mailbox.UnavailableReason,
            };

            return payload.StageName is { } stageName
                ? await ExecuteStage(pipeline, serviceTask, stageName, serviceTaskContext)
                : MapServiceTaskResult(await pipeline.Final(serviceTaskContext), serviceTask);
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }

    /// <summary>
    /// What this execution knows about the pipeline's mailbox: the mailbox itself when this is the
    /// stage that opens it, otherwise the sentence explaining where it <em>is</em> readable — and, in
    /// place of both, the failure when the mailbox should have been opened and could not be.
    /// </summary>
    private readonly record struct MailboxResolution(
        ServiceTaskMailbox? Mailbox,
        string? UnavailableReason,
        FailedProcessEngineCommandResult? Failure
    );

    /// <summary>
    /// Mints the pipeline's mailbox when this execution is the stage that declared it; otherwise
    /// records why <see cref="ServiceTaskContext.Mailbox"/> is not readable here, so the throw the
    /// app sees names the stage that can read it rather than stating that something is missing.
    /// </summary>
    private async Task<MailboxResolution> ResolveMailbox(
        ProcessEngineCommandContext context,
        ServiceTaskPipeline pipeline,
        string? stageName
    )
    {
        // The overwhelmingly common case — a task that opens no mailbox at all — answers with a
        // constant, because this method runs on every service-task execution in every app.
        if (pipeline.Mailbox is not { } declaration)
        {
            return new MailboxResolution(null, NoMailboxDeclaredReason, null);
        }

        if (!string.Equals(declaration.StageName, stageName, StringComparison.Ordinal))
        {
            string executing = stageName is null ? "the pipeline's conclusion" : $"stage '{stageName}'";
            return new MailboxResolution(
                null,
                $"{nameof(ServiceTaskContext)}.{nameof(ServiceTaskContext.Mailbox)} was read in {executing}, but this "
                    + $"task's mailbox is opened by stage '{declaration.StageName}' and is readable only there. The "
                    + "stage that sends is the stage that publishes the address.",
                null
            );
        }

        // The mint's idempotency key is the executing step's id, which is what makes a retry replay
        // onto the mailbox this stage already published. An engine that did not send one would leave
        // it empty — and an empty key is a *constant*, so every mailbox in the namespace would
        // collapse onto one shared inbox and every task would read every other task's messages.
        // Refusing outright is the only safe answer, and it can only ever be a deployment mismatch.
        if (context.Payload.StepId == Guid.Empty)
        {
            return new MailboxResolution(
                null,
                null,
                FailedProcessEngineCommandResult.Permanent(
                    $"Stage '{declaration.StageName}' opens a mailbox, but the workflow engine supplied no step id to "
                        + "key it on. A mailbox keyed on an empty id would be shared by every task in this "
                        + "application. Upgrade the workflow engine to a version that sends stepId.",
                    "MailboxStepIdMissing"
                )
            );
        }

        MailboxMintResult result = await workflowEngineClient.MintMailbox(
            $"{context.AppId.Org}/{context.AppId.App}",
            new MailboxCreateRequest
            {
                IdempotencyKey = context.Payload.StepId.ToString(),
                Timeout = declaration.Options.Timeout,
                CollectionKey = ProcessNextRequestFactory.CreateCollectionKey(context.InstanceId),
            },
            context.CancellationToken
        );

        return result switch
        {
            MailboxMintResult.Minted minted => new MailboxResolution(
                new ServiceTaskMailbox { Id = minted.Mailbox.Id, Deadline = minted.Mailbox.Deadline },
                null,
                null
            ),

            // The engine read the declaration and found it impossible — most often a Timeout past the
            // engine's maximum, which app startup cannot check because the maximum is the engine's.
            // Retrying replays the same rejection, so this fails the transition once, with the
            // engine's own words, instead of a day later with none.
            MailboxMintResult.Rejected rejected => new MailboxResolution(
                null,
                null,
                FailedProcessEngineCommandResult.Permanent(
                    $"The workflow engine refused the mailbox opened by stage '{declaration.StageName}': "
                        + $"{rejected.Detail}",
                    "MailboxRejected"
                )
            ),

            // The collection is at its open-mailbox cap. Retryable — the cap clears as mailboxes
            // reach their deadlines — but named on the first failure, because a cap hit here means
            // this instance already holds the maximum number of open mailboxes, a runaway ops should
            // see rather than a bare 429 repeated up the ladder.
            MailboxMintResult.AtCapacity atCapacity => new MailboxResolution(
                null,
                null,
                FailedProcessEngineCommandResult.Retryable(
                    $"The workflow engine could not open the mailbox for stage '{declaration.StageName}' yet: "
                        + $"{atCapacity.Detail}",
                    "MailboxAtCapacity"
                )
            ),

            _ => throw new UnreachableException($"Unknown mailbox mint result type: {result.GetType().Name}"),
        };
    }

    private static async Task<ProcessEngineCommandResult> ExecuteStage(
        ServiceTaskPipeline pipeline,
        IPipelineServiceTask serviceTask,
        string stageName,
        ServiceTaskContext serviceTaskContext
    )
    {
        ServiceTaskStage? stage = pipeline.FindStage(stageName);
        if (stage is null)
        {
            return FailedProcessEngineCommandResult.Permanent(
                $"Service task '{serviceTask.Type}' composes no stage named '{stageName}'. Stage names are a "
                    + "compatibility surface for in-flight workflows: if the stage was renamed or removed since this "
                    + "workflow was enqueued, redeploy with the original name restored in "
                    + $"{nameof(IPipelineServiceTask.Define)} and resume the workflow.",
                "ServiceTaskStageNotFound"
            );
        }

        return MapStageResult(await stage.Work(serviceTaskContext), serviceTask);
    }

    private static ProcessEngineCommandResult MapStageResult(
        ServiceTaskStageResult result,
        IPipelineServiceTask task
    ) =>
        result switch
        {
            // A completed stage never advances the process — the pipeline just moves on to its
            // next engine step.
            CompletedServiceTaskStageResult => new SuccessfulProcessEngineCommandResult(),
            DeferredServiceTaskStageResult deferred => new DeferredProcessEngineCommandResult
            {
                Delay = deferred.Delay,
                Reason = deferred.Reason,
            },
            FailedServiceTaskStageResult failed => MapFailure(
                task,
                failed.ErrorMessage,
                failed.Kind == FailureKind.Permanent
            ),
            _ => throw new UnreachableException($"Unknown stage result type: {result.GetType().Name}"),
        };

    private static ProcessEngineCommandResult MapServiceTaskResult(
        ServiceTaskResult result,
        IPipelineServiceTask task
    ) =>
        result switch
        {
            ServiceTaskFailedResult failed => MapFailure(
                task,
                failed.ErrorMessage,
                failed.Kind == FailureKind.Permanent
            ),
            ServiceTaskDeferredResult deferred => new DeferredProcessEngineCommandResult
            {
                Delay = deferred.Delay,
                Reason = deferred.Reason,
            },
            ServiceTaskSuccessResult { AutoAdvanceProcess: true } success => new SuccessfulProcessEngineCommandResult
            {
                AutoAdvanceProcess = true,
                AutoAdvanceAction = success.Action,
            },
            _ => new SuccessfulProcessEngineCommandResult(),
        };

    private static FailedProcessEngineCommandResult MapFailure(
        IPipelineServiceTask task,
        string errorMessage,
        bool permanent
    )
    {
        string message = $"Service task '{task.Type}' failed: {errorMessage}";
        return permanent
            ? FailedProcessEngineCommandResult.Permanent(message, "ServiceTaskFailedException")
            : FailedProcessEngineCommandResult.Retryable(message, "ServiceTaskFailedException");
    }
}
