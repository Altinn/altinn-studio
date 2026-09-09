using System.Collections.Concurrent;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Features.Signing;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>Frozen notification recipients and execution settings, created before the transition commits.</summary>
internal sealed record ScheduleSigneeNotificationsPayload(
    string TaskId,
    Guid SigneeStateElementId,
    IReadOnlyList<Guid> SigneeIds,
    WorkflowEnqueueRequest Notifications
) : CommandRequestPayload
{
    internal override string? Validate() =>
        string.IsNullOrWhiteSpace(TaskId)
        || SigneeStateElementId == Guid.Empty
        || SigneeIds is null
        || SigneeIds.Any(id => id == Guid.Empty)
        || SigneeIds.Distinct().Count() != SigneeIds.Count
        || Notifications?.Workflows.Count != 1
        || Notifications.Workflows[0].Steps.Count != 1
            ? "The signing task, frozen recipients and notification template are required."
            : null;
}

/// <summary>
/// Schedules one independent notification workflow per recipient after commit. Every request is idempotent,
/// so a partial enqueue or a lost response can be retried without recreating already accepted jobs.
/// </summary>
internal sealed class ScheduleSigneeNotifications(IWorkflowEngineClient workflowEngineClient)
    : WorkflowEngineCommandBase<ScheduleSigneeNotificationsPayload>
{
    internal static string Key => "ScheduleSigneeNotifications";

    public override string GetKey() => Key;

    public override async Task<ProcessEngineCommandResult> Execute(
        ProcessEngineCommandContext context,
        ScheduleSigneeNotificationsPayload payload
    )
    {
        if (payload.Validate() is { } error)
        {
            return ProcessEngineCommandResult.FailedPermanent(error, "InvalidPayloadException");
        }

        var failures = new ConcurrentQueue<Exception>();
        await Parallel.ForEachAsync(
            payload.SigneeIds,
            new ParallelOptions { MaxDegreeOfParallelism = 8, CancellationToken = context.CancellationToken },
            async (signeeId, cancellationToken) =>
            {
                try
                {
                    var labels = new Dictionary<string, string>(
                        payload.Notifications.Labels ?? [],
                        StringComparer.Ordinal
                    )
                    {
                        [SigningWorkflowLabels.SigningNotificationLabel] = "true",
                        [SigningWorkflowLabels.SigningInitializationLabel] = payload.SigneeStateElementId.ToString("D"),
                        [SigningWorkflowLabels.SigningSigneeLabel] = signeeId.ToString("D"),
                        [SigningWorkflowLabels.SigningTaskLabel] = payload.TaskId,
                    };
                    WorkflowRequest template = payload.Notifications.Workflows[0];
                    await workflowEngineClient.EnqueueWorkflows(
                        ns: $"{context.AppId.Org}/{context.AppId.App}",
                        idempotencyKey: CreateIdempotencyKey(context.StepId, signeeId),
                        collectionKey: ProcessNextRequestFactory.CreateCollectionKey(context.InstanceId),
                        request: payload.Notifications with
                        {
                            Labels = labels,
                            Workflows =
                            [
                                template with
                                {
                                    Steps =
                                    [
                                        SigningWorkflowSteps.WithPayload(
                                            template.Steps[0],
                                            new SigneeCommandPayload(
                                                payload.TaskId,
                                                payload.SigneeStateElementId,
                                                signeeId
                                            )
                                        ),
                                    ],
                                    State = context.Payload.State,
                                    Links = [WorkflowRef.FromDatabaseId(context.WorkflowId)],
                                    DependsOn = null,
                                    DependsOnHeads = false,
                                    IsHead = false,
                                },
                            ],
                        },
                        ct: cancellationToken
                    );
                }
                catch (OperationCanceledException) when (context.CancellationToken.IsCancellationRequested)
                {
                    throw;
                }
                catch (Exception exception)
                {
                    // Finish the other recipients even if this request failed; the retry deduplicates them.
                    failures.Enqueue(exception);
                }
            }
        );
        Exception? failure =
            failures.FirstOrDefault(SigningWorkflowEnqueueFailure.IsPermanent) ?? failures.FirstOrDefault();
        return failure is not null
            ? SigningWorkflowEnqueueFailure.From(failure)
            : ProcessEngineCommandResult.Completed();
    }

    internal static string CreateIdempotencyKey(Guid stepId, Guid signeeId) => $"{stepId}:notify:{signeeId}";
}
