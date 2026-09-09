using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Features.Signing;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.ProcessTasks.Signing;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>The planner freezes the transition tail and execution options before the first enqueue.</summary>
internal sealed record ScheduleSigneeInitializationPayload(
    string TaskId,
    WorkflowEnqueueRequest? Continuation = null,
    StepRequest? DelegationStep = null,
    StepRequest? NotificationStep = null,
    StepRequest? NotificationSchedulerStep = null
) : CommandRequestPayload
{
    internal override string? Validate() =>
        string.IsNullOrWhiteSpace(TaskId)
        || Continuation?.Workflows.Count != 1
        || Continuation
            .Workflows[0]
            .Steps.Count(step => SigningWorkflowSteps.GetKey(step) == SaveProcessStateToStorage.Key) != 1
        || DelegationStep is null
        || NotificationStep is null
        || NotificationSchedulerStep is null
            ? "The signing task and its pre-assembled continuation are required."
            : null;
}

/// <summary>
/// Expands the persisted recipient plan into ordinary sequential grant steps followed by the original
/// transition tail. The dependent workflow cannot run until this scheduling callback has completed.
/// </summary>
internal sealed class ScheduleSigneeInitialization(
    IServiceProvider services,
    IProcessReader processReader,
    IWorkflowEngineClient workflowEngineClient
) : WorkflowEngineCommandBase<ScheduleSigneeInitializationPayload>
{
    internal static string Key => "ScheduleSigneeInitialization";

    public override string GetKey() => Key;

    public override async Task<ProcessEngineCommandResult> Execute(
        ProcessEngineCommandContext context,
        ScheduleSigneeInitializationPayload payload
    )
    {
        if (
            payload
                is not {
                    Continuation: { } continuation,
                    DelegationStep: { } delegationStep,
                    NotificationStep: { } notificationStep,
                    NotificationSchedulerStep: { } notificationSchedulerStep,
                }
            || payload.Validate() is not null
        )
        {
            return ProcessEngineCommandResult.FailedPermanent(
                "The signing task and its pre-assembled continuation are required.",
                "InvalidPayloadException"
            );
        }

        try
        {
            var configuration = SigningTaskConfiguration.Get(processReader, payload.TaskId);
            if (!SigningTaskConfiguration.IsRuntimeDelegated(configuration))
            {
                return ProcessEngineCommandResult.FailedPermanent(
                    "The task no longer has runtime-delegated signing configuration.",
                    "SigningConfigurationInvalid"
                );
            }
            var initialization = services.GetRequiredService<ISigneeInitializationService>();
            SigneeInitializationPlan plan = await initialization.GetResolvedSignees(
                context.InstanceDataMutator,
                configuration,
                payload.TaskId,
                context.CancellationToken
            );
            WorkflowRequest template = continuation.Workflows[0];
            var steps = plan
                .SigneeIds.Select(signeeId =>
                    SigningWorkflowSteps.WithPayload(
                        delegationStep,
                        new SigneeCommandPayload(payload.TaskId, plan.SigneeStateElementId, signeeId)
                    ) with
                    {
                        Labels = new Dictionary<string, string>
                        {
                            [SigningWorkflowLabels.SigningInitializationLabel] = plan.SigneeStateElementId.ToString(
                                "D"
                            ),
                            [SigningWorkflowLabels.SigningSigneeLabel] = signeeId.ToString("D"),
                            [SigningWorkflowLabels.SigningTaskLabel] = payload.TaskId,
                        },
                    }
                )
                .ToList();

            var notificationRequest = continuation with
            {
                Workflows =
                [
                    new WorkflowRequest
                    {
                        OperationId = "Signing notification",
                        Steps = [notificationStep],
                        IsHead = false,
                        DependsOnHeads = false,
                    },
                ],
            };
            var notificationPayload = new ScheduleSigneeNotificationsPayload(
                payload.TaskId,
                plan.SigneeStateElementId,
                plan.SigneeIds,
                notificationRequest
            );
            foreach (StepRequest step in template.Steps)
            {
                steps.Add(step);
                if (SigningWorkflowSteps.GetKey(step) == SaveProcessStateToStorage.Key)
                {
                    steps.Add(SigningWorkflowSteps.WithPayload(notificationSchedulerStep, notificationPayload));
                }
            }

            await workflowEngineClient.EnqueueWorkflows(
                ns: $"{context.AppId.Org}/{context.AppId.App}",
                idempotencyKey: CreateIdempotencyKey(context.StepId),
                collectionKey: ProcessNextRequestFactory.CreateCollectionKey(context.InstanceId),
                request: continuation with
                {
                    Workflows =
                    [
                        template with
                        {
                            Steps = steps,
                            State = context.Payload.State,
                            DependsOn = [WorkflowRef.FromDatabaseId(context.WorkflowId)],
                            DependsOnHeads = false,
                            IsHead = true,
                        },
                    ],
                },
                ct: context.CancellationToken
            );
            return ProcessEngineCommandResult.Completed();
        }
        catch (OperationCanceledException) when (context.CancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (ApplicationConfigException exception)
        {
            return ProcessEngineCommandResult.FailedPermanent(exception.Message, "SigningConfigurationInvalid");
        }
        catch (SigneeInitializationPermanentException exception)
        {
            return ProcessEngineCommandResult.FailedPermanent(exception.Message, exception.ErrorCode);
        }
        catch (Exception exception)
        {
            return SigningWorkflowEnqueueFailure.From(exception);
        }
    }

    internal static string CreateIdempotencyKey(Guid stepId) => $"{stepId}:signee-initialization";
}
