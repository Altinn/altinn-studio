using System.Diagnostics;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// Request payload for the MintMailbox command: the service task type and the stage whose mailbox this
/// step opens. Both are literals fixed at enqueue time — the stage name is the exchange's identity from
/// here on, and nothing re-derives it later.
/// </summary>
internal sealed record MintMailboxPayload(string ServiceTaskType, string StageName) : CommandRequestPayload;

/// <summary>
/// Opens the mailbox a service-task stage sends its reply address in, as its own engine step immediately
/// before that stage.
/// </summary>
/// <remarks>
/// A step of its own rather than part of the stage's execution, because the mint's outcome is durable and
/// the stage's is not: a stage that fails or defers re-runs against the mailbox this step published, and
/// this step never runs again. Its position is load-bearing in both directions — the mailbox's deadline
/// starts here, so nothing may mint before the stages that precede the send, and the stage must never send
/// without an address, so nothing may mint after it.
/// </remarks>
internal sealed class MintMailbox(
    AppImplementationFactory appImplementationFactory,
    IWorkflowEngineClient workflowEngineClient
) : WorkflowEngineCommandBase<MintMailboxPayload>
{
    public static string Key => "MintMailbox";

    public override string GetKey() => Key;

    /// <summary>
    /// Opens the mailbox and records it in the carry, guarding four things this step cannot recover from:
    /// <list type="bullet">
    /// <item>
    /// <term><c>MailboxDeclarationNotFound</c></term>
    /// <description>
    /// redeploy drift: this workflow was enqueued against a stage that opened a mailbox, and the code
    /// answering the callback has no such stage opening one — renamed, moved to another stage, or withdrawn.
    /// Stage names and the mailboxes they open are a compatibility surface for in-flight workflows.
    /// </description>
    /// </item>
    /// <item>
    /// <term><c>MailboxStepIdMissing</c></term>
    /// <description>
    /// engine drift: an engine version that does not send <c>stepId</c> on the callback. The mint is keyed on
    /// it, and an empty key is a constant — every mailbox in the namespace would collapse onto one inbox.
    /// </description>
    /// </item>
    /// <item>
    /// <term><c>MailboxRejected</c></term>
    /// <description>
    /// not drift but an engine-side limit app startup cannot check, most often a <c>Timeout</c> past the
    /// engine's <c>MaxMailboxTimeout</c>. Permanent, because a retry replays the same rejection.
    /// </description>
    /// </item>
    /// <item>
    /// <term><c>MailboxAtCapacity</c></term>
    /// <description>
    /// the same kind of engine-side limit, but transient — retryable, and named on the first failure rather
    /// than retried silently, because a cap hit is a runaway.
    /// </description>
    /// </item>
    /// </list>
    /// </summary>
    public override async Task<ProcessEngineCommandResult> Execute(
        ProcessEngineCommandContext context,
        MintMailboxPayload payload
    )
    {
        try
        {
            IPipelineServiceTask serviceTask =
                appImplementationFactory.FindServiceTask(payload.ServiceTaskType)
                ?? throw new ProcessException($"No service task found for type {payload.ServiceTaskType}");

            ServiceTaskPipeline pipeline = serviceTask.ResolvePipeline();

            // One lookup: a rename and a withdrawn declaration are the same miss now that the declaration
            // lives on the stage.
            if (pipeline.FindStage(payload.StageName) is not ServiceTaskStage.MailboxOpening declaring)
            {
                // Where the mailbox went is the actionable half, so it comes before the remediation.
                string opensNow = pipeline.Items.OfType<ServiceTaskStage.MailboxOpening>().FirstOrDefault()
                    is { } relocated
                    ? $"its mailbox is now opened by stage '{relocated.Name}'"
                    : "its pipeline now opens no mailbox at all";
                return FailedProcessEngineCommandResult.Permanent(
                    $"Service task '{payload.ServiceTaskType}' opened a mailbox from stage '{payload.StageName}' when "
                        + $"this workflow was enqueued, but {opensNow}. Stage names and the mailboxes they open are a "
                        + "compatibility surface for in-flight workflows: redeploy with the mailbox opened from a "
                        + $"stage named '{payload.StageName}' in {nameof(IPipelineServiceTask.Define)} and resume the "
                        + "workflow.",
                    "MailboxDeclarationNotFound"
                );
            }

            if (context.Payload.StepId == Guid.Empty)
            {
                return FailedProcessEngineCommandResult.Permanent(
                    $"Stage '{payload.StageName}' opens a mailbox, but the workflow engine supplied no step id to "
                        + "key it on. A mailbox keyed on an empty id would be shared by every task in this "
                        + "application. Upgrade the workflow engine to a version that sends stepId.",
                    "MailboxStepIdMissing"
                );
            }

            MailboxMintResult result = await workflowEngineClient.MintMailbox(
                $"{context.AppId.Org}/{context.AppId.App}",
                new MailboxCreateRequest
                {
                    IdempotencyKey = context.Payload.StepId.ToString(),
                    Timeout = declaring.Declaration.Timeout,
                    CollectionKey = ProcessNextRequestFactory.CreateCollectionKey(context.InstanceId),
                },
                context.CancellationToken
            );

            switch (result)
            {
                case MailboxMintResult.Minted minted:
                    // The address must outlive this step: the declaring stage reads it from here, and so does the
                    // step that enqueues the first receiver — neither can re-derive this mint's key.
                    context.StateCarry.RecordMailbox(payload.StageName, minted.Mailbox.Id, minted.Mailbox.Deadline);
                    return new SuccessfulProcessEngineCommandResult();

                case MailboxMintResult.Rejected rejected:
                    return FailedProcessEngineCommandResult.Permanent(
                        $"The workflow engine refused the mailbox opened by stage '{payload.StageName}': "
                            + $"{rejected.Detail}",
                        "MailboxRejected"
                    );

                case MailboxMintResult.AtCapacity atCapacity:
                    return FailedProcessEngineCommandResult.Retryable(
                        $"The workflow engine could not open the mailbox for stage '{payload.StageName}' yet: "
                            + $"{atCapacity.Detail}",
                        "MailboxAtCapacity"
                    );

                // Drift guard for this assembly's own vocabulary: MailboxMintResult is a closed internal set, so
                // the only way here is an outcome added to it without a case to map it.
                default:
                    throw new UnreachableException($"Unknown mailbox mint result type: {result.GetType().Name}");
            }
        }
        catch (Exception ex)
        {
            // Every unmodeled mint failure rides the step's retry ladder: the stage after this one has not run,
            // so nothing has been sent that a retry would send twice.
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }
}
