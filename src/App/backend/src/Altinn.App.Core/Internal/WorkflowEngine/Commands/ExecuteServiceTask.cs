using System.Diagnostics;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// Request payload for ExecuteServiceTask command. Contains the service task type identifier and,
/// optionally, the name of the task step this engine step executes. <see cref="StepName"/> is null
/// exactly when this engine step runs the task's own <see cref="IServiceTask.Execute"/> — the
/// concluding step every service task has (for most tasks, the only one); a name identifies one of
/// the task's declared <see cref="IServiceTask.Steps"/>.
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
    /// <see cref="IServiceTaskStep.StepOptions"/> (per step).
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
            IServiceTask serviceTask =
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

            // The step name routes within the task: null is the task's own Execute (the concluding
            // engine step, which every service task has), a name is one of the task's declared Steps.
            return payload.StepName is { } stepName
                ? await ExecuteStep(serviceTask, stepName, serviceTaskContext)
                : MapServiceTaskResult(await serviceTask.Execute(serviceTaskContext), serviceTask);
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }

    private static async Task<ProcessEngineCommandResult> ExecuteStep(
        IServiceTask serviceTask,
        string stepName,
        ServiceTaskContext serviceTaskContext
    )
    {
        IServiceTaskStep? step = serviceTask.FindStep(stepName);
        if (step is null)
        {
            return FailedProcessEngineCommandResult.Permanent(
                $"Service task '{serviceTask.Type}' has no step named '{stepName}'. Step names are a compatibility "
                    + "surface for in-flight workflows: if the step's class was renamed since this workflow was "
                    + $"enqueued, redeploy with the original name pinned via {nameof(IServiceTaskStep)}.{nameof(IServiceTaskStep.Name)} "
                    + "and resume the workflow.",
                "ServiceTaskStepNotFound"
            );
        }

        return MapStepResult(await step.Execute(serviceTaskContext), serviceTask);
    }

    private static ProcessEngineCommandResult MapStepResult(ServiceTaskStepResult result, IServiceTask task) =>
        result switch
        {
            // A completed step never advances the process — the task just moves on to its next
            // engine step.
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

    private static ProcessEngineCommandResult MapServiceTaskResult(ServiceTaskResult result, IServiceTask task) =>
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

    private static FailedProcessEngineCommandResult MapFailure(IServiceTask task, string errorMessage, bool permanent)
    {
        string message = $"Service task '{task.Type}' failed: {errorMessage}";
        return permanent
            ? FailedProcessEngineCommandResult.Permanent(message, "ServiceTaskFailedException")
            : FailedProcessEngineCommandResult.Retryable(message, "ServiceTaskFailedException");
    }
}
