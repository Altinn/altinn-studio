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

    public async Task<WorkflowEngineCommandResult> Execute(WorkflowEngineCommandContext parameters)
    {
        IInstanceDataMutator dataMutator = parameters.InstanceDataMutator;
        string taskId = dataMutator.Instance.Process?.CurrentTask?.ElementId ?? string.Empty;

        IEnumerable<IOnTaskStartingHandler> hooks = _appImplementationFactory.GetAll<IOnTaskStartingHandler>();
        List<IOnTaskStartingHandler> applicableHooks = hooks.Where(h => h.ShouldRunForTask(taskId)).ToList();

        if (applicableHooks.Count > 1)
        {
            return FailedWorkflowEngineCommandResult.Permanent(
                $"Multiple {nameof(IOnTaskStartingHandler)} hooks are registered for task '{taskId}'. Only one hook per task is allowed.",
                nameof(InvalidOperationException)
            );
        }

        IOnTaskStartingHandler? hook = applicableHooks.FirstOrDefault();
        if (hook == null)
        {
            return new SuccessfulWorkflowEngineCommandResult();
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
                SuccessfulHandlerResult => new SuccessfulWorkflowEngineCommandResult(),
                FailedHandlerResult failed => failed.Kind == FailureKind.Permanent
                    ? FailedWorkflowEngineCommandResult.Permanent(failed.ErrorMessage)
                    : FailedWorkflowEngineCommandResult.Retryable(failed.ErrorMessage),
                _ => throw new InvalidOperationException(
                    $"Unexpected {nameof(HandlerResult)} type: {handlerResult.GetType().Name}"
                ),
            };
        }
        catch (Exception ex)
        {
            return FailedWorkflowEngineCommandResult.Retryable(ex);
        }
    }
}
