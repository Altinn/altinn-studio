using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskAbandon;

internal sealed class OnTaskAbandonHook : IWorkflowEngineCommand
{
    public static string Key => "OnTaskAbandonHook";

    public string GetKey() => Key;

    private readonly AppImplementationFactory _appImplementationFactory;

    public OnTaskAbandonHook(IServiceProvider serviceProvider)
    {
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
    }

    public async Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext parameters)
    {
        IInstanceDataMutator dataMutator = parameters.InstanceDataMutator;
        string taskId = dataMutator.Instance.Process?.CurrentTask?.ElementId ?? string.Empty;

        IEnumerable<IOnTaskAbandoningHandler> hooks = _appImplementationFactory.GetAll<IOnTaskAbandoningHandler>();
        List<IOnTaskAbandoningHandler> applicableHooks = hooks.Where(h => h.ShouldRunForTask(taskId)).ToList();

        if (applicableHooks.Count > 1)
        {
            return FailedProcessEngineCommandResult.Permanent(
                $"Multiple {nameof(IOnTaskAbandoningHandler)} hooks are registered for task '{taskId}'. Only one hook per task is allowed.",
                nameof(InvalidOperationException)
            );
        }

        IOnTaskAbandoningHandler? hook = applicableHooks.FirstOrDefault();
        // The planner plans this step only when a handler runs for the task. A step an earlier version planned
        // regardless, or whose handler a redeploy removed, finds none and has nothing to run.
        if (hook == null)
        {
            return new SuccessfulProcessEngineCommandResult();
        }

        var hookParameters = new OnTaskAbandoningContext
        {
            TaskId = taskId,
            InstanceDataMutator = dataMutator,
            CancellationToken = parameters.CancellationToken,
        };

        try
        {
            HandlerResult result = await hook.Execute(hookParameters);

            return result switch
            {
                SuccessfulHandlerResult => new SuccessfulProcessEngineCommandResult(),
                FailedHandlerResult failed => failed.Kind == FailureKind.Permanent
                    ? FailedProcessEngineCommandResult.Permanent(failed.ErrorMessage)
                    : FailedProcessEngineCommandResult.Retryable(failed.ErrorMessage),
                _ => throw new InvalidOperationException(
                    $"Unexpected {nameof(HandlerResult)} type: {result.GetType().Name}"
                ),
            };
        }
        catch (Exception ex)
        {
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }
}
