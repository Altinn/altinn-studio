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

    public async Task<WorkflowEngineCommandResult> Execute(WorkflowEngineCommandContext parameters)
    {
        IInstanceDataMutator dataMutator = parameters.InstanceDataMutator;
        string taskId = dataMutator.Instance.Process?.CurrentTask?.ElementId ?? string.Empty;

        IEnumerable<IOnTaskAbandoningHandler> hooks = _appImplementationFactory.GetAll<IOnTaskAbandoningHandler>();
        List<IOnTaskAbandoningHandler> applicableHooks = hooks.Where(h => h.ShouldRunForTask(taskId)).ToList();

        if (applicableHooks.Count > 1)
        {
            return FailedWorkflowEngineCommandResult.Permanent(
                $"Multiple {nameof(IOnTaskAbandoningHandler)} hooks are registered for task '{taskId}'. Only one hook per task is allowed.",
                nameof(InvalidOperationException)
            );
        }

        IOnTaskAbandoningHandler? hook = applicableHooks.FirstOrDefault();
        if (hook == null)
        {
            return new SuccessfulWorkflowEngineCommandResult();
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
                SuccessfulHandlerResult => new SuccessfulWorkflowEngineCommandResult(),
                FailedHandlerResult failed => failed.Kind == FailureKind.Permanent
                    ? FailedWorkflowEngineCommandResult.Permanent(failed.ErrorMessage)
                    : FailedWorkflowEngineCommandResult.Retryable(failed.ErrorMessage),
                _ => throw new InvalidOperationException(
                    $"Unexpected {nameof(HandlerResult)} type: {result.GetType().Name}"
                ),
            };
        }
        catch (Exception ex)
        {
            return FailedWorkflowEngineCommandResult.Retryable(ex);
        }
    }
}
