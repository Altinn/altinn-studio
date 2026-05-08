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
        IEnumerable<IOnTaskStartingHandler> applicableHooks = hooks.Where(h => h.ShouldRunForTask(taskId)).ToList();

        if (applicableHooks.Count() > 1)
        {
            throw new InvalidOperationException(
                $"Multiple {nameof(IOnTaskStartingHandler)} hooks are registered for task '{taskId}'. Only one hook per task is allowed."
            );
        }

        IOnTaskStartingHandler? hook = applicableHooks.FirstOrDefault();
        if (hook == null)
        {
            return new SuccessfulProcessEngineCommandResult();
        }

        var hookParameters = new OnTaskStartingContext { InstanceDataMutator = dataMutator };

        try
        {
            OnTaskStartingHandlerResult handlerResult = await hook.ExecuteAsync(hookParameters);

            return handlerResult switch
            {
                SuccessfulOnTaskStartingHandlerResult => new SuccessfulProcessEngineCommandResult(),
                FailedOnTaskStartingHandlerResult failed => failed.NonRetryable
                    ? FailedProcessEngineCommandResult.Permanent(failed.ErrorMessage)
                    : FailedProcessEngineCommandResult.Retryable(failed.ErrorMessage),
                _ => throw new InvalidOperationException(
                    $"Unexpected {nameof(OnTaskStartingHandlerResult)} type: {handlerResult.GetType().Name}"
                ),
            };
        }
        catch (Exception ex)
        {
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }
}
