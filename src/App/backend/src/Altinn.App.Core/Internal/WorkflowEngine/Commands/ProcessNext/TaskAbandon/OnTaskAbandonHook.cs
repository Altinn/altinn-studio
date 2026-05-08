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

        IEnumerable<IOnTaskAbandonHandler> hooks = _appImplementationFactory.GetAll<IOnTaskAbandonHandler>();
        IEnumerable<IOnTaskAbandonHandler> applicableHooks = hooks.Where(h => h.ShouldRunForTask(taskId)).ToList();

        if (applicableHooks.Count() > 1)
        {
            throw new InvalidOperationException(
                $"Multiple {nameof(IOnTaskAbandonHandler)} hooks are registered for task '{taskId}'. Only one hook per task is allowed."
            );
        }

        IOnTaskAbandonHandler? hook = applicableHooks.FirstOrDefault();
        if (hook == null)
        {
            return new SuccessfulProcessEngineCommandResult();
        }

        var hookParameters = new OnTaskAbandonHandlerContext { InstanceDataMutator = dataMutator };

        try
        {
            OnAbandonHandlerResult result = await hook.ExecuteAsync(hookParameters);

            return result switch
            {
                SuccessfulOnAbandonHandlerResult => new SuccessfulProcessEngineCommandResult(),
                FailedOnTaskAbandonHandlerResult failed => failed.NonRetryable
                    ? FailedProcessEngineCommandResult.Permanent(failed.ErrorMessage)
                    : FailedProcessEngineCommandResult.Retryable(failed.ErrorMessage),
                _ => throw new InvalidOperationException(
                    $"Unexpected {nameof(OnAbandonHandlerResult)} type: {result.GetType().Name}"
                ),
            };
        }
        catch (Exception ex)
        {
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }
}
