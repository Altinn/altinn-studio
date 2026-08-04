using System.Diagnostics;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// Request payload for ExecuteServiceTask command. Contains the service task type identifier and —
/// for a step of an <see cref="IStagedServiceTask"/> pipeline — the name of the step this engine
/// step executes. <see cref="StepName"/> is null exactly when the task is a plain
/// <see cref="IServiceTask"/>.
/// </summary>
internal sealed record ExecuteServiceTaskPayload(string ServiceTaskType, string? StepName = null)
    : CommandRequestPayload;

internal sealed class ExecuteServiceTask(AppImplementationFactory appImplementationFactory, Telemetry? telemetry = null)
    : WorkflowEngineCommandBase<ExecuteServiceTaskPayload>
{
    public static string Key => "ExecuteServiceTask";

    /// <summary>
    /// The default execution timeout for service tasks. Service tasks routinely call slow external
    /// systems (eFormidling, payment providers, other government APIs), so they get a far more generous
    /// budget than the engine's global default. An individual service task that needs even
    /// longer can override this via <see cref="IProcessStepConfigurable.StepOptions"/> (per task) or
    /// <see cref="IServiceTaskStepBase.StepOptions"/> (per pipeline step).
    /// </summary>
    internal static readonly TimeSpan DefaultServiceTaskTimeout = TimeSpan.FromMinutes(10);

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
            IServiceTaskBase serviceTask =
                appImplementationFactory.FindServiceTask(serviceTaskType)
                ?? throw new ProcessException($"No service task found for type {serviceTaskType}");

            ServiceTaskContext serviceTaskContext = new()
            {
                InstanceDataMutator = instanceDataMutator,
                CancellationToken = context.CancellationToken,
                WorkflowId = context.Payload.WorkflowId,
                StepId = context.Payload.StepId,
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
            };

            // Dispatch on the task's kind, cross-checked against the payload's shape. The mismatch
            // arms guard deployment version skew: a workflow enqueued against one shape of the task
            // calling back into an app deployed with another must fail permanently (and legibly)
            // rather than execute the wrong thing.
            return (serviceTask, payload.StepName) switch
            {
                (IServiceTask simple, null) => MapServiceTaskResult(await simple.Execute(serviceTaskContext), simple),
                (IStagedServiceTask staged, { } stepName) => await ExecuteStagedStep(
                    staged,
                    stepName,
                    serviceTaskContext
                ),
                (IStagedServiceTask, null) => FailedProcessEngineCommandResult.Permanent(
                    $"Service task '{serviceTask.Type}' is a staged (multi-step) task, but this workflow step carries "
                        + "no step name. The workflow was likely enqueued by an app version where the task was not "
                        + "staged; it cannot continue against this version.",
                    "ServiceTaskKindMismatch"
                ),
                _ => FailedProcessEngineCommandResult.Permanent(
                    $"Service task '{serviceTask.Type}' is not a staged (multi-step) task, but this workflow step "
                        + $"carries the step name '{payload.StepName}'. The workflow was likely enqueued by an app "
                        + "version where the task was staged; it cannot continue against this version.",
                    "ServiceTaskKindMismatch"
                ),
            };
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }

    private static async Task<ProcessEngineCommandResult> ExecuteStagedStep(
        IStagedServiceTask serviceTask,
        string stepName,
        ServiceTaskContext serviceTaskContext
    )
    {
        IServiceTaskStepBase? step = serviceTask.FindPipelineStep(stepName);
        return step switch
        {
            null => FailedProcessEngineCommandResult.Permanent(
                $"Service task '{serviceTask.Type}' has no step named '{stepName}'. Step names are a compatibility "
                    + "surface for in-flight workflows: if the step's class was renamed since this workflow was "
                    + $"enqueued, redeploy with the original name pinned via {nameof(IServiceTaskStepBase)}.{nameof(IServiceTaskStepBase.Name)} "
                    + "and resume the workflow.",
                "ServiceTaskStepNotFound"
            ),
            // Final first: startup validation forbids a class implementing both step kinds, but if
            // one slips through, concluding semantics must win over silently swallowing them.
            IFinalServiceTaskStep finalStep => MapServiceTaskResult(
                await finalStep.Execute(serviceTaskContext),
                serviceTask
            ),
            IServiceTaskStep workStep => MapStepResult(await workStep.Execute(serviceTaskContext), serviceTask),
            _ => throw new UnreachableException($"Unknown pipeline step kind: {step.GetType().Name}"),
        };
    }

    private static ProcessEngineCommandResult MapStepResult(ServiceTaskStepResult result, IServiceTaskBase task) =>
        result switch
        {
            // A completed work step never advances the process — the pipeline just moves on to the
            // next engine step.
            NextServiceTaskStepResult => new SuccessfulProcessEngineCommandResult(),
            DeferredServiceTaskStepResult deferred => new DeferredProcessEngineCommandResult
            {
                Delay = deferred.Delay,
                Reason = deferred.Reason,
            },
            FailedServiceTaskStepResult failed => MapFailure(
                task,
                failed.ErrorMessage,
                failed.Kind == FailureKind.Permanent
            ),
            _ => throw new UnreachableException($"Unknown step result type: {result.GetType().Name}"),
        };

    private static ProcessEngineCommandResult MapServiceTaskResult(ServiceTaskResult result, IServiceTaskBase task) =>
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
        IServiceTaskBase task,
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
