using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;

internal sealed class OnTaskStartingHook : IWorkflowEngineCommand
{
    public static string Key => "OnTaskStartingHook";

    public string GetKey() => Key;

    private readonly AppImplementationFactory _appImplementationFactory;

    public OnTaskStartingHook(IServiceProvider serviceProvider)
    {
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
    }

    public async Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext parameters)
    {
        IInstanceDataMutator dataMutator = parameters.InstanceDataMutator;
        string taskId = dataMutator.Instance.Process?.CurrentTask?.ElementId ?? string.Empty;

        IEnumerable<IOnTaskStartingHandler> hooks = _appImplementationFactory.GetAll<IOnTaskStartingHandler>();
        List<IOnTaskStartingHandler> applicableHooks = hooks.Where(h => h.ShouldRunForTask(taskId)).ToList();

        if (applicableHooks.Count > 1)
        {
            return FailedProcessEngineCommandResult.Permanent(
                $"Multiple {nameof(IOnTaskStartingHandler)} hooks are registered for task '{taskId}'. Only one hook per task is allowed.",
                nameof(InvalidOperationException)
            );
        }

        IOnTaskStartingHandler? hook = applicableHooks.FirstOrDefault();
        // The planner plans this step only when a handler runs for the task. A step an earlier version planned
        // regardless, or whose handler a redeploy removed, finds none and has nothing to run.
        if (hook == null)
        {
            return new SuccessfulProcessEngineCommandResult();
        }

        var hookParameters = new OnTaskStartingContext
        {
            TaskId = taskId,
            InstanceDataMutator = dataMutator,
            CancellationToken = parameters.CancellationToken,
        };

        try
        {
            HandlerResult handlerResult = await hook.Execute(hookParameters);

            return handlerResult switch
            {
                SuccessfulHandlerResult => new SuccessfulProcessEngineCommandResult(),
                FailedHandlerResult failed => failed.Kind == FailureKind.Permanent
                    ? FailedProcessEngineCommandResult.Permanent(failed.ErrorMessage)
                    : FailedProcessEngineCommandResult.Retryable(failed.ErrorMessage),
                _ => throw new InvalidOperationException(
                    $"Unexpected {nameof(HandlerResult)} type: {handlerResult.GetType().Name}"
                ),
            };
        }
        catch (Exception ex)
        {
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }
}
