using System.Diagnostics;
using System.Text.Json.Serialization;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// Request payload for the MintMailbox command: the pipeline — a service task's type, or a side effect's name —
/// and the item index of the stage whose mailbox this step opens, the exchange's identity, fixed at enqueue time
/// and never re-derived. Exactly one of the two pipeline fields is set.
/// </summary>
internal sealed record MintMailboxPayload(
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? ServiceTaskType,
    int StageIndex,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? SideEffect = null
) : CommandRequestPayload
{
    /// <summary>The pipeline the payload names. A side effect's mint needs no input, so none is carried.</summary>
    public PipelineHost? ToHost() =>
        (ServiceTaskType, SideEffect) switch
        {
            ({ Length: > 0 } type, null) => new PipelineHost.ServiceTask(type),
            (null, { Length: > 0 } name) => new PipelineHost.SideEffect(name, Input: null),
            _ => null,
        };
}

/// <summary>
/// Opens the mailbox a service-task stage sends its reply address in, as its own engine step immediately
/// before that stage. A step of its own because the mint's outcome is durable and the stage's is not: a stage
/// that fails or defers re-runs against the mailbox this step published, and this step never runs again. Its
/// position is load-bearing in both directions — the deadline clock starts here, so nothing may mint before
/// the stages that precede the send, and the stage must never send without an address.
/// </summary>
internal sealed class MintMailbox(
    AppImplementationFactory appImplementationFactory,
    IWorkflowEngineClient workflowEngineClient
) : WorkflowEngineCommandBase<MintMailboxPayload>
{
    public static string Key => "MintMailbox";

    public override string GetKey() => Key;

    public override async Task<ProcessEngineCommandResult> Execute(
        ProcessEngineCommandContext context,
        MintMailboxPayload payload
    )
    {
        if (payload.ToHost() is not { } host)
        {
            return FailedProcessEngineCommandResult.Permanent(
                $"{Key} payload must name exactly one pipeline: a service task type or a side effect name.",
                "InvalidPayloadException"
            );
        }

        try
        {
            ServiceTaskPipeline pipeline =
                appImplementationFactory.ResolvePipeline(host)
                ?? throw new ProcessException($"{host.Description} is not registered.");

            if (pipeline.Items.ElementAtOrDefault(payload.StageIndex) is not ServiceTaskStage.MailboxOpening declaring)
            {
                return FailedProcessEngineCommandResult.Permanent(
                    $"{host.Description} opened a mailbox from the stage at index "
                        + $"{payload.StageIndex} when this workflow was enqueued, but its pipeline now composes no "
                        + "mailbox-opening stage at that index — stages were inserted, reordered or removed since "
                        + "it was enqueued. Resume the workflow on the code that enqueued it, or abandon it "
                        + "deliberately.",
                    "MailboxDeclarationNotFound"
                );
            }

            if (context.Payload.StepId == Guid.Empty)
            {
                return FailedProcessEngineCommandResult.Permanent(
                    $"The stage at index {payload.StageIndex} opens a mailbox, but the workflow engine supplied no "
                        + "step id to key it on. A mailbox keyed on an empty id would be shared by every task in "
                        + "this application. Upgrade the workflow engine to a version that sends stepId.",
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
                    // The address must outlive this step: the declaring stage and the receiver-enqueue step
                    // read it from here, and neither can re-derive this mint's key.
                    context.StateCarry.RecordMailbox(payload.StageIndex, minted.Mailbox.Id, minted.Mailbox.Deadline);
                    return new SuccessfulProcessEngineCommandResult();

                case MailboxMintResult.Rejected rejected:
                    return FailedProcessEngineCommandResult.Permanent(
                        $"The workflow engine refused the mailbox opened by the stage at index "
                            + $"{payload.StageIndex}: {rejected.Detail}",
                        "MailboxRejected"
                    );

                case MailboxMintResult.AtCapacity atCapacity:
                    return FailedProcessEngineCommandResult.Retryable(
                        $"The workflow engine could not open the mailbox for the stage at index "
                            + $"{payload.StageIndex} yet: {atCapacity.Detail}",
                        "MailboxAtCapacity"
                    );

                default:
                    throw new UnreachableException($"Unknown mailbox mint result type: {result.GetType().Name}");
            }
        }
        catch (Exception ex)
        {
            // Safe to retry: the stage after this one has not run, so nothing has been sent twice.
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }
}
