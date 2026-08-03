using System.Diagnostics;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Process;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// Request payload for ExecuteServiceTask command.
/// Contains the service task type identifier.
/// </summary>
internal sealed record ExecuteServiceTaskPayload(string ServiceTaskType) : CommandRequestPayload;

internal sealed class ExecuteServiceTask(AppImplementationFactory appImplementationFactory, Telemetry? telemetry = null)
    : WorkflowEngineCommandBase<ExecuteServiceTaskPayload>
{
    public static string Key => "ExecuteServiceTask";

    /// <summary>
    /// The default execution timeout for service tasks. Service tasks routinely call slow external
    /// systems (eFormidling, payment providers, other government APIs), so they get a far more generous
    /// budget than the engine's global default. An individual <see cref="IServiceTask"/> that needs even
    /// longer can override this via <see cref="IProcessStepConfigurable.StepOptions"/>.
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
        ProcessState? processState = instance.Process;
        if (processState is null)
        {
            return FailedProcessEngineCommandResult.Permanent(
                "Executing a service task requires an active process state.",
                nameof(InvalidOperationException)
            );
        }
        string serviceTaskType = payload.ServiceTaskType;

        using Activity? activity = telemetry?.StartProcessExecuteServiceTaskActivity(instance, serviceTaskType);

        try
        {
            ServiceTaskContext serviceTaskContext = new()
            {
                InstanceDataMutator = instanceDataMutator,
                CancellationToken = context.CancellationToken,
                WorkflowId = context.Payload.WorkflowId,
                IdempotencyKey = context.IdempotencyKey,
                ExecutionReferenceTime = context.ExecutionReferenceTime,
            };

            IServiceTask serviceTask = GetServiceTask(serviceTaskType);
            ServiceTaskResult? result = await serviceTask.Execute(serviceTaskContext);

            if (result is ServiceTaskFailedResult failedResult)
            {
                string errorMessage = $"Service task '{serviceTask.Type}' failed: {failedResult.ErrorMessage}";

                return failedResult.Kind == FailureKind.Permanent
                    ? FailedProcessEngineCommandResult.Permanent(errorMessage, "ServiceTaskFailedException")
                    : FailedProcessEngineCommandResult.Retryable(errorMessage, "ServiceTaskFailedException");
            }

            if (result is ServiceTaskSuccessResult { AutoAdvanceProcess: true } successResult)
            {
                return new SuccessfulProcessEngineCommandResult
                {
                    AutoAdvanceProcess = true,
                    AutoAdvanceAction = successResult.Action,
                };
            }

            if (context.InstanceDataMutator is not InstanceDataUnitOfWork unitOfWork)
            {
                return FailedProcessEngineCommandResult.Permanent(
                    "Pausing a service task requires callback state restored into an InstanceDataUnitOfWork.",
                    nameof(InvalidOperationException)
                );
            }

            // ServiceTaskResult is app-extensible and legacy implementations can also return null.
            // Every non-failure result other than the explicit auto-advance branch pauses at the
            // durable service task and therefore releases processing ownership.
            unitOfWork.TransitionProcessStatus(ProcessStatus.Processing, ProcessStatus.Idle);
            processState.Status = ProcessStatus.Idle;

            return new SuccessfulProcessEngineCommandResult();
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }

    private IServiceTask GetServiceTask(string type)
    {
        IEnumerable<IServiceTask> serviceTasks = appImplementationFactory.GetAll<IServiceTask>();
        IServiceTask? serviceTask = serviceTasks.FirstOrDefault(x =>
            x.Type.Equals(type, StringComparison.OrdinalIgnoreCase)
        );

        return serviceTask ?? throw new ProcessException($"No service task found for type {type}");
    }
}
